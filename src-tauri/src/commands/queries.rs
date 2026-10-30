use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};

/// โฟลเดอร์หรือไฟล์ query (.sql) ที่บันทึกไว้ — path เป็น path ย่อยจากโฟลเดอร์ queries คั่นด้วย "/"
#[derive(Debug, Serialize)]
pub struct QueryNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Vec<QueryNode>,
}

fn queries_root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("queries");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// แปลง path ย่อยเป็น path จริง โดยไม่ยอมให้ออกนอกโฟลเดอร์ queries
fn resolve(app: &AppHandle, rel: &str) -> Result<PathBuf, String> {
    let rel = Path::new(rel.trim_matches(['/', '\\']));
    if rel.as_os_str().is_empty() || rel.components().any(|c| !matches!(c, Component::Normal(_))) {
        return Err("ชื่อไฟล์หรือโฟลเดอร์ไม่ถูกต้อง".into());
    }
    Ok(queries_root(app)?.join(rel))
}

fn with_sql_ext(path: PathBuf) -> PathBuf {
    let is_sql = path
        .extension()
        .is_some_and(|e| e.eq_ignore_ascii_case("sql"));
    if is_sql { path } else { path.with_extension("sql") }
}

fn read_tree(dir: &Path, prefix: &str) -> Vec<QueryNode> {
    let Ok(entries) = fs::read_dir(dir) else { return vec![] };
    let mut nodes: Vec<QueryNode> = entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let path = if prefix.is_empty() { name.clone() } else { format!("{prefix}/{name}") };
            let is_dir = entry.file_type().ok()?.is_dir();
            if is_dir {
                let children = read_tree(&entry.path(), &path);
                Some(QueryNode { name, path, is_dir, children })
            } else if name.to_lowercase().ends_with(".sql") {
                Some(QueryNode { name, path, is_dir, children: vec![] })
            } else {
                None
            }
        })
        .collect();
    // โฟลเดอร์ก่อน แล้วเรียงตามชื่อ
    nodes.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
    nodes
}

#[tauri::command]
pub async fn list_queries(app: AppHandle) -> Result<Vec<QueryNode>, String> {
    Ok(read_tree(&queries_root(&app)?, ""))
}

#[tauri::command]
pub async fn read_query(app: AppHandle, path: String) -> Result<String, String> {
    fs::read_to_string(resolve(&app, &path)?).map_err(|e| e.to_string())
}

/// บันทึก query (เติม .sql ให้ถ้าไม่มี) คืน path ย่อยที่บันทึกจริง
#[tauri::command]
pub async fn save_query(app: AppHandle, path: String, content: String) -> Result<String, String> {
    let full = with_sql_ext(resolve(&app, &path)?);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, content).map_err(|e| e.to_string())?;
    let root = queries_root(&app)?;
    let rel = full.strip_prefix(&root).map_err(|e| e.to_string())?;
    Ok(rel.to_string_lossy().replace('\\', "/"))
}

#[tauri::command]
pub async fn create_query_folder(app: AppHandle, path: String) -> Result<(), String> {
    fs::create_dir_all(resolve(&app, &path)?).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_query_item(app: AppHandle, path: String) -> Result<(), String> {
    let full = resolve(&app, &path)?;
    if full.is_dir() {
        fs::remove_dir_all(&full)
    } else {
        fs::remove_file(&full)
    }
    .map_err(|e| e.to_string())
}

/// เปิดโฟลเดอร์ queries ใน File Explorer
#[tauri::command]
pub async fn open_queries_folder(app: AppHandle) -> Result<(), String> {
    let root = queries_root(&app)?;
    std::process::Command::new("explorer")
        .arg(root)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}
