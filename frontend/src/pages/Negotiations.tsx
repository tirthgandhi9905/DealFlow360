import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Handshake, ExternalLink } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

export default function Negotiations() {
  const [items, setItems] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [opening, setOpening] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api
      .get("/negotiations/", { params: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, search: search || undefined } })
      .then((r) => { setItems(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load negotiations"))
      .finally(() => setLoading(false))
  }, [page, search])

  // Portal endpoint needs quote_id, not deal_id — look up latest quote for the deal.
  const openPortal = async (dealId: string) => {
    setOpening(dealId)
    try {
      const r = await api.get(`/quotes/deal/${dealId}`)
      const quotes = r.data.quotes || []
      if (quotes.length === 0) {
        alert("This deal has no quotes yet — nothing to show in the customer portal.")
        return
      }
      const latestQuoteId = quotes[0].id
      window.open(`/portal/${latestQuoteId}`, "_blank", "noopener")
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to open portal")
    } finally {
      setOpening(null)
    }
  }

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
        <button
          onClick={() => openPortal(r.deal_id)}
          disabled={opening === r.deal_id}
          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors inline-flex items-center gap-1 disabled:opacity-50"
        >
          {opening === r.deal_id ? "Opening…" : "Open"} <ExternalLink className="w-3 h-3" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" /> Active Negotiations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live counter-proposals and concession tracking</p>
        </div>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by deal or customer…" />
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading negotiations...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={items} columns={columns} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
