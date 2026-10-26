use crate::db::{pool, types, validator};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct FetchParams {
    pub table_name: String,
    pub page: u64,
    pub page_size: u64,
    pub sort_column: Option<String>,
    pub sort_dir: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TableData {
    pub rows: Vec<Value>,
    pub total: u64,
    pub columns: Vec<String>,
}

async fn get_text_columns(
    pool: &sqlx::mysql::MySqlPool,
    table_name: &str,
) -> Result<Vec<String>, String> {
    let db = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query_scalar(
        "SELECT COLUMN_NAME FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         AND DATA_TYPE IN ('char','varchar','text','mediumtext','longtext','tinytext')
         ORDER BY ORDINAL_POSITION",
    )
    .bind(&db)
    .bind(table_name)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_rows(params: FetchParams) -> Result<TableData, String> {
    let pool = pool::get_pool().await?;
    validator::validate_table(&pool, &params.table_name).await?;

    let page_size = params.page_size.min(200);
    let offset = params.page.saturating_sub(1) * page_size;

    // Validate sort column
    if let Some(ref col) = params.sort_column {
        validator::validate_column(&pool, &params.table_name, col).await?;
    }
    let sort_dir = match params.sort_dir.as_deref() {
        Some("DESC") => "DESC",
        _ => "ASC",
    };

    let search_val = params
        .search
        .as_deref()
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{}%", s));

    let text_cols = if search_val.is_some() {
        get_text_columns(&pool, &params.table_name).await?
    } else {
        vec![]
    };

    let where_clause = if !text_cols.is_empty() {
        let clauses: Vec<String> = text_cols
            .iter()
            .map(|c| format!("`{}` LIKE ?", c))
            .collect();
        format!("WHERE ({})", clauses.join(" OR "))
    } else {
        String::new()
    };

    let sort_clause = if let Some(ref col) = params.sort_column {
        format!("ORDER BY `{}` {}", col, sort_dir)
    } else {
        String::new()
    };

    let count_sql = format!(
        "SELECT COUNT(*) FROM `{}` {}",
        params.table_name, where_clause
    );
    let data_sql = format!(
        "SELECT * FROM `{}` {} {} LIMIT ? OFFSET ?",
        params.table_name, where_clause, sort_clause
    );

    // Count
    let total: u64 = {
        let mut q = sqlx::query_scalar::<_, i64>(&count_sql);
        if let Some(ref sv) = search_val {
            for _ in &text_cols {
                q = q.bind(sv.clone());
            }
        }
        q.fetch_one(&pool).await.map_err(|e| e.to_string())? as u64
    };

    // Rows
    let rows = {
        let mut q = sqlx::query(&data_sql);
        if let Some(ref sv) = search_val {
            for _ in &text_cols {
                q = q.bind(sv.clone());
            }
        }
        q = q.bind(page_size as i64).bind(offset as i64);
        q.fetch_all(&pool).await.map_err(|e| e.to_string())?
    };

    let columns: Vec<String> = if let Some(first) = rows.first() {
        use sqlx::{Column, Row};
        first.columns().iter().map(|c| c.name().to_string()).collect()
    } else {
        let db = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query_scalar(
            "SELECT COLUMN_NAME FROM information_schema.columns
             WHERE table_schema = ? AND table_name = ?
             ORDER BY ORDINAL_POSITION",
        )
        .bind(&db)
        .bind(&params.table_name)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?
    };

    let json_rows: Vec<Value> = rows.iter().map(types::row_to_json).collect();

    Ok(TableData {
        rows: json_rows,
        total,
        columns,
    })
}
