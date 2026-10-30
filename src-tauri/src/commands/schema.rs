use crate::db::pool;
use serde::{Deserialize, Serialize};
use sqlx::Row;

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub key: String,
    pub default_value: Option<String>,
    pub extra: String,
}

#[tauri::command]
pub async fn list_tables() -> Result<Vec<String>, String> {
    let pool = pool::get_pool().await?;
    let rows = sqlx::query_scalar::<_, String>("SHOW TABLES")
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub async fn get_table_columns(table_name: String) -> Result<Vec<ColumnInfo>, String> {
    let pool = pool::get_pool().await?;
    crate::db::validator::validate_table(&pool, &table_name).await?;

    let db = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let rows = sqlx::query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
         FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ?
         ORDER BY ORDINAL_POSITION",
    )
    .bind(&db)
    .bind(&table_name)
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(rows
        .into_iter()
        .map(|r| ColumnInfo {
            name: r.try_get("COLUMN_NAME").unwrap_or_default(),
            data_type: r.try_get("DATA_TYPE").unwrap_or_default(),
            is_nullable: r.try_get::<String, _>("IS_NULLABLE").ok().as_deref() == Some("YES"),
            key: r.try_get("COLUMN_KEY").unwrap_or_default(),
            default_value: r.try_get("COLUMN_DEFAULT").ok(),
            extra: r.try_get("EXTRA").unwrap_or_default(),
        })
        .collect())
}

/// ตารางและคอลัมน์ทั้งหมดของฐานข้อมูลปัจจุบัน (ใช้เติมคำอัตโนมัติใน SQL Editor)
#[tauri::command]
pub async fn get_schema() -> Result<std::collections::BTreeMap<String, Vec<String>>, String> {
    let pool = pool::get_pool().await?;
    let rows = sqlx::query(
        "SELECT TABLE_NAME, COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = DATABASE()
         ORDER BY TABLE_NAME, ORDINAL_POSITION",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut schema: std::collections::BTreeMap<String, Vec<String>> = Default::default();
    for r in rows {
        let table: String = r.try_get("TABLE_NAME").unwrap_or_default();
        let column: String = r.try_get("COLUMN_NAME").unwrap_or_default();
        schema.entry(table).or_default().push(column);
    }
    Ok(schema)
}
