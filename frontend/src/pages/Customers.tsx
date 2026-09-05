import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Users } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

const TIER_STYLES: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-slate-200 text-slate-700",
  bronze: "bg-amber-100 text-amber-800",
  platinum: "bg-purple-100 text-purple-800",
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api
      .get("/customers/", { params: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, search: search || undefined } })
      .then((r) => { setCustomers(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load customers"))
      .finally(() => setLoading(false))
  }, [page, search])

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
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Click any row for the full 360° customer view</p>
        </div>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name, email, industry..." />
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading customers...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={customers} columns={columns} onRowClick={(row) => navigate(`/customers/${row.id}`)} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
