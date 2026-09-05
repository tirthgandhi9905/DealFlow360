import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { Package, Truck, CheckCircle2, Clock } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function Fulfillment() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = () => {
    setLoading(true)
    api
      .get("/fulfillment/", { params: { limit: 100 } })
      .then((r) => setOrders(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load fulfillment"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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
    { header: "Splits", cell: (r: any) => <span className="text-muted-foreground">{r.lines?.length || 0} warehouse(s)</span> },
    { header: "Shipping Cost", cell: (r: any) => <span className="font-medium">{inr(r.total_shipping_cost)}</span> },
    { header: "Confidence", cell: (r: any) => <span className="text-xs text-muted-foreground">{r.delivery_confidence ? `${(r.delivery_confidence * 100).toFixed(0)}%` : "—"}</span> },
    { header: "ETA", cell: (r: any) => <span className="text-muted-foreground text-xs">{r.estimated_delivery ? new Date(r.estimated_delivery).toLocaleDateString() : "—"}</span> },
    { header: "Status", cell: (r: any) => getStatusBadge(r.status) },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Fulfillment Operations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">MILP-optimized multi-warehouse split shipments</p>
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
            <p className="text-sm font-medium text-muted-foreground">Processing</p>
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
            <p className="text-sm font-medium text-muted-foreground">In Transit</p>
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
            <p className="text-sm font-medium text-muted-foreground">Delivered</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading fulfillment queue...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={orders} columns={columns} />
        )}
      </div>
    </div>
  )
}
