import { useState, useEffect } from "react"
import api from "@/lib/api"
import { HeartPulse, AlertTriangle, Clock, Download, Bell, Zap, ShieldAlert, ArrowRight } from "lucide-react"

export default function DealHealth() {
  const [data, setData] = useState<any>(null)
  const [stalledDays, setStalledDays] = useState(7)
  const [riskFilter, setRiskFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [nudgingId, setNudgingId] = useState<string | null>(null)

  const fetchDealHealth = async () => {
    setLoading(true)
    try {
      const params: any = { stalled_days: stalledDays }
      if (riskFilter) params.risk_level = riskFilter
      const res = await api.get("/deal-health/", { params })
      setData(res.data)
    } catch (err) {
      console.error("Failed to load deal health", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDealHealth()
  }, [stalledDays, riskFilter])

  const handleTriggerNudge = async (dealId: string, actionType: string) => {
    setNudgingId(dealId)
    try {
      const res = await api.post(`/deal-health/${dealId}/nudge`, {
        action_type: actionType,
        message: `Automated ${actionType} triggered on deal due to inactivity / governance alert.`,
      })
      alert(res.data.message)
      fetchDealHealth()
    } catch (err: any) {
      alert("Failed to send nudge")
    } finally {
      setNudgingId(null)
    }
  }

  const handleExportCSV = () => {
    const token = localStorage.getItem("token")
    window.open(`/api/deal-health/export?format=csv&token=${token}`, "_blank")
  }

  const { summary, items } = data || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deal Health, Anomalies & Automated Escalations</h2>
          <p className="text-sm text-muted-foreground">Monitor stalled quotation pipelines, margin erosion anomalies, and trigger automated sales nudges</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border text-foreground hover:bg-accent font-semibold rounded-lg text-sm transition-colors shadow-sm"
        >
          <Download className="w-4 h-4 text-primary" /> Export Deals CSV
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Active Deals Monitored</span>
          <div className="text-2xl font-bold text-foreground">{summary?.total_active_deals || 0}</div>
        </div>
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-300 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase">High Governance Risk</span>
          <div className="text-2xl font-extrabold">{summary?.high_risk || 0} Deals</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-300 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase">Stalled Quotations (&gt;{stalledDays}d)</span>
          <div className="text-2xl font-extrabold">{summary?.stalled_deals_count || 0} Deals</div>
        </div>
        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-800 dark:text-purple-300 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase">Pricing Anomalies</span>
          <div className="text-2xl font-extrabold">{summary?.anomaly_deals_count || 0} Deals</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex gap-2">
          {["", "high", "medium", "low"].map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                riskFilter === r ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {r ? `${r} Risk` : "All Deals"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>Stall Threshold:</span>
          <select
            value={stalledDays}
            onChange={(e) => setStalledDays(parseInt(e.target.value))}
            className="px-2.5 py-1 text-xs rounded-md border border-border bg-background"
          >
            <option value={3}>&gt; 3 Days Inactive</option>
            <option value={7}>&gt; 7 Days Inactive</option>
            <option value={14}>&gt; 14 Days Inactive</option>
            <option value={30}>&gt; 30 Days Inactive</option>
          </select>
        </div>
      </div>

      {/* Deals Health Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Deal Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3">Deal Volume</th>
                <th className="px-4 py-3">Profit Margin</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Idle Days</th>
                <th className="px-4 py-3">Anomaly Alert</th>
                <th className="px-4 py-3 text-right">Escalation Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground animate-pulse">Running telemetry checks...</td>
                </tr>
              ) : items?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No deals matching the selected risk filters.</td>
                </tr>
              ) : (
                items?.map((d: any) => (
                  <tr key={d.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-mono text-foreground">{d.deal_number}</td>
                    <td className="px-4 py-3.5 font-medium">{d.customer_name} ({d.customer_tier.toUpperCase()})</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{d.sales_rep_name}</td>
                    <td className="px-4 py-3.5 font-bold">₹{d.total_amount.toLocaleString("en-IN")}</td>
                    <td className={`px-4 py-3.5 font-bold ${d.margin_percent < 20 ? "text-rose-600" : "text-emerald-600"}`}>
                      {d.margin_percent}%
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        d.risk_level === "high" ? "bg-rose-100 text-rose-800" : d.risk_level === "medium" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {d.risk_score}/100 ({d.risk_level.toUpperCase()})
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-bold text-muted-foreground">
                      {d.idle_days} days
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      {d.anomaly_reason ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {d.anomaly_reason}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Healthy</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleTriggerNudge(d.id, "nudge")}
                        disabled={nudgingId === d.id}
                        className="px-2.5 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded hover:bg-accent/80"
                      >
                        Nudge Rep
                      </button>
                      <button
                        onClick={() => handleTriggerNudge(d.id, "escalate")}
                        disabled={nudgingId === d.id}
                        className="px-2.5 py-1 bg-rose-500/10 text-rose-700 text-xs font-bold rounded hover:bg-rose-500/20"
                      >
                        Escalate
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
