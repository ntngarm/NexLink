import { useEffect, useState } from "react";
import { invoke } from "@/lib/invoke";
import type { ConnectionProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plug } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface Props {
  onSelect: (profile: ConnectionProfile) => void;
}

export default function ProfileList({ onSelect }: Props) {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);

  const load = async () =>
    setProfiles(await invoke.loadProfiles().catch(() => []));

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (name: string) => {
    await invoke.deleteProfile(name);
    load();
  };

  if (profiles.length === 0) return null;

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-muted-foreground">
        Saved Connections
      </p>
      {profiles.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-2 rounded-lg border px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {p.username}@{p.host}:{p.port}/{p.database}
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {p.database}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onSelect(p)}
            title="เชื่อมต่อ"
          >
            <Plug className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                title="ลบ"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ลบ Connection?</AlertDialogTitle>
                <AlertDialogDescription>
                  ลบ "{p.name}" ออกจากรายการ
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(p.name)}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  ลบ
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
}
