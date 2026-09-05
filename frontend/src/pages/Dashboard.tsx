import { useState, useEffect } from "react"
import { MetricCard } from "@/components/ui/MetricCard"
import api from "@/lib/api"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { DollarSign, Clock, AlertTriangle, TrendingUp } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(215 28% 60%)",
  pending_approval: "hsl(38 92% 50%)",
  approved: "hsl(142 76% 36%)",
  confirmed: "hsl(210 84% 55%)",
  negotiation: "hsl(262 83% 58%)",
  fulfilled: "hsl(190 76% 45%)",
  cancelled: "hsl(0 84% 60%)",
}

function inr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${Math.round(n).toLocaleString()}`
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .get("/dashboard/")
      .then((r) => setMetrics(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load dashboard"))
  }, [])

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">Error loading dashboard: {error}</div>
    )
  }
  if (!metrics) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>
  }

  const fin = metrics.financials || {}
  const deals = metrics.deals_summary || { total_deals: 0, by_status: {} }
  const risk = metrics.risk_breakdown || {}

  const distribution = Object.entries(deals.by_status || {}).map(([key, v]: any) => ({
    name: key.replace(/_/g, " "),
    value: v.count,
    fill: STATUS_COLORS[key] || "hsl(215 28% 45%)",
  }))

  const riskData = [
    { name: "Low Risk", value: risk.low_risk || 0, fill: "hsl(142 76% 36%)" },
    { name: "Medium Risk", value: risk.medium_risk || 0, fill: "hsl(38 92% 50%)" },
    { name: "High Risk", value: risk.high_risk || 0, fill: "hsl(0 84% 60%)" },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Sales Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Live snapshot of pipeline, collections, and risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={inr(fin.total_revenue || 0)}
          icon={<DollarSign className="w-5 h-5" />}
          glowColor="primary"
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics.pending_approvals_count || 0}
          icon={<Clock className="w-5 h-5" />}
          glowColor="info"
        />
        <MetricCard
          title="High-Risk Deals"
          value={risk.high_risk || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="warning"
        />
        <MetricCard
          title="Avg Margin"
          value={`${(fin.avg_margin_percent || 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">Collections vs Outstanding</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { name: "Gross Profit", value: fin.gross_profit || 0 },
                  { name: "Collected", value: fin.total_collected || 0 },
                  { name: "Outstanding", value: fin.total_outstanding || 0 },
                  { name: "Total Cost", value: fin.total_cost || 0 },
                  { name: "Total Revenue", value: fin.total_revenue || 0 },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => inr(v)} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "white", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(v: any) => inr(Number(v))}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">Deal Status</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "white", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                />
                <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Risk Breakdown</h3>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={riskData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={(e) => `${e.name}: ${e.value}`}>
                {riskData.map((entry, index) => (
                  <Cell key={`risk-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
