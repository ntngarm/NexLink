import { useEffect, useState } from "react";
import { invoke } from "@/lib/invoke";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { tableName } = useParams();
  const navigate = useNavigate();

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
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          ตาราง
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={loadTables}
          disabled={loading}
        >
          <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/table/${t}`)}
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
          {tables.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              ไม่พบตาราง
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
