import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type WorkspaceTab =
  | { id: string; kind: "table"; table: string }
  | {
      id: string;
      kind: "query";
      title: string;
      /** path ของไฟล์ที่บันทึกไว้ (ถ้ามี) */
      path?: string;
      /** query เริ่มต้นตอนเปิดแท็บ */
      initialSql?: string;
    };

interface OpenQueryOptions {
  title?: string;
  path?: string;
  sql?: string;
}

interface Workspace {
  tabs: WorkspaceTab[];
  activeId: string | null;
  activeTab: WorkspaceTab | null;
  /** เปิดตารางในแท็บใหม่ หรือสลับไปแท็บเดิมถ้าเปิดอยู่แล้ว */
  openTable: (table: string) => void;
  /** เปิดแท็บ Query ใหม่ (ถ้าเป็นไฟล์ที่เปิดอยู่แล้วจะสลับไปแท็บเดิม) */
  openQuery: (options?: OpenQueryOptions) => void;
  /** สลับไปแท็บ Query ล่าสุด หรือเปิดใหม่ถ้ายังไม่มี */
  focusQuery: () => void;
  /** ผูกแท็บ Query กับไฟล์หลังบันทึก */
  setQueryFile: (id: string, path: string) => void;
  activate: (id: string) => void;
  close: (id: string) => void;
  /** เพิ่มทุกครั้งที่ไฟล์ query เปลี่ยน ให้รายการไฟล์โหลดใหม่ */
  queriesVersion: number;
  refreshQueries: () => void;
}

const WorkspaceContext = createContext<Workspace | null>(null);

/** ชื่อไฟล์ไม่รวม .sql */
export const fileTitle = (path: string) => path.split("/").pop()!.replace(/\.sql$/i, "");

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [queriesVersion, setQueriesVersion] = useState(0);
  const counter = useRef(0);
  const queryNo = useRef(0);

  const nextId = () => `tab-${++counter.current}`;

  const openTable = (table: string) => {
    const existing = tabs.find((t) => t.kind === "table" && t.table === table);
    if (existing) return setActiveId(existing.id);
    const tab: WorkspaceTab = { id: nextId(), kind: "table", table };
    setTabs((p) => [...p, tab]);
    setActiveId(tab.id);
  };

  const openQuery = (options: OpenQueryOptions = {}) => {
    if (options.path) {
      const existing = tabs.find((t) => t.kind === "query" && t.path === options.path);
      if (existing) return setActiveId(existing.id);
    }
    const tab: WorkspaceTab = {
      id: nextId(),
      kind: "query",
      title: options.title ?? `Query ${++queryNo.current}`,
      path: options.path,
      initialSql: options.sql,
    };
    setTabs((p) => [...p, tab]);
    setActiveId(tab.id);
  };

  const focusQuery = () => {
    const last = [...tabs].reverse().find((t) => t.kind === "query");
    if (last) setActiveId(last.id);
    else openQuery();
  };

  const setQueryFile = (id: string, path: string) =>
    setTabs((p) => p.map((t) => (t.id === id && t.kind === "query" ? { ...t, path, title: fileTitle(path) } : t)));

  const close = (id: string) => {
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const rest = tabs.filter((t) => t.id !== id);
    setTabs(rest);
    // ปิดแท็บที่ใช้อยู่ → ไปแท็บข้างเคียง
    if (activeId === id) setActiveId(rest[Math.min(idx, rest.length - 1)]?.id ?? null);
  };

  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  return (
    <WorkspaceContext.Provider
      value={{
        tabs, activeId, activeTab, openTable, openQuery, focusQuery, setQueryFile,
        activate: setActiveId, close,
        queriesVersion, refreshQueries: () => setQueriesVersion((v) => v + 1),
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
