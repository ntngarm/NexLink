use crate::db::pool;
use keyring::Entry;
use serde::{Deserialize, Serialize};
use sqlx::mysql::MySqlPoolOptions;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub database: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConnectionProfile {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub database: String,
}

fn app_data(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn profiles_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data(app)?.join("profiles.json"))
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data(app)?.join("settings.json"))
}

#[derive(Serialize, Deserialize, Default)]
struct Settings {
    last_profile: Option<String>,
}

fn read_settings(app: &tauri::AppHandle) -> Settings {
    let Ok(path) = settings_path(app) else { return Settings::default() };
    let Ok(raw) = fs::read_to_string(&path) else { return Settings::default() };
    serde_json::from_str(&raw).unwrap_or_default()
}

fn write_settings(app: &tauri::AppHandle, s: &Settings) {
    if let Ok(path) = settings_path(app) {
        if let Ok(raw) = serde_json::to_string_pretty(s) {
            let _ = fs::write(path, raw);
        }
    }
}

fn read_profiles(app: &tauri::AppHandle) -> Result<Vec<ConnectionProfile>, String> {
    let path = profiles_path(app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_profiles(app: &tauri::AppHandle, profiles: &[ConnectionProfile]) -> Result<(), String> {
    let path = profiles_path(app)?;
    let content = serde_json::to_string_pretty(profiles).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_connection(config: ConnectionConfig) -> Result<String, String> {
    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        config.username, config.password, config.host, config.port, config.database
    );
    let conn_pool = MySqlPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| format!("เชื่อมต่อไม่สำเร็จ: {}", e))?;

    sqlx::query("SELECT 1")
        .execute(&conn_pool)
        .await
        .map_err(|e| format!("Query ล้มเหลว: {}", e))?;

    conn_pool.close().await;
    Ok("เชื่อมต่อสำเร็จ".to_string())
}

#[tauri::command]
pub async fn connect_to_db(config: ConnectionConfig) -> Result<String, String> {
    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        config.username, config.password, config.host, config.port, config.database
    );
    let new_pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await
        .map_err(|e| format!("เชื่อมต่อไม่สำเร็จ: {}", e))?;

    pool::set_pool(new_pool, config.database.clone()).await;
    Ok(format!("เชื่อมต่อกับ {} สำเร็จ", config.database))
}

#[tauri::command]
pub async fn disconnect(app: tauri::AppHandle) -> Result<(), String> {
    pool::clear_pool().await;
    write_settings(&app, &Settings { last_profile: None });
    Ok(())
}

#[tauri::command]
pub async fn save_profile(
    app: tauri::AppHandle,
    profile: ConnectionProfile,
    password: String,
) -> Result<(), String> {
    let entry = Entry::new("nexlink", &profile.name).map_err(|e| e.to_string())?;
    entry.set_password(&password).map_err(|e| e.to_string())?;

    let mut profiles = read_profiles(&app)?;
    profiles.retain(|p| p.name != profile.name);
    profiles.push(profile);
    write_profiles(&app, &profiles)
}

#[tauri::command]
pub async fn load_profiles(app: tauri::AppHandle) -> Result<Vec<ConnectionProfile>, String> {
    read_profiles(&app)
}

#[tauri::command]
pub async fn delete_profile(app: tauri::AppHandle, name: String) -> Result<(), String> {
    if let Ok(entry) = Entry::new("nexlink", &name) {
        let _ = entry.delete_credential();
    }
    let mut profiles = read_profiles(&app)?;
    profiles.retain(|p| p.name != name);
    write_profiles(&app, &profiles)
}

#[tauri::command]
pub async fn connect_from_profile(
    app: tauri::AppHandle,
    profile_name: String,
) -> Result<String, String> {
    let profiles = read_profiles(&app)?;
    let profile = profiles
        .iter()
        .find(|p| p.name == profile_name)
        .ok_or_else(|| format!("ไม่พบ profile '{}'", profile_name))?
        .clone();

    let entry = Entry::new("nexlink", &profile_name).map_err(|e| e.to_string())?;
    let password = entry
        .get_password()
        .map_err(|_| "ไม่พบรหัสผ่าน กรุณาเชื่อมต่อด้วยรหัสผ่านอีกครั้ง".to_string())?;

    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        profile.username, password, profile.host, profile.port, profile.database
    );
    let new_pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await
        .map_err(|e| format!("เชื่อมต่อไม่สำเร็จ: {}", e))?;

    pool::set_pool(new_pool, profile.database.clone()).await;
    write_settings(&app, &Settings { last_profile: Some(profile_name) });
    Ok(format!("เชื่อมต่อกับ {} สำเร็จ", profile.database))
}

#[tauri::command]
pub async fn auto_connect(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let settings = read_settings(&app);
    let Some(profile_name) = settings.last_profile else { return Ok(None) };

    let profiles = read_profiles(&app)?;
    let Some(profile) = profiles.iter().find(|p| p.name == profile_name).cloned() else {
        return Ok(None);
    };

    let entry = Entry::new("nexlink", &profile_name).map_err(|e| e.to_string())?;
    let Ok(password) = entry.get_password() else { return Ok(None) };

    let url = format!(
        "mysql://{}:{}@{}:{}/{}",
        profile.username, password, profile.host, profile.port, profile.database
    );
    match MySqlPoolOptions::new().max_connections(10).connect(&url).await {
        Ok(new_pool) => {
            pool::set_pool(new_pool, profile.database.clone()).await;
            Ok(Some(profile.database))
        }
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub async fn get_current_connection() -> Result<Option<String>, String> {
    Ok(pool::get_current_database().await)
}

/// ชื่อโปรไฟล์ที่เชื่อมต่ออยู่ (โปรไฟล์ล่าสุดที่บันทึกไว้)
#[tauri::command]
pub async fn get_current_profile(app: tauri::AppHandle) -> Result<Option<String>, String> {
    Ok(read_settings(&app).last_profile)
}
