import type { SendResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResponseBody } from "./ResponseViewer";

interface Props {
  result: { name: string; data: SendResult } | null;
  error: { name: string; msg: string } | null;
  onClose: () => void;
}

const isOk = (s: number) => s >= 200 && s < 300;

export function SendResultDialog({ result, error, onClose }: Props) {
  return (
    <>
      <Dialog open={!!result} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result && isOk(result.data.status)
                ? <CheckCircle className="h-5 w-5 text-green-500" />
                : <XCircle className="h-5 w-5 text-destructive" />}
              ผลการส่ง — {result?.name}
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="flex flex-col gap-3 text-sm min-h-0 overflow-y-auto">
              <div className="flex gap-4">
                <div>
                  <span className="text-muted-foreground text-xs">Status</span>
                  <p className={cn("font-semibold", isOk(result.data.status) ? "text-green-500" : "text-destructive")}>
                    {result.data.status}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Rows ที่ส่ง</span>
                  <p className="font-semibold">{result.data.rows_sent}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">เวลา</span>
                  <p className="font-semibold">{result.data.execution_time_ms} ms</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Response Body</span>
                <div className="mt-1">
                  <ResponseBody body={result.data.body} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={onClose}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!error} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              เกิดข้อผิดพลาด — {error?.name}
            </DialogTitle>
          </DialogHeader>
          <pre className="text-xs font-mono bg-muted rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all text-destructive">
            {error?.msg}
          </pre>
          <DialogFooter>
            <Button onClick={onClose}>ปิด</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
