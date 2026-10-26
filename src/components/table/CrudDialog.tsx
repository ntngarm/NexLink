import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invoke } from "@/lib/invoke";
import type { ColumnInfo } from "@/lib/types";

interface Props {
  tableName: string;
  columns: ColumnInfo[];
  mode: "add" | "edit" | "delete";
  row?: Record<string, unknown>;
  pkColumn: string;
  onDone: () => void;
  onClose: () => void;
}

export default function CrudDialog({
  tableName,
  columns,
  mode,
  row,
  pkColumn,
  onDone,
  onClose,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (mode === "edit" && row) {
      return Object.fromEntries(
        columns.map((c) => [
          c.name,
          row[c.name] == null ? "" : String(row[c.name]),
        ])
      );
    }
    return Object.fromEntries(columns.map((c) => [c.name, ""]));
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: Record<string, unknown> = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v])
      );
      if (mode === "add") {
        await invoke.insertRow(tableName, data);
      } else if (mode === "edit" && row) {
        const { [pkColumn]: _pk, ...rest } = data;
        await invoke.updateRow(tableName, pkColumn, row[pkColumn], rest);
      }
      onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!row) return;
    setLoading(true);
    try {
      await invoke.deleteRow(tableName, pkColumn, row[pkColumn]);
      onDone();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  if (mode === "delete") {
    return (
      <AlertDialog open onOpenChange={onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              ลบแถวที่ {pkColumn} = {String(row?.[pkColumn])} ใช่หรือไม่?
              ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? "กำลังลบ..." : "ลบ"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "เพิ่มแถวใหม่" : "แก้ไขแถว"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {columns.map((col) => (
            <div key={col.name} className="grid gap-1.5">
              <Label
                htmlFor={`field-${col.name}`}
                className="flex items-center gap-1.5"
              >
                {col.name}
                <span className="text-xs text-muted-foreground font-normal">
                  ({col.data_type})
                </span>
                {col.key === "PRI" && (
                  <span className="text-xs text-amber-500">PK</span>
                )}
              </Label>
              <Input
                id={`field-${col.name}`}
                value={form[col.name] ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [col.name]: e.target.value }))
                }
                disabled={mode === "edit" && col.key === "PRI"}
                placeholder={col.is_nullable ? "NULL" : ""}
              />
            </div>
          ))}
          {error && (
            <p className="text-sm text-destructive rounded px-3 py-2 bg-destructive/10">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
