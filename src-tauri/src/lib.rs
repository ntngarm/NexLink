mod commands;
mod db;

use commands::{connection, crud, schema, sql_editor, table, topics};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
            schema::list_tables,
            schema::get_table_columns,
            table::fetch_rows,
            crud::insert_row,
            crud::update_row,
            crud::delete_row,
            sql_editor::execute_query,
            topics::load_topics,
            topics::save_topic,
            topics::delete_topic,
            topics::send_topic,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
