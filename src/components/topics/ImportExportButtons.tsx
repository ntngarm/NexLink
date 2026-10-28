import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Download, Upload } from "lucide-react";
import { invoke } from "@/lib/invoke";

interface Props {
  onImported: () => void;
}

/** ปุ่มส่งออก/นำเข้าการตั้งค่าหัวข้อทั้งหมด (ทั้ง 43 แฟ้มและหัวข้อกำหนดเอง) เป็นไฟล์ .json */
export function ImportExportButtons({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setMessage({ title: "เกิดข้อผิดพลาด", text: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => run(async () => {
    const path = await invoke.exportTopics();
    if (path) setMessage({ title: "ส่งออกสำเร็จ", text: `บันทึกไฟล์ไว้ที่ ${path}` });
  });

  const handleImport = () => run(async () => {
    const count = await invoke.importTopics();
    if (count === null) return;
    onImported();
    setMessage({ title: "นำเข้าสำเร็จ", text: `นำเข้า ${count} หัวข้อ (หัวข้อที่ซ้ำจะถูกแทนที่ด้วยค่าจากไฟล์)` });
  });

  return (
    <>
      <Button size="sm" variant="outline" disabled={busy} onClick={handleImport}>
        <Upload className="h-4 w-4 mr-1" />นำเข้า
      </Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={handleExport}>
        <Download className="h-4 w-4 mr-1" />ส่งออก
      </Button>

      <AlertDialog open={!!message} onOpenChange={() => setMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{message?.title}</AlertDialogTitle>
            <AlertDialogDescription className="break-all">{message?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMessage(null)}>ตกลง</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
