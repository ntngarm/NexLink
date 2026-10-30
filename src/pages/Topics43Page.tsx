import { useEffect, useState } from "react";
import { invoke } from "@/lib/invoke";
import type { Topic, SendResult, HeaderPair, Schedule } from "@/lib/types";
import { FILES_43 } from "@/lib/topics-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SendResultDialog } from "@/components/topics/SendResultDialog";
import { SendAllDialog, type SendAllItem } from "@/components/topics/SendAllDialog";
import { ScheduleDialog } from "@/components/topics/ScheduleDialog";
import { ImportExportButtons } from "@/components/topics/ImportExportButtons";
import { Send, Pencil, Plus, X, Loader2, Settings2, SendHorizonal, AlarmClock } from "lucide-react";

type Cfg = Pick<Topic, "query" | "api_url" | "method" | "headers" | "body_template" | "days_back">;

const DEFAULT_DAYS_BACK = 30;

const defaultCfg = (file: string): Cfg => ({
  query: `SELECT * FROM ${file.toLowerCase()} LIMIT 1000`,
  api_url: "",
  method: "POST",
  headers: [],
  body_template: "",
  days_back: DEFAULT_DAYS_BACK,
});

const parseDays = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

const QueryVarsHint = () => (
  <p className="text-[11px] text-muted-foreground">
    ตัวแปรใน query: <code className="bg-muted px-1 rounded">{"${days_back}"}</code> = จำนวนวันย้อนหลัง เช่น{" "}
    <code className="bg-muted px-1 rounded">{"WHERE vstdate >= DATE_SUB(CURDATE(), INTERVAL ${days_back} DAY)"}</code>
  </p>
);

type BulkForm = { api_url: string; method: "POST" | "PUT"; headers: HeaderPair[]; body_template: string; days_back: number };

