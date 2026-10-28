import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import AppShell from "@/components/layout/AppShell";
import ConnectionPage from "@/pages/ConnectionPage";
import TablePage from "@/pages/TablePage";
import SqlEditorPage from "@/pages/SqlEditorPage";
import TopicsCustomPage from "@/pages/TopicsCustomPage";
import Topics43Page from "@/pages/Topics43Page";
import { useState, useEffect } from "react";
import { invoke } from "@/lib/invoke";

export default function App() {
  const [connectedDb, setConnectedDb] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
              <AppShell
                connectedDb={connectedDb}
                onDisconnect={() => setConnectedDb(null)}
              >
                <Routes>
                  <Route path="/table" element={<TablePage />} />
                  <Route path="/table/:tableName" element={<TablePage />} />
                  <Route path="/sql" element={<SqlEditorPage />} />
                  <Route path="/topics/custom" element={<TopicsCustomPage />} />
                  <Route path="/topics/43" element={<Topics43Page />} />
                  <Route path="/topics" element={<Navigate to="/topics/43" replace />} />
                  <Route path="*" element={<Navigate to="/topics/43" replace />} />
                </Routes>
              </AppShell>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </HashRouter>
  );
}
