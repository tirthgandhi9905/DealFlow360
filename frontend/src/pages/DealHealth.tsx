import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { HeartPulse, AlertTriangle, TrendingDown, Activity, Percent, Bell } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

export default function DealHealth() {
  const [deals, setDeals] = useState<any[]>([])
  const [summary, setSummary] = useState<any>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState("")
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    const params: any = { stalled_days: 7, limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
    if (search) params.search = search
    if (riskFilter) params.risk_level = riskFilter
    api
      .get("/deal-health/", { params })
      .then((r) => {
        setDeals(r.data.items || [])
        setSummary(r.data.summary || {})
        setTotal(r.data.total || r.data.items?.length || 0)
      })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load deal health"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search, riskFilter])

  const nudge = async (deal: any, actionType: string) => {
    setBusyId(deal.id)
    try {
      await api.post(`/deal-health/${deal.id}/nudge`, {
        action_type: actionType,
        message: `${actionType} triggered from Deal Health dashboard`,
      })
      alert(`✓ ${actionType} sent for ${deal.deal_number}`)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Nudge failed")
    } finally {
      setBusyId(null)
    }
  }

  const exportCsv = () => {
    const token = localStorage.getItem("token") || ""
    fetch("/api/deal-health/export?format=csv", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `dealflow360_deals_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => alert("Export failed"))
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
    { header: "Amount", cell: (r: any) => <span className="font-medium">{inr(r.total_amount)}</span> },
    { header: "Margin", cell: (r: any) => <span className={r.margin_percent >= 30 ? "text-success" : r.margin_percent >= 15 ? "text-warning" : "text-destructive"}>{r.margin_percent?.toFixed(1)}%</span> },
    {
      header: "Risk",
      cell: (r: any) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${r.risk_level === "high" ? "bg-destructive" : r.risk_level === "medium" ? "bg-warning" : "bg-success"}`}
              style={{ width: `${r.risk_score}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${r.risk_level === "high" ? "text-destructive" : r.risk_level === "medium" ? "text-warning" : "text-success"}`}>
            {r.risk_score}
          </span>
        </div>
      ),
    },
    { header: "Idle Days", cell: (r: any) => <span className={r.is_stalled ? "text-destructive font-medium" : "text-muted-foreground"}>{r.idle_days}</span> },
    {
      header: "Signal",
      cell: (r: any) => (
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {r.is_anomaly ? (
            <><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> <span className="text-destructive">{r.anomaly_reason || "Anomaly"}</span></>
          ) : r.is_stalled ? (
            <><TrendingDown className="w-3.5 h-3.5 text-warning" /> <span className="text-warning">Stalled</span></>
          ) : (
            <><Activity className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Stable</span></>
          )}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (r: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => nudge(r, "nudge")}
            disabled={busyId === r.id}
            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
          >
            Nudge
          </button>
          <button
            onClick={() => nudge(r, "escalate")}
            disabled={busyId === r.id}
            className="text-xs bg-warning/10 text-warning px-2 py-1 rounded hover:bg-warning hover:text-white transition-colors disabled:opacity-50"
          >
            Escalate
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" /> Deal Health Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Stalled deals, anomalies, and risk signals</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search customer or deal..." />
          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
          >
            <option value="">All risk</option>
            <option value="high">High risk</option>
            <option value="medium">Medium risk</option>
            <option value="low">Low risk</option>
          </select>
          <button onClick={exportCsv} className="px-4 py-2 rounded-lg bg-white border border-border text-sm hover:bg-slate-50 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-xl border-l-4 border-l-destructive shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">High Risk</p>
            <div className="p-1.5 bg-destructive/10 rounded-md"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
          </div>
          <p className="text-3xl font-bold text-destructive tracking-tight">{summary.high_risk || 0}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-warning shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Stalled Deals</p>
            <div className="p-1.5 bg-warning/10 rounded-md"><Bell className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-3xl font-bold text-warning tracking-tight">{summary.stalled_deals_count || 0}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-primary shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Anomalies</p>
            <div className="p-1.5 bg-primary/10 rounded-md"><Percent className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">{summary.anomaly_deals_count || 0}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-success shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Active</p>
            <div className="p-1.5 bg-success/10 rounded-md"><Activity className="w-4 h-4 text-success" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">{summary.total_active_deals || 0}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Analyzing pipeline health...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={deals} columns={columns} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