export default function Topics43Page() {
  const [configs, setConfigs] = useState<Record<string, Cfg>>({});
  const [editing, setEditing] = useState<{ file: string; no: number; cfg: Cfg } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>({ api_url: "", method: "POST", headers: [], body_template: "", days_back: DEFAULT_DAYS_BACK });
  const [sendingFile, setSendingFile] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; data: SendResult } | null>(null);
  const [error, setError] = useState<{ name: string; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendAllItems, setSendAllItems] = useState<SendAllItem[]>([]);
  const [sendAllRunning, setSendAllRunning] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  useEffect(() => {
    invoke.loadSchedule().then(setSchedule).catch(() => {});
  }, []);

  const loadConfigs = () =>
    invoke.loadTopics().then((topics) => {
      const map: Record<string, Cfg> = {};
      for (const t of topics) {
        if (FILES_43.includes(t.id.toLowerCase())) {
          map[t.id.toLowerCase()] = { query: t.query, api_url: t.api_url, method: t.method, headers: t.headers, body_template: t.body_template, days_back: t.days_back ?? DEFAULT_DAYS_BACK };
        }
      }
      setConfigs(map);
    });

  useEffect(() => { loadConfigs(); }, []);

  const handleSendAll = async () => {
    const initial: SendAllItem[] = FILES_43.map((file, idx) => ({
      id: file,
      name: `${idx + 1}. ข้อมูลแฟ้ม ${file}`,
      status: "pending",
    }));
    setSendAllItems(initial);
    setSendAllOpen(true);
    setSendAllRunning(true);

    for (let i = 0; i < FILES_43.length; i++) {
      const file = FILES_43[i];
      const cfg = configs[file] ?? defaultCfg(file);

      setSendAllItems((p) => p.map((item) => item.id === file ? { ...item, status: "sending" } : item));

      if (!cfg.api_url.trim()) {
        setSendAllItems((p) => p.map((item) => item.id === file ? { ...item, status: "skipped", msg: "ไม่มี URL" } : item));
        continue;
      }

      try {
        await invoke.saveTopic({ id: file, name: `${i + 1}. ข้อมูลแฟ้ม ${file}`, ...cfg });
        const res = await invoke.sendTopic(file);
        const ok = res.status >= 200 && res.status < 300;
        setSendAllItems((p) => p.map((item) =>
          item.id === file ? { ...item, status: ok ? "ok" : "error", msg: `HTTP ${res.status} · ${res.rows_sent} rows`, response: res.body } : item
        ));
      } catch (e) {
        setSendAllItems((p) => p.map((item) =>
          item.id === file ? { ...item, status: "error", msg: String(e), response: String(e) } : item
        ));
      }
    }

    setSendAllRunning(false);
  };

  const openBulk = () => {
    // ดึง url/headers จากแฟ้มแรกที่มีค่า หรือ default ว่าง
    const first = FILES_43.map((f) => configs[f]).find((c) => c?.api_url.trim());
    setBulkForm({
      api_url: first?.api_url ?? "",
      method: first?.method ?? "POST",
      headers: first ? [...first.headers] : [],
      body_template: first?.body_template ?? "",
      days_back: first?.days_back ?? DEFAULT_DAYS_BACK,
    });
    setBulkOpen(true);
  };

  const handleBulkSave = async () => {
    setSaving(true);
    try {
      const newConfigs = { ...configs };
      for (let i = 0; i < FILES_43.length; i++) {
        const file = FILES_43[i];
        const existing = configs[file] ?? defaultCfg(file);
        const updated: Cfg = { ...existing, api_url: bulkForm.api_url, method: bulkForm.method, headers: [...bulkForm.headers], body_template: bulkForm.body_template, days_back: bulkForm.days_back };
        await invoke.saveTopic({ id: file, name: `${i + 1}. ข้อมูลแฟ้ม ${file}`, ...updated });
        newConfigs[file] = updated;
      }
      setConfigs(newConfigs);
      setBulkOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (file: string, no: number) => {
    const cfg = configs[file] ?? defaultCfg(file);
    setEditing({ file, no, cfg: { ...cfg, headers: [...cfg.headers] } });
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await invoke.saveTopic({
        id: editing.file,
        name: `${editing.no}. ข้อมูลแฟ้ม ${editing.file}`,
        ...editing.cfg,
      });
      setConfigs((p) => ({ ...p, [editing.file]: editing.cfg }));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (file: string, no: number) => {
    const cfg = configs[file] ?? defaultCfg(file);
    if (!cfg.api_url.trim()) {
      setError({ name: `${no}. ข้อมูลแฟ้ม ${file}`, msg: "ยังไม่ได้กำหนด API URL กรุณาแก้ไขก่อน" });
      return;
    }
    await invoke.saveTopic({ id: file, name: `${no}. ข้อมูลแฟ้ม ${file}`, ...cfg });
    setSendingFile(file);
    try {
      const data = await invoke.sendTopic(file);
      setResult({ name: `${no}. ข้อมูลแฟ้ม ${file}`, data });
    } catch (e) {
      setError({ name: `${no}. ข้อมูลแฟ้ม ${file}`, msg: String(e) });
    } finally {
      setSendingFile(null);
    }
  };

  const addHeader = () =>
    setEditing((p) => p ? { ...p, cfg: { ...p.cfg, headers: [...p.cfg.headers, { key: "", value: "" }] } } : p);

  const updateHeader = (i: number, field: keyof HeaderPair, val: string) =>
    setEditing((p) => {
      if (!p) return p;
      const headers = [...p.cfg.headers];
      headers[i] = { ...headers[i], [field]: val };
      return { ...p, cfg: { ...p.cfg, headers } };
    });

  const removeHeader = (i: number) =>
    setEditing((p) => p ? { ...p, cfg: { ...p.cfg, headers: p.cfg.headers.filter((_, j) => j !== i) } } : p);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-base font-semibold">43 แฟ้มมาตรฐาน</h1>
          <p className="text-xs text-muted-foreground">แก้ไข query และ API URL แล้วกด ส่ง</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButtons onImported={loadConfigs} />
          <Button size="sm" variant="outline" onClick={() => setScheduleOpen(true)}>
            <AlarmClock className="h-4 w-4 mr-1" />
            {schedule?.enabled && schedule.times.length > 0 ? `ตั้งเวลา ${schedule.times.join(", ")}` : "ตั้งเวลา"}
          </Button>
          <Button size="sm" variant="outline" onClick={openBulk}>
            <Settings2 className="h-4 w-4 mr-1" />ตั้งค่าทั้งหมด
          </Button>
          <Button size="sm" disabled={sendAllRunning} onClick={handleSendAll}>
            <SendHorizonal className="h-4 w-4 mr-1" />ส่งทั้งหมด
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="flex flex-col gap-2">
          {FILES_43.map((file, idx) => {
            const no = idx + 1;
            const cfg = configs[file] ?? defaultCfg(file);
            const hasUrl = cfg.api_url.trim().length > 0;
            return (
              <div key={file} className="flex items-center gap-3 border rounded-lg px-4 py-2.5 bg-card">
                <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">{no}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{file}</span>
                    <Badge variant="outline" className="text-[10px]">{cfg.method}</Badge>
                    <Badge variant="outline" className="text-[10px]">ย้อนหลัง {cfg.days_back} วัน</Badge>
                    {!hasUrl && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-400">
                        ยังไม่มี URL
                      </Badge>
                    )}
                  </div>
                  {hasUrl && <p className="text-xs text-muted-foreground truncate mt-0.5">{cfg.api_url}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(file, no)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" className="h-7 px-3 ml-1"
                    disabled={sendingFile === file}
                    onClick={() => handleSend(file, no)}
                  >
                    {sendingFile === file
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><Send className="h-3.5 w-3.5 mr-1" />ส่ง</>}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing && `${editing.no}. ข้อมูลแฟ้ม ${editing.file}`}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-4 py-2 -mx-6 px-6 min-h-0 overflow-y-auto">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label>API URL</Label>
                  <Input
                    placeholder="https://example.com/api/data"
                    value={editing.cfg.api_url}
                    onChange={(e) => setEditing((p) => p ? { ...p, cfg: { ...p.cfg, api_url: e.target.value } } : p)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-24">
                  <Label>Method</Label>
                  <Select
                    value={editing.cfg.method}
                    onValueChange={(v) => setEditing((p) => p ? { ...p, cfg: { ...p.cfg, method: v as "POST" | "PUT" } } : p)}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 w-32">
                  <Label>ย้อนหลัง (วัน)</Label>
                  <Input
                    type="number" min={0}
                    value={editing.cfg.days_back}
                    onChange={(e) => setEditing((p) => p ? { ...p, cfg: { ...p.cfg, days_back: parseDays(e.target.value) } } : p)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SQL Query</Label>
                <Textarea
                  className="font-mono text-xs min-h-48 resize-y"
                  value={editing.cfg.query}
                  onChange={(e) => setEditing((p) => p ? { ...p, cfg: { ...p.cfg, query: e.target.value } } : p)}
                />
                <QueryVarsHint />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Body Template <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span></Label>
                <Textarea
                  className="font-mono text-xs min-h-40 resize-y"
                  placeholder={'ว่างไว้ = ส่ง JSON array ตรงๆ\nตัวอย่าง: {"table":"${file_name}","body":${result_sql}}'}
                  value={editing.cfg.body_template}
                  onChange={(e) => setEditing((p) => p ? { ...p, cfg: { ...p.cfg, body_template: e.target.value } } : p)}
                />
                <p className="text-[11px] text-muted-foreground"><code className="bg-muted px-1 rounded">{"${result_sql}"}</code> จะถูกแทนที่ด้วยผลลัพธ์ SQL, <code className="bg-muted px-1 rounded">{"${file_name}"}</code> จะถูกแทนที่ด้วยชื่อแฟ้ม (เช่น person)</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Headers (เพิ่มเติม)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={addHeader}>
                    <Plus className="h-3 w-3 mr-1" />เพิ่ม
                  </Button>
                </div>
                {editing.cfg.headers.map((h, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <Input className="h-8 text-xs" placeholder="Key" value={h.key}
                      onChange={(e) => updateHeader(i, "key", e.target.value)} />
                    <Input className="h-8 text-xs" placeholder="Value" value={h.value}
                      onChange={(e) => updateHeader(i, "value", e.target.value)} />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeHeader(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>ยกเลิก</Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleDialog
        open={scheduleOpen}
        topicIds={FILES_43}
        onClose={() => setScheduleOpen(false)}
        onSaved={setSchedule}
      />

      {/* Bulk Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>ตั้งค่า URL และ Headers ทั้ง {FILES_43.length} แฟ้ม</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2 -mx-6 px-6 min-h-0 overflow-y-auto">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>API URL</Label>
                <Input
                  placeholder="https://example.com/api/data"
                  value={bulkForm.api_url}
                  onChange={(e) => setBulkForm((p) => ({ ...p, api_url: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 w-24">
                <Label>Method</Label>
                <Select
                  value={bulkForm.method}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, method: v as "POST" | "PUT" }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 w-32">
                <Label>ย้อนหลัง (วัน)</Label>
                <Input
                  type="number" min={0}
                  value={bulkForm.days_back}
                  onChange={(e) => setBulkForm((p) => ({ ...p, days_back: parseDays(e.target.value) }))}
                />
              </div>
            </div>
            <QueryVarsHint />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Headers (เพิ่มเติม)</Label>
                <Button
                  type="button" variant="ghost" size="sm" className="h-6 text-xs px-2"
                  onClick={() => setBulkForm((p) => ({ ...p, headers: [...p.headers, { key: "", value: "" }] }))}
                >
                  <Plus className="h-3 w-3 mr-1" />เพิ่ม
                </Button>
              </div>
              {bulkForm.headers.map((h, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <Input className="h-8 text-xs" placeholder="Key" value={h.key}
                    onChange={(e) => setBulkForm((p) => {
                      const headers = [...p.headers]; headers[i] = { ...headers[i], key: e.target.value };
                      return { ...p, headers };
                    })} />
                  <Input className="h-8 text-xs" placeholder="Value" value={h.value}
                    onChange={(e) => setBulkForm((p) => {
                      const headers = [...p.headers]; headers[i] = { ...headers[i], value: e.target.value };
                      return { ...p, headers };
                    })} />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                    onClick={() => setBulkForm((p) => ({ ...p, headers: p.headers.filter((_, j) => j !== i) }))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Body Template <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span></Label>
              <Textarea
                className="font-mono text-xs min-h-40 resize-y"
                placeholder={'ว่างไว้ = ส่ง JSON array ตรงๆ\nตัวอย่าง: {"table":"${file_name}","body":${result_sql}}'}
                value={bulkForm.body_template}
                onChange={(e) => setBulkForm((p) => ({ ...p, body_template: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground"><code className="bg-muted px-1 rounded">{"${result_sql}"}</code> จะถูกแทนที่ด้วยผลลัพธ์ SQL, <code className="bg-muted px-1 rounded">{"${file_name}"}</code> จะถูกแทนที่ด้วยชื่อแฟ้ม (เช่น person)</p>
            </div>
            <p className="text-xs text-muted-foreground">
              จะอัปเดต URL, Method, จำนวนวันย้อนหลัง, Headers และ Body Template ให้ครบทั้ง {FILES_43.length} แฟ้ม (query ของแต่ละแฟ้มจะยังคงเดิม)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>ยกเลิก</Button>
            <Button disabled={saving || !bulkForm.api_url.trim()} onClick={handleBulkSave}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              บันทึกทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SendResultDialog
        result={result} error={error}
        onClose={() => { setResult(null); setError(null); }}
      />

      <SendAllDialog
        open={sendAllOpen}
        items={sendAllItems}
        running={sendAllRunning}
        onClose={() => setSendAllOpen(false)}
      />
    </div>
  );
}
