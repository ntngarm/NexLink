import { useParams } from "react-router-dom";
import DataTable from "@/components/table/DataTable";
import { Table2 } from "lucide-react";

export default function TablePage() {
  const { tableName } = useParams();

  if (!tableName) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Table2 className="h-12 w-12 opacity-20" />
        <p className="text-sm">เลือกตารางจาก Sidebar ทางซ้าย</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b">
        <Table2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{tableName}</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <DataTable tableName={tableName} />
      </div>
    </div>
  );
}
