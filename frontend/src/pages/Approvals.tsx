import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { useCurrency } from "@/context/CurrencyContext"

const PAGE_SIZE = 15

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  returned: "bg-info/10 text-info",
}

export default function Approvals() {
  const { formatAmount } = useCurrency()
  const [approvals, setApprovals] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<string>("pending")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const params: any = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
    if (filter) params.status = filter
    if (search) params.search = search
    api
      .get("/approvals/", { params })
      .then((r) => {
        let items = r.data.items || []
        let tot = r.data.total || 0
        if (search) {
          const q = search.toLowerCase()
          const matches = items.filter((item: any) =>
            item.deal_number?.toLowerCase().includes(q) ||
            item.customer_name?.toLowerCase().includes(q) ||
            item.sales_rep_name?.toLowerCase().includes(q) ||
            item.customer_tier?.toLowerCase().includes(q)
          )
          if (items.length > matches.length) {
            items = matches
            tot = matches.length
          }
        }
        setApprovals(items)
        setTotal(tot)
      })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load approvals"))
      .finally(() => setLoading(false))
  }, [filter, page, search])

  const columns = [
    { header: "Deal #", accessorKey: "deal_number" as const, className: "font-medium text-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    { header: "Tier", cell: (r: any) => <span className="text-xs uppercase text-muted-foreground">{r.customer_tier}</span> },
    { header: "Sales Rep", cell: (r: any) => <span className="text-muted-foreground">{r.sales_rep_name}</span> },
    { header: "Amount", cell: (r: any) => <span className="font-medium">{formatAmount(r.deal_amount)}</span> },
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
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Approvals Queue</h2>
          <p className="text-sm text-muted-foreground mt-1">Review deals requiring authorization</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBox
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search deal #, customer, rep..."
          />
          <div className="flex gap-2 text-sm">
            {["pending", "approved", "rejected", ""].map((f) => (
              <button
                key={f || "all"}
                onClick={() => { setFilter(f); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-white border border-border text-muted-foreground hover:bg-slate-50"}`}
              >
                {f || "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading queue...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={approvals} columns={columns} onRowClick={(row) => navigate(`/approvals/${row.id}`)} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
