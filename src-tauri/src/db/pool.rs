use once_cell::sync::OnceCell;
use sqlx::mysql::MySqlPool;
use tokio::sync::Mutex;

static DB_POOL: OnceCell<Mutex<Option<MySqlPool>>> = OnceCell::new();
static CURRENT_DB: OnceCell<Mutex<Option<String>>> = OnceCell::new();

fn pool_lock() -> &'static Mutex<Option<MySqlPool>> {
    DB_POOL.get_or_init(|| Mutex::new(None))
}

fn db_lock() -> &'static Mutex<Option<String>> {
    CURRENT_DB.get_or_init(|| Mutex::new(None))
}

pub async fn set_pool(pool: MySqlPool, database: String) {
    *pool_lock().lock().await = Some(pool);
    *db_lock().lock().await = Some(database);
}

pub async fn clear_pool() {
    if let Some(pool) = pool_lock().lock().await.take() {
        pool.close().await;
    }
    *db_lock().lock().await = None;
}

pub async fn get_pool() -> Result<MySqlPool, String> {
    pool_lock()
        .lock()
        .await
        .clone()
        .ok_or_else(|| "ยังไม่ได้เชื่อมต่อฐานข้อมูล".to_string())
}

pub async fn get_current_database() -> Option<String> {
    db_lock().lock().await.clone()
}
