import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { invoke } from "@/lib/invoke";
import type { QueryResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { sqlWithCompletion } from "./sqlCompletion";

/** ติดตาม dark mode จาก class "dark" บน <html> */
function useDarkMode() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Play, AlertCircle, Clock, CheckCircle2, Save } from "lucide-react";

interface Props {
  initialSql?: string;
  /** บันทึก query (คืน true ถ้าบันทึกสำเร็จ) — ไม่ส่งมา = ไม่มีปุ่มบันทึก */
  onSave?: (sql: string) => Promise<boolean>;
}

export default function SqlEditor({ initialSql, onSave }: Props) {
  const [sql, setSql] = useState(initialSql ?? "SELECT * FROM ");
  const [savedSql, setSavedSql] = useState(initialSql ?? null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [schema, setSchema] = useState<Record<string, string[]>>({});
  const dark = useDarkMode();

  useEffect(() => {
    invoke.getSchema().then(setSchema).catch(() => {});
  }, []);

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

  const save = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    try {
      if (await onSave(sql)) setSavedSql(sql);
    } finally {
      setSaving(false);
    }
  };
  const dirty = savedSql !== sql;

  // ให้ Ctrl+Enter / Ctrl+S เรียกฟังก์ชันตัวล่าสุดเสมอ (extension สร้างครั้งเดียว)
  const runRef = useRef(run);
  runRef.current = run;
  const saveRef = useRef(save);
  saveRef.current = save;

  const extensions = useMemo(() => [
    ...sqlWithCompletion(schema),
    Prec.highest(keymap.of([
      { key: "Mod-Enter", run: () => { runRef.current(); return true; } },
      { key: "Mod-s", preventDefault: true, run: () => { saveRef.current(); return true; } },
    ])),
  ], [schema]);

  const formatCell = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor area */}
      <div className="p-4 border-b">
        <div className="h-[200px] min-h-[140px] resize-y overflow-hidden rounded-md border border-input text-sm">
          <CodeMirror
            value={sql}
            onChange={setSql}
            height="100%"
            className="h-full"
            theme={dark ? "dark" : "light"}
            placeholder="เขียน SQL query ที่นี่..."
            extensions={extensions}
            basicSetup={{ foldGutter: false, highlightActiveLine: false }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            Ctrl+Enter เพื่อรัน{onSave && " · Ctrl+S เพื่อบันทึก"}
          </span>
          <div className="flex items-center gap-2">
            {onSave && (
              <>
                {savedSql !== null && (
                  <span className="text-xs text-muted-foreground">
                    {dirty ? "ยังไม่ได้บันทึก" : "บันทึกแล้ว"}
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </>
            )}
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
