import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  returned: "bg-info/10 text-info",
}

export default function Approvals() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<string>("pending")
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    const params: any = { limit: 100 }
    if (filter) params.status = filter
    api
      .get("/approvals/", { params })
      .then((r) => setApprovals(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load approvals"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const columns = [
    { header: "Deal #", accessorKey: "deal_number" as const, className: "font-medium text-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    { header: "Tier", cell: (r: any) => <span className="text-xs uppercase text-muted-foreground">{r.customer_tier}</span> },
    { header: "Sales Rep", cell: (r: any) => <span className="text-muted-foreground">{r.sales_rep_name}</span> },
    { header: "Amount", cell: (r: any) => <span className="font-medium">{inr(r.deal_amount)}</span> },
    { header: "Margin", cell: (r: any) => <span className={r.deal_margin >= 30 ? "text-success" : r.deal_margin >= 15 ? "text-warning" : "text-destructive"}>{r.deal_margin?.toFixed(1)}%</span> },
    {
      header: "Risk",
      cell: (r: any) => (
        <span className={r.risk_score > 60 ? "text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded" : r.risk_score > 30 ? "text-warning font-medium bg-warning/10 px-2 py-0.5 rounded" : "text-success font-medium bg-success/10 px-2 py-0.5 rounded"}>
          {r.risk_score}/100
        </span>
      ),
    },
    { header: "Required", cell: (r: any) => <span className="text-xs text-muted-foreground capitalize">{String(r.required_level || "").replace(/_/g, " ")}</span> },
    { header: "Status", cell: (r: any) => <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[r.status] || "bg-muted"}`}>{r.status}</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Approvals Queue</h2>
          <p className="text-sm text-muted-foreground mt-1">Review deals requiring authorization</p>
        </div>
        <div className="flex gap-2 text-sm">
          {["pending", "approved", "rejected", ""].map((f) => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-white border border-border text-muted-foreground hover:bg-slate-50"}`}
            >
              {f || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading queue...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={approvals} columns={columns} onRowClick={(row) => navigate(`/approvals/${row.id}`)} />
        )}
      </div>
    </div>
  )
}
