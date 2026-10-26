use base64::{engine::general_purpose, Engine as _};
use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use serde_json::{json, Value};
use sqlx::mysql::MySqlRow;
use sqlx::{Column, Row, TypeInfo};

pub fn row_to_json(row: &MySqlRow) -> Value {
    let mut map = serde_json::Map::new();
    for col in row.columns() {
        let name = col.name().to_string();
        let val = col_to_json(row, col.ordinal(), col.type_info().name());
        map.insert(name, val);
    }
    Value::Object(map)
}

fn col_to_json(row: &MySqlRow, idx: usize, type_name: &str) -> Value {
    let upper = type_name.to_uppercase();

    // Boolean
    if upper == "BOOLEAN" || upper == "TINYINT(1)" {
        if let Ok(v) = row.try_get::<Option<bool>, _>(idx) {
            return v.map(|b| json!(b)).unwrap_or(Value::Null);
        }
    }

    // Unsigned big integer
    if upper.contains("BIGINT") && upper.contains("UNSIGNED") {
        if let Ok(v) = row.try_get::<Option<u64>, _>(idx) {
            return v.map(|n| json!(n)).unwrap_or(Value::Null);
        }
    }

    // Signed integers
    if upper.contains("INT") {
        if let Ok(v) = row.try_get::<Option<i64>, _>(idx) {
            return v.map(|n| json!(n)).unwrap_or(Value::Null);
        }
    }

    // Floats
    if upper == "FLOAT" || upper.starts_with("DOUBLE") {
        if let Ok(v) = row.try_get::<Option<f64>, _>(idx) {
            return v
                .map(|f| {
                    serde_json::Number::from_f64(f)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
                })
                .unwrap_or(Value::Null);
        }
    }

    // DECIMAL — preserve as string
    if upper.starts_with("DECIMAL") || upper.starts_with("NUMERIC") {
        if let Ok(v) = row.try_get::<Option<String>, _>(idx) {
            return v.map(Value::String).unwrap_or(Value::Null);
        }
    }

    // Date
    if upper == "DATE" {
        if let Ok(v) = row.try_get::<Option<NaiveDate>, _>(idx) {
            return v
                .map(|d| Value::String(d.format("%Y-%m-%d").to_string()))
                .unwrap_or(Value::Null);
        }
    }

    // DateTime / Timestamp
    if upper == "DATETIME" || upper == "TIMESTAMP" {
        if let Ok(v) = row.try_get::<Option<NaiveDateTime>, _>(idx) {
            return v
                .map(|dt| Value::String(dt.format("%Y-%m-%d %H:%M:%S").to_string()))
                .unwrap_or(Value::Null);
        }
    }

    // Time
    if upper == "TIME" {
        if let Ok(v) = row.try_get::<Option<NaiveTime>, _>(idx) {
            return v
                .map(|t| Value::String(t.to_string()))
                .unwrap_or(Value::Null);
        }
    }

    // Binary / Blob — base64 encode
    if upper.contains("BLOB") || upper == "BINARY" || upper == "VARBINARY" {
        if let Ok(v) = row.try_get::<Option<Vec<u8>>, _>(idx) {
            return v
                .map(|b| Value::String(general_purpose::STANDARD.encode(&b)))
                .unwrap_or(Value::Null);
        }
    }

    // Default: String
    match row.try_get::<Option<String>, _>(idx) {
        Ok(Some(s)) => Value::String(s),
        _ => Value::Null,
    }
}
