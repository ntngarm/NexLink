import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ColumnHeader from "./ColumnHeader";
import CrudDialog from "./CrudDialog";
import { invoke } from "@/lib/invoke";
import type { ColumnInfo, TableData } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  tableName: string;
}

const PAGE_SIZE = 50;

export default function DataTable({ tableName }: Props) {
  const [data, setData] = useState<TableData | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    mode: "add" | "edit" | "delete";
    row?: Record<string, unknown>;
  } | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const pkColumn =
    columns.find((c) => c.key === "PRI")?.name ?? columns[0]?.name ?? "id";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke.fetchRows({
        table_name: tableName,
        page,
        page_size: PAGE_SIZE,
        sort_column: sortCol,
        sort_dir: sortDir,
        search: debouncedSearch || undefined,
      });
      setData(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [tableName, page, sortCol, sortDir, debouncedSearch]);

  const loadColumns = useCallback(async () => {
    try {
      const cols = await invoke.getTableColumns(tableName);
      setColumns(cols);
    } catch {
      setColumns([]);
    }
  }, [tableName]);

  useEffect(() => {
    setPage(1);
    setSortCol(undefined);
    setSearch("");
    setData(null);
    loadColumns();
  }, [tableName, loadColumns]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortCol(col);
      setSortDir("ASC");
    }
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const displayCols = data?.columns ?? [];

  const formatCell = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหา..."
            className="pl-8 h-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto flex items-center gap-2">
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.total.toLocaleString()} แถว
            </span>
          )}
          <Button size="sm" className="h-8" onClick={() => setDialog({ mode: "add" })}>
            <Plus className="h-4 w-4 mr-1" />
            เพิ่ม
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {error ? (
          <div className="p-8 text-center text-destructive text-sm">{error}</div>
        ) : !data && loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            กำลังโหลด...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 sticky left-0 bg-background">
                  จัดการ
                </TableHead>
                {displayCols.map((col) => (
                  <TableHead key={col}>
                    <ColumnHeader
                      column={col}
                      sortColumn={sortCol}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.rows.map((row, i) => (
                <TableRow
                  key={i}
                  className={loading ? "opacity-50 pointer-events-none" : ""}
                >
                  <TableCell className="sticky left-0 bg-background">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDialog({ mode: "edit", row })}
                        title="แก้ไข"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDialog({ mode: "delete", row })}
                        title="ลบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                  {displayCols.map((col) => (
                    <TableCell key={col} className="max-w-[220px]">
                      {row[col] === null || row[col] === undefined ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono text-muted-foreground"
                        >
                          NULL
                        </Badge>
                      ) : (
                        <span
                          className="block truncate text-sm"
                          title={formatCell(row[col])}
                        >
                          {formatCell(row[col])}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data?.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={displayCols.length + 1}
                    className="text-center text-muted-foreground py-8"
                  >
                    ไม่พบข้อมูล
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-2 border-t">
        <span className="text-xs text-muted-foreground">
          หน้า {page} / {totalPages}
          {data && ` · ${data.total.toLocaleString()} แถวทั้งหมด`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* CRUD Dialog */}
      {dialog && (
        <CrudDialog
          tableName={tableName}
          columns={columns}
          mode={dialog.mode}
          row={dialog.row}
          pkColumn={pkColumn}
          onDone={() => {
            setDialog(null);
            load();
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
