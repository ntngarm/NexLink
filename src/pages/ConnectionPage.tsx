import { useState } from "react";
import ConnectionForm from "@/components/connection/ConnectionForm";
import ProfileList from "@/components/connection/ProfileList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ConnectionProfile } from "@/lib/types";
import { invoke } from "@/lib/invoke";

interface Props {
  onConnected: (db: string) => void;
}

export default function ConnectionPage({ onConnected }: Props) {
  const [initialConfig, setInitialConfig] = useState<
    Partial<{
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    }>
  >({});

  const handleProfileSelect = async (profile: ConnectionProfile) => {
    try {
      await invoke.connectFromProfile(profile.name);
      onConnected(profile.database);
    } catch {
      // Keyring lookup failed — pre-fill form so user can enter password
      setInitialConfig({
        host: profile.host,
        port: profile.port,
        username: profile.username,
        database: profile.database,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
            DB
          </div>
          <div>
            <h1 className="text-xl font-semibold">MySQL Manager</h1>
            <p className="text-sm text-muted-foreground">
              NexLink · เชื่อมต่อฐานข้อมูล
            </p>
          </div>
        </div>

        <ProfileList onSelect={handleProfileSelect} />

        <Separator />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">เชื่อมต่อใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectionForm initial={initialConfig} onConnected={onConnected} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
