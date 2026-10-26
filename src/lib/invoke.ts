import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type {
  ConnectionConfig,
  ConnectionProfile,
  ColumnInfo,
  TableData,
  FetchParams,
  QueryResult,
  Topic,
  SendResult,
} from "./types";

export const invoke = {
  testConnection: (config: ConnectionConfig) =>
    tauriInvoke<string>("test_connection", { config }),

  connectToDb: (config: ConnectionConfig) =>
    tauriInvoke<string>("connect_to_db", { config }),

  disconnect: () => tauriInvoke<void>("disconnect"),

  saveProfile: (profile: ConnectionProfile, password: string) =>
    tauriInvoke<void>("save_profile", { profile, password }),

  loadProfiles: () => tauriInvoke<ConnectionProfile[]>("load_profiles"),

  deleteProfile: (name: string) =>
    tauriInvoke<void>("delete_profile", { name }),

  connectFromProfile: (profileName: string) =>
    tauriInvoke<string>("connect_from_profile", { profileName }),

  autoConnect: () => tauriInvoke<string | null>("auto_connect"),

  getCurrentConnection: () =>
    tauriInvoke<string | null>("get_current_connection"),

  listTables: () => tauriInvoke<string[]>("list_tables"),

  getTableColumns: (tableName: string) =>
    tauriInvoke<ColumnInfo[]>("get_table_columns", { tableName }),

  fetchRows: (params: FetchParams) =>
    tauriInvoke<TableData>("fetch_rows", { params }),

  insertRow: (tableName: string, data: Record<string, unknown>) =>
    tauriInvoke<number>("insert_row", { tableName, data }),

  updateRow: (
    tableName: string,
    pkColumn: string,
    pkValue: unknown,
    data: Record<string, unknown>
  ) =>
    tauriInvoke<number>("update_row", { tableName, pkColumn, pkValue, data }),

  deleteRow: (tableName: string, pkColumn: string, pkValue: unknown) =>
    tauriInvoke<number>("delete_row", { tableName, pkColumn, pkValue }),

  executeQuery: (sql: string) =>
    tauriInvoke<QueryResult>("execute_query", { sql }),

  loadTopics: () => tauriInvoke<Topic[]>("load_topics"),

  saveTopic: (topic: Topic) => tauriInvoke<void>("save_topic", { topic }),

  deleteTopic: (id: string) => tauriInvoke<void>("delete_topic", { id }),

  sendTopic: (id: string) => tauriInvoke<SendResult>("send_topic", { id }),
};
