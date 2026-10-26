import { useState } from "react";
import { invoke } from "@/lib/invoke";
import type { QueryResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Play, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function SqlEditor() {
  const [sql, setSql] = useState("SELECT * FROM ");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!sql.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const r = await invoke.executeQuery(sql);
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };

  const formatCell = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="p-4 border-b">
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKey}
          placeholder="เขียน SQL query ที่นี่..."
          className="font-mono text-sm min-h-[140px] resize-none"
          spellCheck={false}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter เพื่อรัน
          </span>
          <Button
            size="sm"
            onClick={run}
            disabled={running || !sql.trim()}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {running ? "กำลังรัน..." : "รัน"}
          </Button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="flex gap-2 items-start p-3 rounded-lg bg-destructive/10 text-destructive mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <pre className="text-sm whitespace-pre-wrap break-all font-mono">
              {error}
            </pre>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {result.is_select ? (
                <Badge variant="secondary">{result.rows.length} แถว</Badge>
              ) : (
                <Badge variant="secondary">
                  กระทบ {result.rows_affected} แถว
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {result.execution_time_ms} ms
              </span>
            </div>

            {result.is_select && result.columns.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((c) => (
                      <TableHead key={c} className="font-mono text-xs">
                        {c}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, i) => (
                    <TableRow key={i}>
                      {result.columns.map((c) => (
                        <TableCell
                          key={c}
                          className="max-w-[240px] font-mono text-xs"
                        >
                          {row[c] === null || row[c] === undefined ? (
                            <span className="text-muted-foreground italic">
                              NULL
                            </span>
                          ) : (
                            <span
                              className="block truncate"
                              title={formatCell(row[c])}
                            >
                              {formatCell(row[c])}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {!result.is_select && (
              <p className="text-sm text-muted-foreground">
                Query รันสำเร็จ
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
