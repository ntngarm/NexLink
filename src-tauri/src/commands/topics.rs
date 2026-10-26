use crate::db::{pool, types};
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderPair {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub name: String,
    pub query: String,
    pub api_url: String,
    pub method: String,
    pub headers: Vec<HeaderPair>,
    #[serde(default)]
    pub body_template: String,
}

#[derive(Debug, Serialize)]
pub struct SendResult {
    pub status: u16,
    pub body: String,
    pub rows_sent: usize,
    pub execution_time_ms: u64,
}

fn topics_path(app: &AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().expect("no app data dir");
    fs::create_dir_all(&dir).ok();
    dir.join("topics.json")
}

fn read_all(app: &AppHandle) -> Vec<Topic> {
    let path = topics_path(app);
    if !path.exists() {
        return vec![];
    }
    let raw = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&raw).unwrap_or_default()
}

fn write_all(app: &AppHandle, topics: &[Topic]) -> Result<(), String> {
    let path = topics_path(app);
    let raw = serde_json::to_string_pretty(topics).map_err(|e| e.to_string())?;
    fs::write(&path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_topics(app: AppHandle) -> Result<Vec<Topic>, String> {
    Ok(read_all(&app))
}

#[tauri::command]
pub async fn save_topic(app: AppHandle, topic: Topic) -> Result<(), String> {
    let mut topics = read_all(&app);
    match topics.iter().position(|t| t.id == topic.id) {
        Some(i) => topics[i] = topic,
        None => topics.push(topic),
    }
    write_all(&app, &topics)
}

#[tauri::command]
pub async fn delete_topic(app: AppHandle, id: String) -> Result<(), String> {
    let mut topics = read_all(&app);
    topics.retain(|t| t.id != id);
    write_all(&app, &topics)
}

#[tauri::command]
pub async fn send_topic(app: AppHandle, id: String) -> Result<SendResult, String> {
    let topics = read_all(&app);
    let topic = topics
        .iter()
        .find(|t| t.id == id)
        .ok_or_else(|| "Topic not found".to_string())?
        .clone();

    let db_pool = pool::get_pool().await?;
    let start = std::time::Instant::now();

    let rows = sqlx::query(&topic.query)
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("Query error: {}", e))?;

    let json_rows: Vec<serde_json::Value> = rows.iter().map(types::row_to_json).collect();
    let rows_sent = json_rows.len();

    // สร้าง body: ถ้ามี template ให้แทนที่ ${result_sql} ด้วย JSON จริง
    let body_str = if topic.body_template.trim().is_empty() {
        serde_json::to_string(&json_rows).map_err(|e| e.to_string())?
    } else {
        let rows_json = serde_json::to_string(&json_rows).map_err(|e| e.to_string())?;
        topic.body_template.replace("${result_sql}", &rows_json)
    };

    let client = reqwest::Client::new();
    let mut req = match topic.method.to_uppercase().as_str() {
        "PUT" => client.put(&topic.api_url),
        _ => client.post(&topic.api_url),
    }
    .header("content-type", "application/json")
    .body(body_str);

    for h in &topic.headers {
        if !h.key.trim().is_empty() {
            req = req.header(h.key.trim(), h.value.trim());
        }
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let elapsed = start.elapsed().as_millis() as u64;
    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(SendResult {
        status,
        body,
        rows_sent,
        execution_time_ms: elapsed,
    })
}
