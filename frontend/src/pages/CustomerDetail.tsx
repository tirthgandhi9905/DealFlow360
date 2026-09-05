import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { ArrowLeft, Building, Mail, Phone, TrendingUp, DollarSign, Award, Percent, AlertCircle, ExternalLink } from "lucide-react"

function inr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n || 0).toLocaleString("en-IN")}`
}

const TIER_STYLES: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-slate-200 text-slate-700",
  bronze: "bg-amber-100 text-amber-800",
  platinum: "bg-purple-100 text-purple-800",
}

const DEAL_STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  pending_approval: "bg-warning/10 text-warning",
  approved: "bg-info/10 text-info",
  negotiation: "bg-primary/10 text-primary",
  confirmed: "bg-success/10 text-success",
  fulfilled: "bg-success/20 text-success",
  cancelled: "bg-destructive/10 text-destructive",
}

type Tab = "deals" | "quotes" | "negotiations" | "invoices"

export default function CustomerDetail() {
  const { formatAmount } = useCurrency()
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("deals")

  useEffect(() => {
    if (!id) return
    api
      .get(`/customers/${id}/summary`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load customer"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading customer 360°...</div>
  if (error) return <div className="p-8 text-center text-destructive">{error}</div>
  if (!data) return null

  const { customer, stats, deals, quotes, negotiations, invoices } = data
  const tierLower = String(customer.tier || "").toLowerCase()

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{customer.name}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[tierLower] || "bg-slate-100 text-slate-600"}`}>
              {tierLower.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            {customer.industry && <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> {customer.industry}</span>}
            {customer.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>}
            {customer.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-xl border-l-4 border-l-primary shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <div className="p-1.5 bg-primary/10 rounded-md"><DollarSign className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">{formatAmount(stats.total_revenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Pipeline: {formatAmount(stats.total_pipeline)}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-success shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
            <div className="p-1.5 bg-success/10 rounded-md"><Award className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">{stats.win_rate_percent}%</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.won_deals} won · {stats.lost_deals} lost</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-info shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Avg Margin</p>
            <div className="p-1.5 bg-info/10 rounded-md"><Percent className="w-4 h-4 text-info" /></div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">{stats.avg_margin_percent}%</p>
          <p className="text-xs text-muted-foreground mt-1">Across {stats.total_deals} deals</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-warning shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Outstanding</p>
            <div className="p-1.5 bg-warning/10 rounded-md"><AlertCircle className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-2xl font-bold text-warning tracking-tight">{formatAmount(stats.total_outstanding)}</p>
          <p className="text-xs text-muted-foreground mt-1">Paid: {formatAmount(stats.total_paid)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="border-b border-border flex overflow-x-auto">
          {([
            { key: "deals", label: `Deals (${deals.length})` },
            { key: "quotes", label: `Quotes (${quotes.length})` },
            { key: "negotiations", label: `Negotiations (${negotiations.length})` },
            { key: "invoices", label: `Invoices (${invoices.length})` },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "deals" && (
            deals.length === 0 ? <div className="p-8 text-center text-muted-foreground">No deals yet</div> :
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Deal #</th>
                  <th className="text-left px-3 py-2">Sales Rep</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-right px-3 py-2">Margin</th>
                  <th className="text-right px-3 py-2">Risk</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deals.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-foreground">{d.deal_number}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.sales_rep_name}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatAmount(d.total_amount)}</td>
                    <td className={`px-3 py-2 text-right ${d.margin_percent >= 30 ? "text-success" : d.margin_percent >= 15 ? "text-warning" : "text-destructive"}`}>{d.margin_percent?.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right">{d.risk_score}</td>
                    <td className="px-3 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${DEAL_STATUS_STYLES[d.status] || "bg-slate-100"}`}>{String(d.status).replace(/_/g, " ")}</span></td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "quotes" && (
            quotes.length === 0 ? <div className="p-8 text-center text-muted-foreground">No quotes yet</div> :
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Quote #</th>
                  <th className="text-left px-3 py-2">Deal #</th>
                  <th className="text-center px-3 py-2">Version</th>
                  <th className="text-center px-3 py-2">Edits</th>
                  <th className="text-right px-3 py-2">Grand Total</th>
                  <th className="text-left px-3 py-2">Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quotes.map((q: any) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-foreground">{q.quote_number}</td>
                    <td className="px-3 py-2 text-muted-foreground">{q.deal_number}</td>
                    <td className="px-3 py-2 text-center">v{q.version}</td>
                    <td className="px-3 py-2 text-center">{q.edit_count > 0 ? <span className="text-primary font-medium">{q.edit_count}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatAmount(q.grand_total)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{q.created_at ? new Date(q.created_at).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate(`/quotes/${q.id}`)} className="text-xs text-primary hover:underline">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "negotiations" && (
            negotiations.length === 0 ? <div className="p-8 text-center text-muted-foreground">No negotiations yet</div> :
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Deal #</th>
                  <th className="text-center px-3 py-2">Rounds</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {negotiations.map((n: any) => (
                  <tr key={n.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-foreground">{n.deal_number}</td>
                    <td className="px-3 py-2 text-center">#{n.round_count}</td>
                    <td className="px-3 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded ${n.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{n.status}</span></td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{n.created_at ? new Date(n.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "invoices" && (
            invoices.length === 0 ? <div className="p-8 text-center text-muted-foreground">No invoices yet</div> :
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Invoice #</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Due Date</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((i: any) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-foreground">{i.invoice_number}</td>
                    <td className={`px-3 py-2 text-right font-medium ${i.amount < 0 ? "text-destructive" : ""}`}>{formatAmount(i.amount)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{i.due_date ? new Date(i.due_date).toLocaleDateString() : "—"}</td>
                    <td className="px-3 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded ${i.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{i.status}</span></td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{i.paid_at ? new Date(i.paid_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
