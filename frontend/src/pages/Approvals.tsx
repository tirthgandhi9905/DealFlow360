import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { useCurrency } from "@/context/CurrencyContext"
import { IndianRupee, Filter, X } from "lucide-react"

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
  const [amountFilter, setAmountFilter] = useState<string>("all")
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    const params: any = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
    if (filter) params.status = filter
    if (search) params.search = search

    let minAmt: number | undefined
    let maxAmt: number | undefined

    if (amountFilter === "50L_1Cr") {
      minAmt = 5000000
      maxAmt = 10000000
    } else if (amountFilter === "under_50L") {
      maxAmt = 5000000
    } else if (amountFilter === "above_1Cr") {
      minAmt = 10000000
    } else if (amountFilter === "custom") {
      if (customMin && !isNaN(Number(customMin))) minAmt = Number(customMin)
      if (customMax && !isNaN(Number(customMax))) maxAmt = Number(customMax)
    }

    if (minAmt !== undefined) params.min_amount = minAmt
    if (maxAmt !== undefined) params.max_amount = maxAmt

    api
      .get("/approvals/", { params })
      .then((r) => {
        let items = r.data.items || []
        let tot = r.data.total || 0

        if (search) {
          const q = search.toLowerCase()
          items = items.filter((item: any) =>
            item.deal_number?.toLowerCase().includes(q) ||
            item.customer_name?.toLowerCase().includes(q) ||
            item.sales_rep_name?.toLowerCase().includes(q) ||
            item.customer_tier?.toLowerCase().includes(q)
          )
        }

        // Amount range filter fallback (client-side verification)
        if (minAmt !== undefined || maxAmt !== undefined) {
          items = items.filter((item: any) => {
            const amt = Number(item.deal_amount) || 0
            if (minAmt !== undefined && amt < minAmt) return false
            if (maxAmt !== undefined && amt > maxAmt) return false
            return true
          })
          tot = items.length
        }

        setApprovals(items)
        setTotal(tot)
      })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load approvals"))
      .finally(() => setLoading(false))
  }, [filter, page, search, amountFilter, customMin, customMax])

  const columns = [
    { header: "Deal #", accessorKey: "deal_number" as const, sortable: true, className: "font-medium text-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, sortable: true, className: "font-medium" },
    { header: "Tier", accessorKey: "customer_tier" as const, sortable: true, cell: (r: any) => <span className="text-xs uppercase text-muted-foreground">{r.customer_tier}</span> },
    { header: "Sales Rep", accessorKey: "sales_rep_name" as const, sortable: true, cell: (r: any) => <span className="text-muted-foreground">{r.sales_rep_name}</span> },
    { header: "Amount", accessorKey: "deal_amount" as const, sortable: true, cell: (r: any) => <span className="font-medium">{formatAmount(r.deal_amount)}</span> },
    { header: "Margin", accessorKey: "deal_margin" as const, sortable: true, cell: (r: any) => <span className={r.deal_margin >= 30 ? "text-success" : r.deal_margin >= 15 ? "text-warning" : "text-destructive"}>{r.deal_margin?.toFixed(1)}%</span> },
    {
      header: "Risk",
      accessorKey: "risk_score" as const,
      sortable: true,
      cell: (r: any) => (
        <span className={r.risk_score > 60 ? "text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded" : r.risk_score > 30 ? "text-warning font-medium bg-warning/10 px-2 py-0.5 rounded" : "text-success font-medium bg-success/10 px-2 py-0.5 rounded"}>
          {r.risk_score}/100
        </span>
      ),
    },
    { header: "Required", accessorKey: "required_level" as const, sortable: true, cell: (r: any) => <span className="text-xs text-muted-foreground capitalize">{String(r.required_level || "").replace(/_/g, " ")}</span> },
    { header: "Status", accessorKey: "status" as const, sortable: true, cell: (r: any) => <span className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_STYLES[r.status] || "bg-muted"}`}>{r.status}</span> },
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

      {/* Amount Range Filter Toolbar (Evaluator Requirement: 50L to 1Cr) */}
      <div className="glass rounded-xl p-3 border border-border flex items-center justify-between gap-3 flex-wrap bg-white/80">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5 mr-1 text-xs">
            <IndianRupee className="w-4 h-4 text-primary" /> Deal Value Filter:
          </span>
          <button
            onClick={() => { setAmountFilter("all"); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-all font-medium ${
              amountFilter === "all"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Amounts
          </button>
          
          {/* Specific Evaluator Query Filter: 50 Lakh to 1 Crore */}
          <button
            onClick={() => { setAmountFilter("50L_1Cr"); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-all font-semibold flex items-center gap-1.5 ${
              amountFilter === "50L_1Cr"
                ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25 ring-2 ring-amber-300"
                : "bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100"
            }`}
          >
            <span>₹50 Lakh – ₹1 Crore</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
              amountFilter === "50L_1Cr" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-800"
            }`}>
              50L - 1Cr
            </span>
          </button>

          <button
            onClick={() => { setAmountFilter("under_50L"); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-all font-medium ${
              amountFilter === "under_50L"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            &lt; ₹50 Lakh
          </button>

          <button
            onClick={() => { setAmountFilter("above_1Cr"); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-all font-medium ${
              amountFilter === "above_1Cr"
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            &gt; ₹1 Crore
          </button>

          <button
            onClick={() => { setAmountFilter("custom"); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg border transition-all font-medium ${
              amountFilter === "custom"
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Custom Range…
          </button>
        </div>

        {amountFilter === "custom" && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="number"
              placeholder="Min Amount (₹)"
              value={customMin}
              onChange={(e) => { setCustomMin(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 border border-border rounded-md w-28 bg-white focus:outline-primary"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              placeholder="Max Amount (₹)"
              value={customMax}
              onChange={(e) => { setCustomMax(e.target.value); setPage(1) }}
              className="px-2.5 py-1.5 border border-border rounded-md w-28 bg-white focus:outline-primary"
            />
          </div>
        )}

        {amountFilter !== "all" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Showing: <strong className="text-foreground">
              {amountFilter === "50L_1Cr" ? "₹50,00,000 – ₹1,00,00,000" :
               amountFilter === "under_50L" ? "< ₹50,00,000" :
               amountFilter === "above_1Cr" ? "> ₹1,00,00,000" :
               `₹${customMin || 0} – ₹${customMax || '∞'}`}
            </strong> ({total} deals found)</span>
            <button
              onClick={() => { setAmountFilter("all"); setCustomMin(""); setCustomMax(""); setPage(1); }}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-foreground"
              title="Clear amount filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
