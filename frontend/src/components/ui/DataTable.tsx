import { ReactNode, useState, useMemo } from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ColumnDef<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  isLoading?: boolean;
  sortKey?: string;
  sortDirection?: "asc" | "desc" | null;
  onSort?: (key: string) => void;
}

export function DataTable<T>({ 
  data, 
  columns, 
  onRowClick, 
  className, 
  isLoading,
  sortKey,
  sortDirection,
  onSort
}: DataTableProps<T>) {
  const [internalSortKey, setInternalSortKey] = useState<string | null>(null)
  const [internalSortDir, setInternalSortDir] = useState<"asc" | "desc">("asc")

  const currentSortKey = sortKey !== undefined ? sortKey : internalSortKey
  const currentSortDir = sortDirection !== undefined ? sortDirection : internalSortDir

  const handleHeaderClick = (key: string) => {
    if (onSort) {
      onSort(key)
    } else {
      if (internalSortKey === key) {
        setInternalSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        setInternalSortKey(key)
        setInternalSortDir("asc")
      }
    }
  }

  const sortedData = useMemo(() => {
    if (onSort || !currentSortKey) return data

    return [...data].sort((a: any, b: any) => {
      let valA = a[currentSortKey]
      let valB = b[currentSortKey]

      if (valA === undefined || valA === null) valA = ""
      if (valB === undefined || valB === null) valB = ""

      let comparison = 0
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
      }

      return currentSortDir === "asc" ? comparison : -comparison
    })
  }, [data, currentSortKey, currentSortDir, onSort])

  return (
    <div className={cn("w-full overflow-auto border border-border rounded-lg bg-surface", className)}>
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-muted-foreground uppercase bg-slate-50 border-b border-border">
          <tr>
            {columns.map((col, i) => {
              const isSortable = col.sortable ?? (col.accessorKey !== undefined || col.sortKey !== undefined);
              const key = col.sortKey || (col.accessorKey ? String(col.accessorKey) : "");
              const isActive = Boolean(isSortable && currentSortKey === key);

              return (
                <th 
                  key={i} 
                  className={cn(
                    "px-4 py-3 font-medium transition-colors select-none",
                    isSortable && "cursor-pointer hover:bg-slate-100 hover:text-foreground",
                    isActive && "text-primary font-semibold bg-primary/5",
                    col.className
                  )}
                  onClick={() => {
                    if (isSortable && key) {
                      handleHeaderClick(key)
                    }
                  }}
                  title={isSortable ? `Sort by ${col.header}` : undefined}
                >
                  <div className="flex items-center gap-1.5 inline-flex group">
                    <span>{col.header}</span>
                    {isSortable && (
                      <span className="inline-flex items-center transition-all">
                        {isActive ? (
                          currentSortDir === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
                          )
                        ) : (
                          <ArrowDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-primary transition-opacity" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skel-${i}`}>
                {columns.map((_, j) => (
                  <td key={`skel-td-${j}`} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                No data available
              </td>
            </tr>
          ) : (
            sortedData.map((row, i) => (
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
