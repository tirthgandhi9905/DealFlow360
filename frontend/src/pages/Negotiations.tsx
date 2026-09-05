import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { Handshake, ExternalLink } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function Negotiations() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .get("/negotiations/", { params: { limit: 100 } })
      .then((r) => setItems(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load negotiations"))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    {
      header: "Deal",
      cell: (r: any) => (
        <div>
          <div className="font-medium text-foreground">{r.customer_name}</div>
          <div className="text-xs text-muted-foreground">{r.deal_number}</div>
        </div>
      ),
    },
    { header: "Tier", cell: (r: any) => <span className="text-xs uppercase text-muted-foreground">{r.customer_tier}</span> },
    { header: "Round", cell: (r: any) => <span className="font-medium">#{r.round_count}</span> },
    { header: "Deal Amount", cell: (r: any) => <span className="font-medium">{inr(r.deal_amount)}</span> },
    { header: "Margin", cell: (r: any) => <span className={r.deal_margin >= 30 ? "text-success" : "text-warning"}>{r.deal_margin?.toFixed(1)}%</span> },
    {
      header: "Concession Budget",
      cell: (r: any) => (
        <div className="text-xs">
          <div className="text-muted-foreground">Used: {inr(r.concession_budget?.used || 0)}</div>
          <div className="text-success">Left: {inr(r.concession_budget?.remaining || 0)}</div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (r: any) => (
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${r.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>
          {r.status}
        </span>
      ),
    },
    {
      header: "Portal",
      cell: (r: any) => (
        <Link
          to={`/portal/${r.deal_id}`}
          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1"
        >
          Open <ExternalLink className="w-3 h-3" />
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            Active Negotiations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live counter-proposals and concession tracking</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading negotiations...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={items} columns={columns} />
        )}
      </div>
    </div>
  )
}
