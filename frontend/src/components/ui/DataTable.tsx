import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T>({ data, columns, onRowClick, className }: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto border border-border rounded-lg bg-surface", className)}>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b border-border">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={cn("px-4 py-3 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr 
                key={i} 
                className={cn(
                  "hover:bg-slate-50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, j) => (
                  <td key={j} className={cn("px-4 py-3 whitespace-nowrap", col.className)}>
                    {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey]) : null)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
