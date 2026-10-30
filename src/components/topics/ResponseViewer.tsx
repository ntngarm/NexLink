import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

/** จัดรูป JSON ให้อ่านง่าย ถ้าไม่ใช่ JSON คืนข้อความเดิม */
export const formatBody = (body: string) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

/** กล่องแสดง response พร้อมปุ่มคัดลอก */
export function ResponseBody({ body, className }: { body: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const text = body ? formatBody(body) : "";

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      {text && (
        <Button
          type="button" variant="ghost" size="sm"
          className="absolute right-1 top-1 h-6 px-2 text-xs bg-background/80"
          onClick={copy}
        >
          {copied ? <><Check className="h-3 w-3 mr-1" />คัดลอกแล้ว</> : <><Copy className="h-3 w-3 mr-1" />คัดลอก</>}
        </Button>
      )}
      <pre className={className ?? "text-xs font-mono bg-muted rounded p-3 pr-20 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all"}>
        {text || "(ไม่มี body)"}
      </pre>
    </div>
  );
}

interface Props {
  title: string | null;
  body: string;
  onClose: () => void;
}

/** หน้าต่างดู response ที่ API ตอบกลับ */
export function ResponseViewer({ title, body, onClose }: Props) {
  return (
    <Dialog open={title !== null} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Response — {title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          <ResponseBody body={body} />
        </div>
        <DialogFooter>
          <Button onClick={onClose}>ปิด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
