import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { Users } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const TIER_STYLES: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-slate-200 text-slate-700",
  bronze: "bg-amber-100 text-amber-800",
  platinum: "bg-purple-100 text-purple-800",
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .get("/customers/", { params: { limit: 100 } })
      .then((r) => setCustomers(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load customers"))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: "Name", accessorKey: "name" as const, className: "font-medium text-foreground" },
    { header: "Email", accessorKey: "email" as const, className: "text-muted-foreground" },
    { header: "Industry", cell: (r: any) => <span className="text-muted-foreground">{r.industry || "—"}</span> },
    { header: "Tier", cell: (r: any) => {
      const tier = String(r.tier || "").toLowerCase()
      return <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[tier] || "bg-slate-100 text-slate-600"}`}>{tier.toUpperCase() || "—"}</span>
    }},
    { header: "Lifetime Value", cell: (r: any) => <span className="font-medium">{inr(r.lifetime_value || 0)}</span> },
    { header: "Phone", cell: (r: any) => <span className="text-muted-foreground">{r.phone || "—"}</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">B2B accounts across all tiers</p>
        </div>
        <div className="text-sm text-muted-foreground">{customers.length} customers</div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading customers...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={customers} columns={columns} />
        )}
      </div>
    </div>
  )
}
