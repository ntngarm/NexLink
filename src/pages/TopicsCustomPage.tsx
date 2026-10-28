import { useEffect, useState } from "react";
import { invoke } from "@/lib/invoke";
import type { Topic, SendResult, HeaderPair } from "@/lib/types";
import { FILES_43_SET } from "@/lib/topics-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SendResultDialog } from "@/components/topics/SendResultDialog";
import { SendAllDialog, type SendAllItem } from "@/components/topics/SendAllDialog";
import { ImportExportButtons } from "@/components/topics/ImportExportButtons";
import { Send, Pencil, Trash2, Plus, X, Loader2, Eraser, SendHorizonal } from "lucide-react";

const emptyTopic = (): Topic => ({
  id: crypto.randomUUID(),
  name: "",
  query: "",
  api_url: "",
  method: "POST",
  headers: [],
  body_template: "",
  days_back: 30,
});

export default function TopicsCustomPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [editing, setEditing] = useState<Topic | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [clearAll, setClearAll] = useState(false);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendAllItems, setSendAllItems] = useState<SendAllItem[]>([]);
  const [sendAllRunning, setSendAllRunning] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; data: SendResult } | null>(null);
  const [error, setError] = useState<{ name: string; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const all = await invoke.loadTopics().catch(() => [] as Topic[]);
    setTopics(all.filter((t) => !FILES_43_SET.has(t.id.toLowerCase())));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => setEditing(emptyTopic());
  const openEdit = (t: Topic) => setEditing({ ...t, headers: [...t.headers] });

  const handleSave = async () => {
    if (!editing || !editing.name.trim() || !editing.query.trim()) return;
    setSaving(true);
    try {
      await invoke.saveTopic(editing);
      await load();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await invoke.deleteTopic(deleteId);
    setDeleteId(null);
    await load();
  };

  const handleClearAll = async () => {
    for (const t of topics) await invoke.deleteTopic(t.id);
    setClearAll(false);
    await load();
  };

  const handleSendAll = async () => {
    const initial: SendAllItem[] = topics.map((t) => ({ id: t.id, name: t.name, status: "pending" }));
    setSendAllItems(initial);
    setSendAllOpen(true);
    setSendAllRunning(true);

    for (const t of topics) {
      setSendAllItems((p) => p.map((item) => item.id === t.id ? { ...item, status: "sending" } : item));

      if (!t.api_url.trim()) {
        setSendAllItems((p) => p.map((item) => item.id === t.id ? { ...item, status: "skipped", msg: "ไม่มี URL" } : item));
        continue;
      }

      try {
        const res = await invoke.sendTopic(t.id);
        const ok = res.status >= 200 && res.status < 300;
        setSendAllItems((p) => p.map((item) =>
          item.id === t.id ? { ...item, status: ok ? "ok" : "error", msg: `HTTP ${res.status} · ${res.rows_sent} rows` } : item
        ));
      } catch (e) {
        setSendAllItems((p) => p.map((item) =>
          item.id === t.id ? { ...item, status: "error", msg: String(e) } : item
        ));
      }
    }

    setSendAllRunning(false);
  };

  const handleSend = async (t: Topic) => {
    if (!t.api_url.trim()) {
      setError({ name: t.name, msg: "ยังไม่ได้กำหนด API URL กรุณาแก้ไขก่อน" });
      return;
    }
    setSendingId(t.id);
    try {
      const data = await invoke.sendTopic(t.id);
      setResult({ name: t.name, data });
    } catch (e) {
      setError({ name: t.name, msg: String(e) });
    } finally {
      setSendingId(null);
    }
  };

  const addHeader = () =>
    setEditing((p) => p ? { ...p, headers: [...p.headers, { key: "", value: "" }] } : p);

  const updateHeader = (i: number, field: keyof HeaderPair, val: string) =>
    setEditing((p) => {
      if (!p) return p;
      const headers = [...p.headers];
      headers[i] = { ...headers[i], [field]: val };
      return { ...p, headers };
    });

  const removeHeader = (i: number) =>
    setEditing((p) => p ? { ...p, headers: p.headers.filter((_, j) => j !== i) } : p);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-base font-semibold">หัวข้อกำหนดเอง</h1>
          <p className="text-xs text-muted-foreground">สร้าง query และ API URL ที่กำหนดเอง</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButtons onImported={load} />
          {topics.length > 0 && (
            <>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setClearAll(true)}>
                <Eraser className="h-4 w-4 mr-1" />ล้างทั้งหมด
              </Button>
              <Button size="sm" variant="outline" disabled={sendAllRunning} onClick={handleSendAll}>
                <SendHorizonal className="h-4 w-4 mr-1" />ส่งทั้งหมด
              </Button>
            </>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />หัวข้อใหม่
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Send className="h-8 w-8 opacity-20" />
            <p className="text-sm">ยังไม่มีหัวข้อ กด "หัวข้อใหม่" เพื่อเพิ่ม</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {topics.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border rounded-lg px-4 py-2.5 bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <Badge variant="outline" className="text-[10px]">{t.method}</Badge>
                    {!t.api_url.trim() && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-400">ยังไม่มี URL</Badge>
                    )}
                  </div>
                  {t.api_url.trim() && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{t.api_url}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm" className="h-7 px-3 ml-1"
                    disabled={sendingId === t.id}
                    onClick={() => handleSend(t)}
                  >
                    {sendingId === t.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <><Send className="h-3.5 w-3.5 mr-1" />ส่ง</>}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editing && topics.find((t) => t.id === editing.id) ? "แก้ไขหัวข้อ" : "สร้างหัวข้อใหม่"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-4 py-2 -mx-6 px-6 min-h-0 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <Label>ชื่อหัวข้อ</Label>
                <Input
                  placeholder="เช่น ส่งออเดอร์วันนี้"
                  value={editing.name}
                  onChange={(e) => setEditing((p) => p ? { ...p, name: e.target.value } : p)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label>API URL</Label>
                  <Input
                    placeholder="https://example.com/api/data"
                    value={editing.api_url}
                    onChange={(e) => setEditing((p) => p ? { ...p, api_url: e.target.value } : p)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-24">
                  <Label>Method</Label>
                  <Select
                    value={editing.method}
                    onValueChange={(v) => setEditing((p) => p ? { ...p, method: v as "POST" | "PUT" } : p)}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>SQL Query</Label>
                <Textarea
                  className="font-mono text-xs min-h-48 resize-y"
                  value={editing.query}
                  onChange={(e) => setEditing((p) => p ? { ...p, query: e.target.value } : p)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Body Template <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span></Label>
                <Textarea
                  className="font-mono text-xs min-h-40 resize-y"
                  placeholder={'ว่างไว้ = ส่ง JSON array ตรงๆ\nตัวอย่าง: {"table":"person","body":${result_sql}}'}
                  value={editing.body_template}
                  onChange={(e) => setEditing((p) => p ? { ...p, body_template: e.target.value } : p)}
                />
                <p className="text-[11px] text-muted-foreground"><code className="bg-muted px-1 rounded">{"${result_sql}"}</code> จะถูกแทนที่ด้วยผลลัพธ์ SQL</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Headers (เพิ่มเติม)</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={addHeader}>
                    <Plus className="h-3 w-3 mr-1" />เพิ่ม
                  </Button>
                </div>
                {editing.headers.map((h, i) => (
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
            <Button
              disabled={saving || !editing?.name.trim() || !editing?.query.trim()}
              onClick={handleSave}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบหัวข้อนี้?</AlertDialogTitle>
            <AlertDialogDescription>การกระทำนี้ไม่สามารถย้อนกลับได้</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearAll} onOpenChange={setClearAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ล้างหัวข้อทั้งหมด?</AlertDialogTitle>
            <AlertDialogDescription>
              จะลบหัวข้อกำหนดเองทั้ง {topics.length} รายการ การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>ล้างทั้งหมด</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
