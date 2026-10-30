import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Clock, SkipForward, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponseViewer } from "./ResponseViewer";

export type SendAllStatus = "pending" | "sending" | "ok" | "skipped" | "error";

export interface SendAllItem {
  id: string;
  name: string;
  status: SendAllStatus;
  msg?: string;
  /** response ที่ API ตอบกลับ (หรือข้อความ error) เก็บไว้เฉพาะรายการที่ล้มเหลว */
  response?: string;
}

interface Props {
  open: boolean;
  items: SendAllItem[];
  running: boolean;
  onClose: () => void;
}

const icons: Record<SendAllStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  sending: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  ok:      <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  skipped: <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />,
  error:   <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export function SendAllDialog({ open, items, running, onClose }: Props) {
  const done   = items.filter((i) => i.status === "ok").length;
  const errors = items.filter((i) => i.status === "error").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const [viewing, setViewing] = useState<SendAllItem | null>(null);

  return (
    <>
    <Dialog open={open} onOpenChange={running ? undefined : onClose}>
      {/* ปิดได้เฉพาะปุ่ม X หรือ "ปิด" — ไม่ปิดเมื่อคลิกนอกกรอบหรือกด Esc */}
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>ส่งทั้งหมด</DialogTitle>
        </DialogHeader>

        {/* Summary bar */}
        {!running && items.some((i) => i.status !== "pending") && (
          <div className="flex gap-4 text-sm py-1">
            <span className="text-green-500 font-medium">✓ {done} สำเร็จ</span>
            {skipped > 0 && <span className="text-muted-foreground">⟶ {skipped} ข้าม</span>}
            {errors > 0 && <span className="text-destructive font-medium">✗ {errors} ล้มเหลว</span>}
          </div>
        )}

        {/* List */}
        <div className="flex flex-col gap-1 max-h-80 overflow-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              role={item.response !== undefined ? "button" : undefined}
              title={item.response !== undefined ? "คลิกเพื่อดู response" : undefined}
              onClick={item.response !== undefined ? () => setViewing(item) : undefined}
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-xs",
                item.status === "sending" && "bg-primary/5",
                item.status === "error"   && "bg-destructive/5",
                item.status === "ok"      && "bg-green-500/5",
                item.response !== undefined && "cursor-pointer hover:bg-muted",
              )}
            >
              <span className="mt-0.5 shrink-0">{icons[item.status]}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "truncate",
                  item.status === "pending"  && "text-muted-foreground",
                  item.status === "error"    && "text-destructive",
                )}>
                  {item.name}
                </p>
                {item.msg && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{item.msg}</p>
                )}
              </div>
              {item.response !== undefined && (
                <span className={cn(
                  "shrink-0 flex items-center gap-1 text-[11px]",
                  item.status === "error" ? "text-destructive" : "text-muted-foreground",
                )}>
                  <FileJson className="h-3.5 w-3.5" />ดู response
                </span>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button disabled={running} onClick={onClose}>
            {running ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />กำลังส่ง...</> : "ปิด"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ResponseViewer
      title={viewing ? viewing.name : null}
      body={viewing?.response ?? ""}
      onClose={() => setViewing(null)}
    />
    </>
  );
}
