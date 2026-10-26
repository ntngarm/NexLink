use crate::db::{pool, types};
use serde::Serialize;
use serde_json::Value;
use std::time::Instant;

#[derive(Debug, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Value>,
    pub rows_affected: u64,
    pub execution_time_ms: u64,
    pub is_select: bool,
}

#[tauri::command]
pub async fn execute_query(sql: String) -> Result<QueryResult, String> {
    let pool = pool::get_pool().await?;
    let trimmed = sql.trim().to_uppercase();
    let is_select = trimmed.starts_with("SELECT")
        || trimmed.starts_with("SHOW")
        || trimmed.starts_with("DESCRIBE")
        || trimmed.starts_with("EXPLAIN");

    let start = Instant::now();

    if is_select {
        let rows = sqlx::query(&sql)
            .fetch_all(&pool)
            .await
            .map_err(|e| format!("SQL Error: {}", e))?;

        let elapsed = start.elapsed().as_millis() as u64;

        let columns: Vec<String> = if let Some(first) = rows.first() {
            use sqlx::{Column, Row};
            first.columns().iter().map(|c| c.name().to_string()).collect()
        } else {
            vec![]
        };

        let json_rows: Vec<Value> = rows.iter().map(types::row_to_json).collect();

        Ok(QueryResult {
            columns,
            rows: json_rows,
            rows_affected: 0,
            execution_time_ms: elapsed,
            is_select: true,
        })
    } else {
        let result = sqlx::query(&sql)
            .execute(&pool)
            .await
            .map_err(|e| format!("SQL Error: {}", e))?;

        let elapsed = start.elapsed().as_millis() as u64;

        Ok(QueryResult {
            columns: vec![],
            rows: vec![],
            rows_affected: result.rows_affected(),
            execution_time_ms: elapsed,
            is_select: false,
        })
    }
}
