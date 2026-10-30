import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Database, Loader2, Plus, Check } from "lucide-react";
import { invoke } from "@/lib/invoke";
import type { ConnectionProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  /** สลับสำเร็จ ส่งชื่อฐานข้อมูลใหม่กลับไป */
  onSwitched: (database: string) => void;
  /** ไปหน้าเชื่อมต่อเพื่อเพิ่มการเชื่อมต่อใหม่ */
  onNew: () => void;
}

export function SwitchConnectionDialog({ open, onClose, onSwitched, onNew }: Props) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    invoke.loadProfiles().then(setProfiles).catch(() => setProfiles([]));
    invoke.getCurrentProfile().then(setCurrent).catch(() => setCurrent(null));
  }, [open]);

  const switchTo = async (p: ConnectionProfile) => {
    if (p.name === current) return onClose();
    setSwitching(p.name);
    setError(null);
    try {
      await invoke.connectFromProfile(p.name);
      onSwitched(p.database);
      onClose();
    } catch (e) {
      // เชื่อมต่อไม่สำเร็จ การเชื่อมต่อเดิมยังใช้งานอยู่
      setError(String(e));
    } finally {
      setSwitching(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={switching ? undefined : onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เปลี่ยนการเชื่อมต่อ</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1 min-h-0 overflow-y-auto -mx-6 px-6">
          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีการเชื่อมต่อที่บันทึกไว้</p>
          )}
          {profiles.map((p) => {
            const active = p.name === current;
            return (
              <button
                key={p.name}
                disabled={!!switching}
                onClick={() => switchTo(p)}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-60",
                  active ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
              >
                <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.username}@{p.host}:{p.port} / {p.database}
                  </p>
                </div>
                {switching === p.name && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                {active && !switching && (
                  <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                    <Check className="h-3.5 w-3.5" />กำลังใช้
                  </span>
                )}
              </button>
            );
          })}
          {error && (
            <p className="text-xs text-destructive break-all mt-2">
              {error} — ยังใช้การเชื่อมต่อเดิมอยู่
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={!!switching} onClick={onNew}>
            <Plus className="h-4 w-4 mr-1" />เพิ่มการเชื่อมต่อใหม่
          </Button>
          <Button variant="outline" disabled={!!switching} onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
