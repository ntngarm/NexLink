import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";

interface Props {
  column: string;
  sortColumn?: string;
  sortDir?: "ASC" | "DESC";
  onSort: (col: string) => void;
}

export default function ColumnHeader({
  column,
  sortColumn,
  sortDir,
  onSort,
}: Props) {
  const active = sortColumn === column;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 font-medium"
      onClick={() => onSort(column)}
    >
      {column}
      {active ? (
        sortDir === "ASC" ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40" />
      )}
    </Button>
  );
}
