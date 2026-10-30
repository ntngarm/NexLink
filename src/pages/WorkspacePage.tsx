import { useState } from "react";
import DataTable from "@/components/table/DataTable";
import { SaveQueryDialog } from "@/components/workspace/SaveQueryDialog";
import { invoke } from "@/lib/invoke";
import SqlEditor from "@/components/sql/SqlEditor";
import { useWorkspace, type WorkspaceTab } from "@/components/workspace/WorkspaceContext";
import { Code2, Plus, Table2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const tabTitle = (t: WorkspaceTab) =>
  t.kind === "table" ? t.table : t.path ? `${t.title}.sql` : t.title;

export default function WorkspacePage() {
  const { tabs, activeId, activate, close, openQuery, setQueryFile, refreshQueries } = useWorkspace();
  // แท็บที่รอเลือกชื่อไฟล์ตอนบันทึกครั้งแรก
  const [pendingSave, setPendingSave] = useState<{
    tab: Extract<WorkspaceTab, { kind: "query" }>;
    sql: string;
    resolve: (saved: boolean) => void;
  } | null>(null);

  const saveTab = (tab: Extract<WorkspaceTab, { kind: "query" }>) => async (sql: string) => {
    if (tab.path) {
      await invoke.saveQuery(tab.path, sql);
      refreshQueries();
      return true;
    }
    return new Promise<boolean>((resolve) => setPendingSave({ tab, sql, resolve }));
  };

  const confirmSave = async (path: string) => {
    if (!pendingSave) return;
    const saved = await invoke.saveQuery(path, pendingSave.sql);
    setQueryFile(pendingSave.tab.id, saved);
    refreshQueries();
    pendingSave.resolve(true);
    setPendingSave(null);
  };

  const cancelSave = () => {
    pendingSave?.resolve(false);
    setPendingSave(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* แถบแท็บ */}
      <div className="flex items-end gap-0.5 px-2 pt-1.5 border-b bg-muted/30 overflow-x-auto shrink-0">
        {tabs.map((t) => {
          const active = t.id === activeId;
          const Icon = t.kind === "table" ? Table2 : Code2;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={active}
              title={tabTitle(t)}
              onClick={() => activate(t.id)}
              onMouseDown={(e) => { if (e.button === 1) { e.preventDefault(); close(t.id); } }}
              className={cn(
                "group flex items-center gap-1.5 max-w-[200px] pl-3 pr-1.5 py-1.5 rounded-t-md border border-b-0 text-xs cursor-pointer select-none shrink-0",
                active
                  ? "bg-background text-foreground font-medium -mb-px"
                  : "bg-transparent border-transparent text-muted-foreground hover:bg-background/60"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              <span className="truncate">{tabTitle(t)}</span>
              {t.kind === "query" && t.path && <span className="sr-only">(บันทึกเป็นไฟล์แล้ว)</span>}
              <button
                onClick={(e) => { e.stopPropagation(); close(t.id); }}
                className={cn(
                  "ml-0.5 rounded p-0.5 hover:bg-muted",
                  active ? "opacity-70" : "opacity-0 group-hover:opacity-70"
                )}
                title="ปิดแท็บ"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={() => openQuery()}
          className="flex items-center justify-center h-7 w-7 mb-0.5 rounded-md text-muted-foreground hover:bg-background/60 shrink-0"
          title="เปิด Query ใหม่"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* เนื้อหา: render ทุกแท็บไว้ ซ่อนแท็บที่ไม่ได้ใช้ เพื่อให้สถานะ (query, ผลลัพธ์, หน้า) ไม่หาย */}
      <div className="flex-1 min-h-0 relative">
        {tabs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Table2 className="h-12 w-12 opacity-20" />
            <p className="text-sm">เลือกตารางจาก Sidebar ทางซ้าย หรือกด + เพื่อเปิด Query ใหม่</p>
          </div>
        )}
        {tabs.map((t) => (
          <div key={t.id} className={cn("absolute inset-0", t.id !== activeId && "hidden")}>
            {t.kind === "table"
              ? <DataTable tableName={t.table} />
              : <SqlEditor initialSql={t.initialSql} onSave={saveTab(t)} />}
          </div>
        ))}
      </div>

      <SaveQueryDialog
        open={!!pendingSave}
        defaultName={pendingSave?.tab.title ?? ""}
        onCancel={cancelSave}
        onConfirm={confirmSave}
      />
    </div>
  );
}
