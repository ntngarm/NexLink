use crate::commands::topics;
use serde::{Deserialize, Serialize};
use std::fs;
use std::time::Duration;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Schedule {
    #[serde(default)]
    pub enabled: bool,
    /// เวลาที่จะส่งทุกวัน รูปแบบ "HH:MM"
    #[serde(default)]
    pub times: Vec<String>,
    /// id ของแฟ้มที่จะส่ง
    #[serde(default)]
    pub topic_ids: Vec<String>,
    #[serde(default)]
    pub last_run: Option<ScheduleRun>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduleRun {
    pub at: String,
    pub ok: usize,
    pub failed: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

fn schedule_path(app: &AppHandle) -> std::path::PathBuf {
    let dir = app.path().app_data_dir().expect("no app data dir");
    fs::create_dir_all(&dir).ok();
    dir.join("schedule.json")
}

fn read_schedule(app: &AppHandle) -> Schedule {
    let raw = fs::read_to_string(schedule_path(app)).unwrap_or_default();
    serde_json::from_str(&raw).unwrap_or_default()
}

fn write_schedule(app: &AppHandle, schedule: &Schedule) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(schedule).map_err(|e| e.to_string())?;
    fs::write(schedule_path(app), raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_schedule(app: AppHandle) -> Result<Schedule, String> {
    Ok(read_schedule(&app))
}

#[tauri::command]
pub async fn save_schedule(app: AppHandle, schedule: Schedule) -> Result<(), String> {
    // เก็บผลการส่งรอบล่าสุดไว้ ไม่ให้หน้าเว็บเขียนทับ
    let last_run = read_schedule(&app).last_run;
    write_schedule(&app, &Schedule { last_run, ..schedule })
}

/// เริ่มตัวจับเวลา: เช็กทุก 20 วินาที ถ้าตรงกับเวลาที่ตั้งไว้ให้ส่งทุกแฟ้ม (ส่งครั้งเดียวต่อนาที)
pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut last_fired = String::new();
        loop {
            let now = chrono::Local::now();
            let minute_key = now.format("%Y-%m-%d %H:%M").to_string();
            let hm = now.format("%H:%M").to_string();
            let schedule = read_schedule(&app);
            if schedule.enabled && schedule.times.contains(&hm) && last_fired != minute_key {
                last_fired = minute_key;
                run(&app, &schedule).await;
            }
            tokio::time::sleep(Duration::from_secs(20)).await;
        }
    });
}

async fn run(app: &AppHandle, schedule: &Schedule) {
    let all = topics::read_all(app);
    let mut result = ScheduleRun {
        at: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
        ok: 0,
        failed: 0,
        skipped: 0,
        errors: vec![],
    };

    for id in &schedule.topic_ids {
        // เทียบแบบไม่สนตัวพิมพ์ เผื่อแฟ้มที่บันทึกไว้ด้วยชื่อตัวพิมพ์ใหญ่แบบเดิม
        let topic = all
            .iter()
            .find(|t| t.id.eq_ignore_ascii_case(id))
            .filter(|t| !t.api_url.trim().is_empty());
        let Some(topic) = topic else {
            result.skipped += 1;
            continue;
        };
        let topic = topics::Topic { id: id.clone(), ..topic.clone() };

        match topics::send(&topic).await {
            Ok(res) if (200..300).contains(&res.status) => result.ok += 1,
            Ok(res) => {
                result.failed += 1;
                result.errors.push(format!("{}: HTTP {}", id, res.status));
            }
            Err(e) => {
                result.failed += 1;
                result.errors.push(format!("{}: {}", id, e));
            }
        }
    }

    // อ่านใหม่ก่อนเขียน เผื่อมีการแก้ตั้งค่าระหว่างที่กำลังส่ง
    let mut latest = read_schedule(app);
    latest.last_run = Some(result);
    write_schedule(app, &latest).ok();
}
