import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Truck, Cpu, RefreshCw, CheckCircle, Split, MapPin, Layers } from "lucide-react"

export default function Fulfillment() {
  const [fulfillments, setFulfillments] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [consolidatingId, setConsolidatingId] = useState<string | null>(null)

  const fetchFulfillments = async () => {
    setLoading(true)
    try {
      const res = await api.get("/fulfillment/?limit=50")
      setFulfillments(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load fulfillments", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFulfillments()
  }, [])

  const handleConsolidate = async (id: string) => {
    setConsolidatingId(id)
    try {
      const res = await api.post(`/fulfillment/${id}/consolidate-backorder`, {})
      alert(res.data.message)
      fetchFulfillments()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to consolidate backorder")
    } finally {
      setConsolidatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Multi-Warehouse Fulfillment & Auto-Split</h2>
          <p className="text-sm text-muted-foreground">Google OR-Tools MILP logistics optimizer with split delivery tracking and backorder consolidation</p>
        </div>
        <button
          onClick={fetchFulfillments}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Fulfillment Records Grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
          <span className="font-semibold text-sm">Active Shipments & Order Splits ({total} Orders)</span>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Loading warehouse fulfillment logs...</div>
          ) : fulfillments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No fulfillment records found.</div>
          ) : (
            fulfillments.map((f) => (
              <div key={f.id} className="p-5 hover:bg-accent/10 transition-colors space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Truck className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-base flex items-center gap-2">
                        {f.deal_number || "Deal Fulfillment"} • {f.customer_name}
                      </h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {f.delivery_address || "Standard Domestic Shipping"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block font-semibold">Shipping Cost</span>
                      <span className="font-bold text-sm">₹{f.total_shipping_cost.toLocaleString("en-IN")}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs uppercase font-bold ${
                      f.status === "delivered" ? "bg-emerald-100 text-emerald-800" : f.status === "consolidated" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                    }`}>
                      {f.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Warehouse Split Lines */}
                {f.lines?.length > 0 && (
                  <div className="bg-accent/30 rounded-lg p-3 space-y-2 text-xs">
                    <span className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" /> Warehouse Stock Allocation & Shipment Split
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {f.lines.map((l: any) => (
                        <div key={l.id} className="p-2 rounded border border-border bg-card flex justify-between items-center">
                          <div>
                            <span className="font-semibold block">{l.product_name} (×{l.quantity})</span>
                            <span className="text-muted-foreground text-[10px]">{l.warehouse_name}</span>
                          </div>
                          <span className="font-bold text-muted-foreground">₹{l.shipping_cost}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <span>Confidence: <strong>{((f.delivery_confidence || 0.95) * 100).toFixed(0)}%</strong> • Est. Delivery: {f.estimated_delivery ? new Date(f.estimated_delivery).toLocaleDateString() : "2-4 days"}</span>
                  {f.status !== "consolidated" && (
                    <button
                      onClick={() => handleConsolidate(f.id)}
                      disabled={consolidatingId === f.id}
                      className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 font-semibold rounded-md transition-colors"
                    >
                      {consolidatingId === f.id ? "Consolidating..." : "Consolidate Backorders to Central Hub"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
