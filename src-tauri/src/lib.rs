mod commands;
mod db;

use commands::{connection, crud, queries, schedule, schema, sql_editor, table, topics};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            schedule::start(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            connection::test_connection,
            connection::connect_to_db,
            connection::disconnect,
            connection::auto_connect,
            connection::save_profile,
            connection::load_profiles,
            connection::delete_profile,
            connection::connect_from_profile,
            connection::get_current_connection,
            connection::get_current_profile,
            schema::list_tables,
            schema::get_table_columns,
            schema::get_schema,
            table::fetch_rows,
            crud::insert_row,
            crud::update_row,
            crud::delete_row,
            sql_editor::execute_query,
            queries::list_queries,
            queries::read_query,
            queries::save_query,
            queries::create_query_folder,
            queries::delete_query_item,
            queries::open_queries_folder,
            topics::load_topics,
            topics::save_topic,
            topics::delete_topic,
            topics::send_topic,
            topics::export_topics,
            topics::import_topics,
            schedule::load_schedule,
            schedule::save_schedule,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
