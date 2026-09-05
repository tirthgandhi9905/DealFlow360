import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Package, Truck, CheckCircle2, Clock } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

export default function Fulfillment() {
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    const params: any = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    api
      .get("/fulfillment/", { params })
      .then((r) => { setOrders(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load fulfillment"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "fulfilled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> {status}</span>
      case "in_transit":
      case "shipped":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-info/10 text-info"><Truck className="w-3.5 h-3.5" /> {status}</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning"><Clock className="w-3.5 h-3.5" /> {status}</span>
    }
  }

  const columns = [
    { header: "Deal", accessorKey: "deal_number" as const, className: "font-medium text-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    {
      header: "Warehouse Split",
      cell: (r: any) => {
        const lines = r.lines || []
        // count DISTINCT warehouses (a single deal may have >1 lines from same warehouse)
        const uniqueWarehouses = new Set(lines.map((l: any) => l.warehouse_name)).size
        if (lines.length === 0) {
          return <span className="text-xs text-muted-foreground italic">Not yet allocated</span>
        }
        return (
          <div className="text-xs">
            <div className="font-medium text-foreground">{uniqueWarehouses} warehouse{uniqueWarehouses !== 1 ? "s" : ""}</div>
            <div className="text-muted-foreground">{lines.length} line{lines.length !== 1 ? "s" : ""}</div>
          </div>
        )
      },
    },
    { header: "Shipping Cost", cell: (r: any) => <span className="font-medium">{inr(r.total_shipping_cost)}</span> },
    { header: "Confidence", cell: (r: any) => <span className="text-xs text-muted-foreground">{r.delivery_confidence ? `${(r.delivery_confidence * 100).toFixed(0)}%` : "—"}</span> },
    { header: "ETA", cell: (r: any) => <span className="text-muted-foreground text-xs">{r.estimated_delivery ? new Date(r.estimated_delivery).toLocaleDateString() : "—"}</span> },
    { header: "Status", cell: (r: any) => getStatusBadge(r.status) },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Fulfillment Operations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">MILP-optimized multi-warehouse split shipments</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search deal or customer..." />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-warning shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter((o) => ["processing", "pending"].includes(String(o.status))).length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Processing (this page)</p>
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-info shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter((o) => ["in_transit", "shipped"].includes(String(o.status))).length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">In Transit (this page)</p>
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-success shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter((o) => ["delivered", "fulfilled"].includes(String(o.status))).length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Delivered (this page)</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading fulfillment queue...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={orders} columns={columns} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
