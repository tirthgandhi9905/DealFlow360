import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DollarSign, Clock, AlertTriangle, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Layers, Building } from "lucide-react"

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get("/dashboard/")
      setData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load dashboard metrics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading live dashboard metrics...</div>
  }

  if (error) {
    return (
      <div className="p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl">
        <p className="font-medium">Error loading dashboard: {error}</p>
        <button onClick={fetchDashboard} className="mt-2 text-sm underline font-semibold">Retry</button>
      </div>
    )
  }

  const { financials, deals_summary, risk_breakdown, pending_approvals_count, customers_by_tier } = data || {}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Executive Sales Dashboard</h2>
          <p className="text-sm text-muted-foreground">Real-time revenue, gross margin, risk distribution & governance telemetry</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₹{financials?.total_revenue ? (financials.total_revenue).toLocaleString("en-IN") : 0}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" /> Gross Profit: ₹{financials?.gross_profit ? (financials.gross_profit).toLocaleString("en-IN") : 0}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Margin %</span>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {financials?.avg_margin_percent || 0}%
          </div>
          <div className="text-xs text-muted-foreground">
            Total Cost: ₹{financials?.total_cost ? (financials.total_cost).toLocaleString("en-IN") : 0}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {pending_approvals_count || 0}
          </div>
          <div className="text-xs text-amber-600 font-medium">
            Requires Manager / Finance review
          </div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Collections</span>
            <Building className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₹{financials?.total_collected ? (financials.total_collected).toLocaleString("en-IN") : 0}
          </div>
          <div className="text-xs text-muted-foreground text-rose-500 font-medium">
            Outstanding: ₹{financials?.total_outstanding ? (financials.total_outstanding).toLocaleString("en-IN") : 0}
          </div>
        </div>
      </div>

      {/* Middle Breakdown Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline by Stage */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Deal Pipeline by Stage ({deals_summary?.total_deals || 0} Total Deals)
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {deals_summary?.by_status && Object.entries(deals_summary.by_status).map(([st, stat]: [string, any]) => (
              <div key={st} className="p-3.5 rounded-lg border border-border/80 bg-accent/30 space-y-1">
                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  {st.replace("_", " ")}
                </span>
                <div className="text-xl font-bold">{stat.count} deals</div>
                <div className="text-xs text-muted-foreground font-medium">
                  ₹{(stat.volume || 0).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Breakdown & Governance */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Discount Governance Risk
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Low Risk (Auto-Approved)</span>
              <span className="font-bold text-base text-emerald-700 dark:text-emerald-400">{risk_breakdown?.low_risk || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Medium Risk (Sales Manager)</span>
              <span className="font-bold text-base text-amber-700 dark:text-amber-400">{risk_breakdown?.medium_risk || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-400">High Risk (Finance Review)</span>
              <span className="font-bold text-base text-rose-700 dark:text-rose-400">{risk_breakdown?.high_risk || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Tier Distribution */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <h3 className="font-semibold text-base">Customer Account Tiers & Lifetime Value</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {customers_by_tier && Object.entries(customers_by_tier).map(([tier, stat]: [string, any]) => (
            <div key={tier} className="p-4 rounded-lg border border-border bg-accent/20 flex justify-between items-center">
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-xs uppercase font-bold ${
                  tier === "gold" ? "bg-amber-100 text-amber-800" : tier === "silver" ? "bg-slate-200 text-slate-800" : "bg-orange-100 text-orange-800"
                }`}>
                  {tier} Tier
                </span>
                <p className="text-sm text-muted-foreground mt-1">{stat.customer_count} B2B Accounts</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground font-semibold">Total LTV</span>
                <p className="text-base font-bold">₹{(stat.total_ltv || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
