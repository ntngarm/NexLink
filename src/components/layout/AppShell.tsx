import { ReactNode, useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { requestUpdateCheck } from "@/components/UpdateChecker";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Code2, LogOut, Send, ListPlus, FileStack, ChevronDown, ArrowLeftRight } from "lucide-react";
import { SwitchConnectionDialog } from "./SwitchConnectionDialog";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import WorkspacePage from "@/pages/WorkspacePage";
import { useNavigate, useLocation } from "react-router-dom";
import { invoke } from "@/lib/invoke";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  connectedDb: string;
  onDisconnect: () => void;
  onSwitched: (database: string) => void;
}

export default function AppShell({ children, connectedDb, onDisconnect, onSwitched }: Props) {
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = useState("");
  const [switchOpen, setSwitchOpen] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setDark(isDark);
  };

  const handleDisconnect = async () => {
    await invoke.disconnect();
    onDisconnect();
  };

  const inTopics = location.pathname.startsWith("/topics");
  const inWorkspace = location.pathname === "/workspace";
  const { activeTab, focusQuery } = useWorkspace();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="flex flex-col w-56 border-r bg-sidebar text-sidebar-foreground shrink-0">
        {/* DB header */}
        <button
          onClick={() => setSwitchOpen(true)}
          title="เปลี่ยนการเชื่อมต่อ"
          className="flex items-center gap-2 px-4 py-3 border-b border-sidebar-border text-left hover:bg-sidebar-accent/60 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
            DB
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{connectedDb}</p>
            <p className="text-[10px] text-muted-foreground">MySQL · เปลี่ยนการเชื่อมต่อ</p>
          </div>
          <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </button>

        <SwitchConnectionDialog
          open={switchOpen}
          onClose={() => setSwitchOpen(false)}
          onSwitched={onSwitched}
          onNew={handleDisconnect}
        />

        {/* Nav */}
        <div className="flex flex-col gap-0.5 p-2">
          {/* ส่งข้อมูล — tree parent */}
          <Button
            variant={inTopics ? "secondary" : "ghost"}
            size="sm"
            className="justify-start gap-2 h-8"
            onClick={() => navigate("/topics/43")}
          >
            <Send className="h-4 w-4" />
            <span className="flex-1 text-left">ส่งข้อมูล</span>
            {inTopics && <ChevronDown className="h-3 w-3 opacity-50" />}
          </Button>

          {/* tree children — แสดงเมื่ออยู่ใน /topics */}
          {inTopics && (
            <div className="flex flex-col gap-0.5 pl-4 border-l border-sidebar-border ml-4">
              <button
                onClick={() => navigate("/topics/43")}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                  location.pathname === "/topics/43"
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70"
                )}
              >
                <FileStack className="h-3.5 w-3.5 shrink-0 opacity-60" />
                43 แฟ้มมาตรฐาน
              </button>
              <button
                onClick={() => navigate("/topics/custom")}
                className={cn(
                  "flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors",
                  location.pathname === "/topics/custom"
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70"
                )}
              >
                <ListPlus className="h-3.5 w-3.5 shrink-0 opacity-60" />
                หัวข้อกำหนดเอง
              </button>
            </div>
          )}

          <Button
            variant={inWorkspace && activeTab?.kind === "query" ? "secondary" : "ghost"}
            size="sm"
            className="justify-start gap-2 h-8"
            onClick={() => { focusQuery(); navigate("/workspace"); }}
          >
            <Code2 className="h-4 w-4" />
            SQL Editor
          </Button>
        </div>

        {/* Table list — ซ่อนเมื่ออยู่ใน /topics */}
        {!inTopics && (
          <div className="flex-1 overflow-hidden border-t border-sidebar-border mt-1">
            <Sidebar />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-2 border-t border-sidebar-border">
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={toggleTheme} title="สลับ Dark/Light"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <button
            className="text-[10px] text-muted-foreground hover:text-sidebar-foreground"
            onClick={requestUpdateCheck} title="ตรวจสอบอัปเดต"
          >
            v{version}
          </button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={handleDisconnect} title="ตัดการเชื่อมต่อ"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* แท็บตาราง/Query render ค้างไว้ตลอด เพื่อให้สลับไปหน้าอื่นแล้วกลับมา ข้อมูลไม่หาย */}
        <div className={cn("h-full", !inWorkspace && "hidden")}>
          <WorkspacePage />
        </div>
        {!inWorkspace && children}
      </main>
    </div>
  );
}
