use sqlx::mysql::MySqlPool;

pub async fn validate_table(pool: &MySqlPool, table_name: &str) -> Result<(), String> {
    let db = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = ? AND table_name = ?",
    )
    .bind(&db)
    .bind(table_name)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if count == 0 {
        Err(format!("ตาราง '{}' ไม่มีในฐานข้อมูล", table_name))
    } else {
        Ok(())
    }
}

pub async fn validate_column(
    pool: &MySqlPool,
    table_name: &str,
    column_name: &str,
) -> Result<(), String> {
    let db = sqlx::query_scalar::<_, String>("SELECT DATABASE()")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? AND column_name = ?",
    )
    .bind(&db)
    .bind(table_name)
    .bind(column_name)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if count == 0 {
        Err(format!(
            "คอลัมน์ '{}' ไม่มีในตาราง '{}'",
            column_name, table_name
        ))
    } else {
        Ok(())
    }
}
