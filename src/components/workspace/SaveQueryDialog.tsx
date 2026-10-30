import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { invoke } from "@/lib/invoke";
import type { QueryNode } from "@/lib/types";

const ROOT = "__root__";

const flatten = (nodes: QueryNode[]): QueryNode[] => nodes.flatMap((n) => [n, ...flatten(n.children)]);

interface Props {
  open: boolean;
  defaultName: string;
  onCancel: () => void;
  /** path ที่เลือก (ยังไม่เติม .sql) */
  onConfirm: (path: string) => Promise<void>;
}

export function SaveQueryDialog({ open, defaultName, onCancel, onConfirm }: Props) {
  const [nodes, setNodes] = useState<QueryNode[]>([]);
  const [folder, setFolder] = useState(ROOT);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setError(null);
    invoke.listQueries().then(setNodes).catch(() => setNodes([]));
  }, [open]);

  const all = flatten(nodes);
  const folders = all.filter((n) => n.is_dir);
  const cleanName = name.trim().replace(/\.sql$/i, "");
  const path = folder === ROOT ? cleanName : `${folder}/${cleanName}`;
  const invalid = !cleanName || /[\\/:*?"<>|]/.test(cleanName);
  const exists = !invalid && all.some((n) => !n.is_dir && n.path.toLowerCase() === `${path}.sql`.toLowerCase());

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onConfirm(path);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึก Query</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>โฟลเดอร์</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT}>(โฟลเดอร์หลัก)</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.path} value={f.path}>{f.path}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>ชื่อไฟล์</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !invalid && !saving && confirm()}
              placeholder="เช่น รายงานผู้ป่วยนอก"
            />
            {name && invalid && <p className="text-xs text-destructive">ชื่อไฟล์ห้ามมีอักขระ \ / : * ? " &lt; &gt; |</p>}
            {exists && <p className="text-xs text-amber-500">มีไฟล์ชื่อนี้อยู่แล้ว จะถูกเขียนทับ</p>}
          </div>
          {error && <p className="text-xs text-destructive break-all">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onCancel}>ยกเลิก</Button>
          <Button disabled={saving || invalid} onClick={confirm}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
