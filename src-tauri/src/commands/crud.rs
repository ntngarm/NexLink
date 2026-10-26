use crate::db::{pool, validator};
use serde_json::Value;
use std::collections::HashMap;

fn bind_value<'q>(
    q: sqlx::query::Query<'q, sqlx::MySql, sqlx::mysql::MySqlArguments>,
    val: &'q Value,
) -> sqlx::query::Query<'q, sqlx::MySql, sqlx::mysql::MySqlArguments> {
    match val {
        Value::Null => q.bind(None::<String>),
        Value::Bool(b) => q.bind(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                q.bind(i)
            } else if let Some(f) = n.as_f64() {
                q.bind(f)
            } else {
                q.bind(n.to_string())
            }
        }
        Value::String(s) => q.bind(s.as_str()),
        other => q.bind(other.to_string()),
    }
}

#[tauri::command]
pub async fn insert_row(
    table_name: String,
    data: HashMap<String, Value>,
) -> Result<u64, String> {
    let pool = pool::get_pool().await?;
    validator::validate_table(&pool, &table_name).await?;

    if data.is_empty() {
        return Err("ข้อมูลว่างเปล่า".to_string());
    }

    for col in data.keys() {
        validator::validate_column(&pool, &table_name, col).await?;
    }

    let cols: Vec<&str> = data.keys().map(|s| s.as_str()).collect();
    let col_list = cols
        .iter()
        .map(|c| format!("`{}`", c))
        .collect::<Vec<_>>()
        .join(", ");
    let placeholders = vec!["?"; cols.len()].join(", ");
    let sql = format!(
        "INSERT INTO `{}` ({}) VALUES ({})",
        table_name, col_list, placeholders
    );

    let mut q = sqlx::query(&sql);
    for col in &cols {
        q = bind_value(q, &data[*col]);
    }

    let result = q.execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(result.last_insert_id())
}

#[tauri::command]
pub async fn update_row(
    table_name: String,
    pk_column: String,
    pk_value: Value,
    data: HashMap<String, Value>,
) -> Result<u64, String> {
    let pool = pool::get_pool().await?;
    validator::validate_table(&pool, &table_name).await?;
    validator::validate_column(&pool, &table_name, &pk_column).await?;

    let mut set_parts: Vec<String> = Vec::new();
    for col in data.keys() {
        validator::validate_column(&pool, &table_name, col).await?;
        set_parts.push(format!("`{}` = ?", col));
    }

    let sql = format!(
        "UPDATE `{}` SET {} WHERE `{}` = ?",
        table_name,
        set_parts.join(", "),
        pk_column
    );

    let mut q = sqlx::query(&sql);
    for val in data.values() {
        q = bind_value(q, val);
    }
    q = bind_value(q, &pk_value);

    let result = q.execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(result.rows_affected())
}

#[tauri::command]
pub async fn delete_row(
    table_name: String,
    pk_column: String,
    pk_value: Value,
) -> Result<u64, String> {
    let pool = pool::get_pool().await?;
    validator::validate_table(&pool, &table_name).await?;
    validator::validate_column(&pool, &table_name, &pk_column).await?;

    let sql = format!("DELETE FROM `{}` WHERE `{}` = ?", table_name, pk_column);
    let q = bind_value(sqlx::query(&sql), &pk_value);
    let result = q.execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(result.rows_affected())
}
