import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const CHECK_EVENT = "nexlink:check-update";

/** สั่งตรวจสอบอัปเดตจากที่อื่นในแอป (เช่นปุ่มใน sidebar) แล้วแจ้งผลแม้จะไม่มีเวอร์ชันใหม่ */
export const requestUpdateCheck = () => window.dispatchEvent(new Event(CHECK_EVENT));

type State =
  | { kind: "idle" }
  | { kind: "available"; update: Update }
  | { kind: "downloading"; update: Update; downloaded: number; total: number | null }
  | { kind: "message"; title: string; text: string };

export function UpdateChecker() {
  const [state, setState] = useState<State>({ kind: "idle" });

  const runCheck = async (manual: boolean) => {
    try {
      const update = await check();
      if (update) setState({ kind: "available", update });
      else if (manual) setState({ kind: "message", title: "เป็นเวอร์ชันล่าสุดแล้ว", text: "ไม่มีอัปเดตใหม่" });
    } catch (e) {
      // ตอนเปิดโปรแกรมไม่ต้องแจ้ง error (เช่นไม่มีอินเทอร์เน็ต) แจ้งเฉพาะตอนกดตรวจสอบเอง
      if (manual) setState({ kind: "message", title: "ตรวจสอบอัปเดตไม่สำเร็จ", text: String(e) });
    }
  };

  useEffect(() => {
    runCheck(false);
    const onRequest = () => runCheck(true);
    window.addEventListener(CHECK_EVENT, onRequest);
    return () => window.removeEventListener(CHECK_EVENT, onRequest);
  }, []);

  const install = async (update: Update) => {
    let downloaded = 0;
    let total: number | null = null;
    setState({ kind: "downloading", update, downloaded, total });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? null;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        setState({ kind: "downloading", update, downloaded, total });
      });
      await relaunch();
    } catch (e) {
      setState({ kind: "message", title: "อัปเดตไม่สำเร็จ", text: String(e) });
    }
  };

  const close = () => setState({ kind: "idle" });
  const open = state.kind !== "idle";
  const downloading = state.kind === "downloading";

  return (
    <Dialog open={open} onOpenChange={downloading ? undefined : close}>
      <DialogContent className="max-w-md">
        {(state.kind === "available" || state.kind === "downloading") && (
          <>
            <DialogHeader>
              <DialogTitle>มีเวอร์ชันใหม่ {state.update.version}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto text-sm">
              <p className="text-muted-foreground">เวอร์ชันปัจจุบัน {state.update.currentVersion}</p>
              {state.update.body && (
                <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs font-sans">{state.update.body}</pre>
              )}
              {state.kind === "downloading" && (
                <div className="flex flex-col gap-1">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: state.total ? `${Math.min(100, (state.downloaded / state.total) * 100)}%` : "100%" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    กำลังดาวน์โหลด {(state.downloaded / 1024 / 1024).toFixed(1)} MB
                    {state.total ? ` / ${(state.total / 1024 / 1024).toFixed(1)} MB` : ""} — โปรแกรมจะเปิดใหม่เองเมื่อติดตั้งเสร็จ
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={downloading} onClick={close}>ภายหลัง</Button>
              <Button disabled={downloading} onClick={() => install(state.update)}>
                {downloading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}อัปเดตเลย
              </Button>
            </DialogFooter>
          </>
        )}
        {state.kind === "message" && (
          <>
            <DialogHeader>
              <DialogTitle>{state.title}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground break-all">{state.text}</p>
            <DialogFooter>
              <Button onClick={close}>ตกลง</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
