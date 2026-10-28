import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2 } from "lucide-react";
import { invoke } from "@/lib/invoke";
import type { Schedule } from "@/lib/types";

interface Props {
  open: boolean;
  topicIds: string[];
  onClose: () => void;
  onSaved: (schedule: Schedule) => void;
}

export function ScheduleDialog({ open, topicIds, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Schedule>({ enabled: false, times: [], topic_ids: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) invoke.loadSchedule().then(setForm);
  }, [open]);

  const setTime = (i: number, v: string) =>
    setForm((p) => { const times = [...p.times]; times[i] = v; return { ...p, times }; });

  const handleSave = async () => {
    setSaving(true);
    try {
      const times = [...new Set(form.times.filter((t) => t))].sort();
      const schedule = { ...form, times, topic_ids: topicIds };
      await invoke.saveSchedule(schedule);
      onSaved(schedule);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const last = form.last_run;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ตั้งเวลาส่งข้อมูล</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2 -mx-6 px-6 min-h-0 overflow-y-auto">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox" className="h-4 w-4 accent-primary"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
            />
            เปิดใช้งานการส่งอัตโนมัติ
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>เวลาส่ง (ทุกวัน)</Label>
              <Button
                type="button" variant="ghost" size="sm" className="h-6 text-xs px-2"
                onClick={() => setForm((p) => ({ ...p, times: [...p.times, "02:00"] }))}
              >
                <Plus className="h-3 w-3 mr-1" />เพิ่มเวลา
              </Button>
            </div>
            {form.times.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่ได้กำหนดเวลา</p>}
            {form.times.map((t, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <Input type="time" className="h-8 w-32" value={t} onChange={(e) => setTime(i, e.target.value)} />
                <Button
                  type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0"
                  onClick={() => setForm((p) => ({ ...p, times: p.times.filter((_, j) => j !== i) }))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            เมื่อถึงเวลาจะส่งทุกแฟ้มที่ตั้ง API URL ไว้ (แฟ้มที่ไม่มี URL จะข้าม) โปรแกรมต้องเปิดอยู่และเชื่อมต่อฐานข้อมูลไว้
          </p>

          <div className="flex flex-col gap-1 rounded-md border px-3 py-2 text-xs">
            <span className="font-medium">ส่งอัตโนมัติครั้งล่าสุด</span>
            {last ? (
              <>
                <span className="text-muted-foreground">
                  {last.at} · สำเร็จ {last.ok} · ล้มเหลว {last.failed} · ข้าม {last.skipped}
                </span>
                {last.errors.map((e, i) => (
                  <span key={i} className="text-destructive break-all">{e}</span>
                ))}
              </>
            ) : (
              <span className="text-muted-foreground">ยังไม่เคยส่ง</span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={saving || (form.enabled && !form.times.some((t) => t))} onClick={handleSave}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
