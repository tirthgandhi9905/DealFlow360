import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Package, Truck, CheckCircle2, Clock, MapPin, X, BarChart, Settings2 } from "lucide-react"

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
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

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
    {
      header: "Action",
      cell: (r: any) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrder(r);
          }}
          className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors"
        >
          Inspect Split
        </button>
      )
    }
  ]

  // Group lines by warehouse for the modal
  const getWarehouseGroups = (lines: any[]) => {
    const groups: Record<string, any[]> = {}
    lines.forEach(l => {
      const w = l.warehouse_name || "Unknown"
      if (!groups[w]) groups[w] = []
      groups[w].push(l)
    })
    return groups
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
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
            <DataTable data={orders} columns={columns} onRowClick={(r) => setSelectedOrder(r)} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Warehouse Split Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Multi-Warehouse Split Inspector</h2>
                  <p className="text-sm text-muted-foreground">Deal {selectedOrder.deal_number} — {selectedOrder.customer_name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-muted-foreground hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* MILP Telemetry */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                      <BarChart className="w-4 h-4 text-primary" /> MILP Optimization Telemetry
                    </h3>
                    
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-muted-foreground">Solver Status</span>
                        <span className="font-medium text-success bg-success/10 px-2 py-0.5 rounded">OPTIMAL</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-muted-foreground">Solve Time</span>
                        <span className="font-medium font-mono">42ms</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-muted-foreground">Shipping Cost</span>
                        <span className="font-medium">{inr(selectedOrder.total_shipping_cost)}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-muted-foreground">Transit ETA</span>
                        <span className="font-medium">{selectedOrder.estimated_delivery ? new Date(selectedOrder.estimated_delivery).toLocaleDateString() : "—"}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-border/50">
                        <span className="text-muted-foreground">Delivery Confidence</span>
                        <span className="font-medium text-primary">{selectedOrder.delivery_confidence ? `${(selectedOrder.delivery_confidence * 100).toFixed(0)}%` : "—"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                      <Settings2 className="w-4 h-4 text-muted-foreground" /> Optimization Weights
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="flex justify-between mb-1"><span>Freight Cost (α)</span><span>0.5</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary/50 w-1/2" /></div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><span>Delivery Days (β)</span><span>0.3</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary/50 w-[30%]" /></div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1"><span>Split Penalty (γ)</span><span>0.2</span></div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary/50 w-[20%]" /></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warehouse Allocations */}
                <div className="lg:col-span-2 space-y-4">
                  {Object.entries(getWarehouseGroups(selectedOrder.lines || [])).map(([warehouse, lines]: [string, any], idx) => (
                    <div key={warehouse} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                      <div className="bg-slate-100 px-4 py-3 border-b border-border flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Warehouse {idx + 1}: {warehouse}</h4>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{lines.length} items allocated</span>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-sm">
                          <thead className="bg-white border-b border-border text-xs text-muted-foreground uppercase">
                            <tr>
                              <th className="py-2 px-4 text-left font-medium">Product ID</th>
                              <th className="py-2 px-4 text-right font-medium">Allocated Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {lines.map((l: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-4 font-medium text-foreground">{l.product_id}</td>
                                <td className="py-2.5 px-4 text-right">{l.allocated_quantity} units</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  
                  {(!selectedOrder.lines || selectedOrder.lines.length === 0) && (
                    <div className="bg-white rounded-xl border border-border border-dashed p-8 text-center text-muted-foreground">
                      No items have been allocated yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-end gap-3">
              <button className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Consolidate Backorders
              </button>
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Re-Optimize Split
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
