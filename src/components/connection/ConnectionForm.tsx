import { useState } from "react";
import { invoke } from "@/lib/invoke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectionConfig } from "@/lib/types";

interface Props {
  initial?: Partial<ConnectionConfig>;
  onConnected: (db: string) => void;
}

export default function ConnectionForm({ initial, onConnected }: Props) {
  const [form, setForm] = useState<ConnectionConfig>({
    host: initial?.host ?? "localhost",
    port: initial?.port ?? 3306,
    username: initial?.username ?? "root",
    password: initial?.password ?? "",
    database: initial?.database ?? "",
  });
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [profileName, setProfileName] = useState("");
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof ConnectionConfig) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({
        ...f,
        [k]: k === "port" ? Number(e.target.value) : e.target.value,
      }));

  const handleTest = async () => {
    setTesting(true);
    setStatus(null);
    try {
      const msg = await invoke.testConnection(form);
      setStatus({ ok: true, msg });
    } catch (e) {
      setStatus({ ok: false, msg: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setStatus(null);
    try {
      await invoke.connectToDb(form);
      onConnected(form.database);
    } catch (e) {
      setStatus({ ok: false, msg: String(e) });
      setConnecting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    setSaving(true);
    try {
      await invoke.saveProfile(
        {
          name: profileName.trim(),
          host: form.host,
          port: form.port,
          username: form.username,
          database: form.database,
        },
        form.password
      );
      setStatus({ ok: true, msg: `บันทึก "${profileName}" สำเร็จ` });
      setProfileName("");
    } catch (e) {
      setStatus({ ok: false, msg: String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 grid gap-1.5">
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            value={form.host}
            onChange={set("host")}
            placeholder="localhost"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            type="number"
            value={form.port}
            onChange={set("port")}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="user">Username</Label>
        <Input id="user" value={form.username} onChange={set("username")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pass">Password</Label>
        <Input
          id="pass"
          type="password"
          value={form.password}
          onChange={set("password")}
          autoComplete="current-password"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="db">Database</Label>
        <Input
          id="db"
          value={form.database}
          onChange={set("database")}
          placeholder="ชื่อฐานข้อมูล"
        />
      </div>

      {status && (
        <p
          className={`text-sm rounded-md px-3 py-2 ${
            status.ok
              ? "bg-green-500/10 text-green-600 dark:text-green-400"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {status.msg}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={testing || connecting}
          className="flex-1"
        >
          {testing ? "กำลังทดสอบ..." : "ทดสอบ"}
        </Button>
        <Button
          onClick={handleConnect}
          disabled={connecting || testing || !form.database}
          className="flex-1"
        >
          {connecting ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อ"}
        </Button>
      </div>

      {/* Save profile */}
      <div className="flex gap-2 pt-1 border-t">
        <Input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          placeholder="ชื่อ profile เพื่อบันทึก"
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveProfile}
          disabled={saving || !profileName.trim()}
        >
          {saving ? "บันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
