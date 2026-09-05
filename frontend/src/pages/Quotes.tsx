import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { Plus } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get("/quotes/")
      .then((r) => setQuotes(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load quotes"))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: "Quote #", accessorKey: "quote_number" as const, className: "font-medium text-foreground" },
    { header: "Deal #", accessorKey: "deal_number" as const, className: "text-muted-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    { header: "Version", cell: (r: any) => `v${r.version}` },
    { header: "Subtotal", cell: (r: any) => <span className="text-muted-foreground">{inr(r.subtotal)}</span> },
    { header: "Discount", cell: (r: any) => <span className="text-success">-{inr(r.total_discount)}</span> },
    { header: "Grand Total", cell: (r: any) => <span className="font-semibold">{inr(r.grand_total)}</span> },
    { header: "Created", cell: (r: any) => <span className="text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Quotations</h2>
          <p className="text-sm text-muted-foreground mt-1">All quotes generated across deals</p>
        </div>
        <button
          onClick={() => navigate("/quotes/new")}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading quotations...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={quotes} columns={columns} />
        )}
      </div>
    </div>
  )
}
