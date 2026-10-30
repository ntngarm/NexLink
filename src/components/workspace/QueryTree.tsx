import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronRight, FileCode2, Folder, FolderOpen, FolderPlus, RefreshCw, Trash2 } from "lucide-react";
import { invoke } from "@/lib/invoke";
import type { QueryNode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fileTitle, useWorkspace } from "./WorkspaceContext";

/** รายการโฟลเดอร์และไฟล์ query ที่บันทึกไว้ (แสดงใน sidebar) */
export function QueryTree() {
  const navigate = useNavigate();
  const { openQuery, activeTab, queriesVersion, refreshQueries } = useWorkspace();
  const [nodes, setNodes] = useState<QueryNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newFolderIn, setNewFolderIn] = useState<string | null>(null); // "" = โฟลเดอร์หลัก
  const [folderName, setFolderName] = useState("");
  const [deleting, setDeleting] = useState<QueryNode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke.listQueries().then(setNodes).catch((e) => setError(String(e)));
  }, [queriesVersion]);

  const activePath = activeTab?.kind === "query" ? activeTab.path : undefined;

  const toggle = (path: string) =>
    setExpanded((p) => {
      const next = new Set(p);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const openFile = async (node: QueryNode) => {
    try {
      const sql = await invoke.readQuery(node.path);
      openQuery({ path: node.path, title: fileTitle(node.path), sql });
      navigate("/workspace");
    } catch (e) {
      setError(String(e));
    }
  };

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name || newFolderIn === null) return;
    const path = newFolderIn ? `${newFolderIn}/${name}` : name;
    try {
      await invoke.createQueryFolder(path);
      if (newFolderIn) setExpanded((p) => new Set(p).add(newFolderIn));
      setNewFolderIn(null);
      refreshQueries();
    } catch (e) {
      setError(String(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await invoke.deleteQueryItem(deleting.path);
      refreshQueries();
    } catch (e) {
      setError(String(e));
    } finally {
      setDeleting(null);
    }
  };

  const renderNode = (node: QueryNode, depth: number) => {
    const open = expanded.has(node.path);
    const active = !node.is_dir && node.path === activePath;
    return (
      <div key={node.path}>
        <div
          onClick={() => (node.is_dir ? toggle(node.path) : openFile(node))}
          title={node.path}
          style={{ paddingLeft: 8 + depth * 12 }}
          className={cn(
            "group flex items-center gap-1.5 w-full pr-1 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors",
            active
              ? "bg-sidebar-accent text-sidebar-foreground font-medium"
              : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80"
          )}
        >
          {node.is_dir ? (
            <>
              <ChevronRight className={cn("h-3 w-3 shrink-0 opacity-50 transition-transform", open && "rotate-90")} />
              {open ? <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" /> : <Folder className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </>
          ) : (
            <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-50 ml-[18px]" />
          )}
          <span className="truncate flex-1">{node.is_dir ? node.name : fileTitle(node.name)}</span>
          <span className="hidden group-hover:flex items-center shrink-0">
            {node.is_dir && (
              <button
                className="p-0.5 rounded hover:bg-muted"
                title="สร้างโฟลเดอร์ย่อย"
                onClick={(e) => { e.stopPropagation(); setFolderName(""); setNewFolderIn(node.path); }}
              >
                <FolderPlus className="h-3 w-3" />
              </button>
            )}
            <button
              className="p-0.5 rounded hover:bg-muted text-destructive"
              title="ลบ"
              onClick={(e) => { e.stopPropagation(); setDeleting(node); }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        </div>
        {node.is_dir && open && node.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-0.5 px-2 pb-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" title="สร้างโฟลเดอร์"
          onClick={() => { setFolderName(""); setNewFolderIn(""); }}>
          <FolderPlus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="เปิดโฟลเดอร์ใน Explorer"
          onClick={() => invoke.openQueriesFolder().catch((e) => setError(String(e)))}>
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="รีเฟรช" onClick={refreshQueries}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
      {error && <p className="px-3 pb-1 text-[10px] text-destructive break-all">{error}</p>}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-2 pb-2">
          {nodes.map((n) => renderNode(n, 0))}
          {nodes.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              ยังไม่มี query ที่บันทึกไว้ เปิดแท็บ Query แล้วกด บันทึก
            </p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={newFolderIn !== null} onOpenChange={() => setNewFolderIn(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>สร้างโฟลเดอร์{newFolderIn ? ` ใน ${newFolderIn}` : ""}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="ชื่อโฟลเดอร์"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderIn(null)}>ยกเลิก</Button>
            <Button disabled={!folderName.trim() || /[\\/:*?"<>|]/.test(folderName)} onClick={createFolder}>สร้าง</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ{deleting?.is_dir ? "โฟลเดอร์" : "ไฟล์"} "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.is_dir ? "query ทั้งหมดในโฟลเดอร์นี้จะถูกลบด้วย " : ""}ลบแล้วกู้คืนไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
