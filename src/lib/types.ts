export interface ConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface ConnectionProfile {
  name: string;
  host: string;
  port: number;
  username: string;
  database: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  key: string;
  default_value: string | null;
  extra: string;
}

export interface TableData {
  rows: Record<string, unknown>[];
  total: number;
  columns: string[];
}

export interface FetchParams {
  table_name: string;
  page: number;
  page_size: number;
  sort_column?: string;
  sort_dir?: "ASC" | "DESC";
  search?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rows_affected: number;
  execution_time_ms: number;
  is_select: boolean;
}

export interface HeaderPair {
  key: string;
  value: string;
}

export interface Topic {
  id: string;
  name: string;
  query: string;
  api_url: string;
  method: "POST" | "PUT";
  headers: HeaderPair[];
  body_template: string;
}

export interface SendResult {
  status: number;
  body: string;
  rows_sent: number;
  execution_time_ms: number;
}
