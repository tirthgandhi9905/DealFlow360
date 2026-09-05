import { useState, useEffect } from "react"
import api from "@/lib/api"
import { MetricCard } from "@/components/ui/MetricCard"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { DollarSign, Clock, AlertTriangle, TrendingUp, RefreshCw, Layers, Building, ArrowUpRight } from "lucide-react"

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
    return <div className="p-12 text-center text-muted-foreground animate-pulse text-sm font-semibold">Loading live dashboard telemetry...</div>
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl">
        <p className="font-bold">Error loading dashboard: {error}</p>
        <button onClick={fetchDashboard} className="mt-2 text-xs underline font-bold">Retry connection</button>
      </div>
    )
  }

  const { financials, deals_summary, risk_breakdown, pending_approvals_count, customers_by_tier } = data || {}

  // Build chart-ready data for Status Pipeline & Distribution
  const pieColors = ["#714B67", "#00A09D", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#64748b"]
  const statusPieData = deals_summary?.by_status 
    ? Object.entries(deals_summary.by_status).map(([key, stat]: [string, any], index) => ({
        name: key.replace("_", " ").toUpperCase(),
        value: stat.count,
        fill: pieColors[index % pieColors.length],
      }))
    : []

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Sales Operations</h2>
          <p className="text-xs text-muted-foreground font-medium">Real-time B2B revenue intelligence, gross margin tracking, and discount governance</p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" /> Refresh Telemetry
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          title="Total Platform Revenue" 
          value={`₹${financials?.total_revenue ? (financials.total_revenue / 100000).toFixed(1) : 0} Lakh`}
          trend={{ value: 18.4, label: "MoM", direction: 'up' }}
          icon={<DollarSign className="w-5 h-5" />}
          glowColor="primary"
        />
        <MetricCard 
          title="Gross Margin %" 
          value={`${financials?.avg_margin_percent || 0}%`}
          trend={{ value: 4.2, label: "Target", direction: 'up' }}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="success"
        />
        <MetricCard 
          title="Pending Approvals" 
          value={pending_approvals_count || 0}
          trend={{ value: 8, label: "Queued", direction: 'neutral' }}
          icon={<Clock className="w-5 h-5" />}
          glowColor="warning"
        />
        <MetricCard 
          title="High Risk Deals" 
          value={risk_breakdown?.high_risk || 0}
          trend={{ value: 12.0, label: "Flagged", direction: 'down' }}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="info"
        />
      </div>

      {/* Pipeline & Status Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Pipeline Summary */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Deal Pipeline by Operational Stage ({deals_summary?.total_deals || 0} Deals)
            </h3>
            <span className="text-xs font-bold text-primary">Live Database Aggregations</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {deals_summary?.by_status && Object.entries(deals_summary.by_status).map(([st, stat]: [string, any]) => (
              <div key={st} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1.5 hover:bg-white hover:shadow-sm transition-all">
                <StatusBadge status={st} />
                <div className="text-xl font-black text-slate-900 pt-1">{stat.count} deals</div>
                <div className="text-[11px] font-bold text-slate-500">
                  ₹{(stat.volume || 0).toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Status Distribution Donut */}
        <div className="glass rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Stage Distribution</h3>
          </div>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-bold justify-center">
            {statusPieData.slice(0, 4).map((d, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} /> {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Governance & Customer Tier Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governance Risk Telemetry */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Discount Governance Policy Distribution
          </h3>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase block">Low Risk</span>
              <span className="text-2xl font-black text-emerald-800">{risk_breakdown?.low_risk || 0}</span>
              <p className="text-[10px] text-emerald-600 font-semibold">Auto-Approved</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
              <span className="text-xs font-bold text-amber-800 uppercase block">Medium Risk</span>
              <span className="text-2xl font-black text-amber-800">{risk_breakdown?.medium_risk || 0}</span>
              <p className="text-[10px] text-amber-600 font-semibold">Sales Manager</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-1">
              <span className="text-xs font-bold text-rose-800 uppercase block">High Risk</span>
              <span className="text-2xl font-black text-rose-800">{risk_breakdown?.high_risk || 0}</span>
              <p className="text-[10px] text-rose-600 font-semibold">Finance Review</p>
            </div>
          </div>
        </div>

        {/* Customer Tiers */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-primary" /> Customer Account Tiers & Portfolio LTV
          </h3>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {customers_by_tier && Object.entries(customers_by_tier).map(([tier, stat]: [string, any]) => (
              <div key={tier} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-1 text-center">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-black ${
                  tier === "gold" ? "bg-amber-100 text-amber-900 border border-amber-300" : tier === "silver" ? "bg-slate-200 text-slate-900" : "bg-orange-100 text-orange-900"
                }`}>
                  {tier}
                </span>
                <div className="text-lg font-black text-slate-900 pt-1">{stat.customer_count} Accts</div>
                <div className="text-[10px] font-bold text-muted-foreground">
                  ₹{(stat.total_ltv / 100000).toFixed(1)}L LTV
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
