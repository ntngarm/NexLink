import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import { UpdateChecker } from "@/components/UpdateChecker";
import ConnectionPage from "@/pages/ConnectionPage";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceContext";
import TopicsCustomPage from "@/pages/TopicsCustomPage";
import Topics43Page from "@/pages/Topics43Page";
import { useState, useEffect } from "react";
import { invoke } from "@/lib/invoke";

export default function App() {
  const [connectedDb, setConnectedDb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionKey, setConnectionKey] = useState(0);

  useEffect(() => {
    invoke.autoConnect()
      .then((db) => { if (db) setConnectedDb(db); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">กำลังเชื่อมต่อ...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <UpdateChecker />
      <Routes>
        <Route
          path="/"
          element={
            connectedDb ? (
              <Navigate to="/topics/43" replace />
            ) : (
              <ConnectionPage onConnected={setConnectedDb} />
            )
          }
        />
        <Route
          path="/*"
          element={
            connectedDb ? (
              // เปลี่ยน key เมื่อสลับการเชื่อมต่อ ให้ทุกหน้า (รวมถึงแท็บที่เปิดไว้) โหลดข้อมูลของฐานใหม่
              <WorkspaceProvider key={connectionKey}>
              <AppShell
                connectedDb={connectedDb}
                onDisconnect={() => setConnectedDb(null)}
                onSwitched={(db) => {
                  setConnectedDb(db);
                  setConnectionKey((k) => k + 1);
                }}
              >
                <Routes>
                  {/* แท็บตาราง/Query แสดงโดย AppShell เอง */}
                  <Route path="/workspace" element={null} />
                  <Route path="/table/*" element={<Navigate to="/workspace" replace />} />
                  <Route path="/sql" element={<Navigate to="/workspace" replace />} />
                  <Route path="/topics/custom" element={<TopicsCustomPage />} />
                  <Route path="/topics/43" element={<Topics43Page />} />
                  <Route path="/topics" element={<Navigate to="/topics/43" replace />} />
                  <Route path="*" element={<Navigate to="/topics/43" replace />} />
                </Routes>
              </AppShell>
              </WorkspaceProvider>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </HashRouter>
  );
}
