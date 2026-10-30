import { useEffect, useState } from "react";
import { invoke } from "@/lib/invoke";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { QueryTree } from "@/components/workspace/QueryTree";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"tables" | "queries">("tables");
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, openTable } = useWorkspace();
  const tableName = location.pathname === "/workspace" && activeTab?.kind === "table" ? activeTab.table : null;

  const keyword = search.trim().toLowerCase();
  const filtered = keyword ? tables.filter((t) => t.toLowerCase().includes(keyword)) : tables;

  const loadTables = async () => {
    setLoading(true);
    try {
      const result = await invoke.listTables();
      setTables(result);
    } catch {
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex rounded-md bg-sidebar-accent/50 p-0.5 text-[11px] font-medium">
          {(["tables", "queries"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-2.5 py-0.5 rounded transition-colors",
                mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "tables" ? "ตาราง" : "Query"}
            </button>
          ))}
        </div>
        {mode === "tables" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={loadTables}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        )}
      </div>
      {mode === "queries" ? <QueryTree /> : <>
      <div className="relative px-2 pb-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 -mt-1 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setSearch("")}
          placeholder="ค้นหาตาราง..."
          className="h-7 pl-7 pr-7 text-xs"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 -mt-1 text-muted-foreground hover:text-foreground"
            title="ล้างคำค้น"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {search && (
        <p className="px-3 pb-1 text-[10px] text-muted-foreground">
          พบ {filtered.length} จาก {tables.length} ตาราง
        </p>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {filtered.map((t) => (
            <button
              key={t}
              onClick={() => { openTable(t); navigate("/workspace"); }}
              className={cn(
                "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                tableName === t
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
              )}
            >
              <Table2 className="h-3.5 w-3.5 shrink-0 opacity-50" />
              <span className="truncate">{t}</span>
            </button>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              {search ? `ไม่พบตารางที่ตรงกับ "${search}"` : "ไม่พบตาราง"}
            </p>
          )}
        </div>
      </ScrollArea>
      </>}
    </div>
  );
}
