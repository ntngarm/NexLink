import SqlEditor from "@/components/sql/SqlEditor";
import { Code2 } from "lucide-react";

export default function SqlEditorPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">SQL Editor</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <SqlEditor />
      </div>
    </div>
  );
}
