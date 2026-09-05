import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { Check, X, AlertTriangle, ArrowLeft, Send } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function ApprovalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [detail, setDetail] = useState<any>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [note, setNote] = useState("")

  const load = () => {
    setError("")
    api
      .get(`/approvals/${id}`)
      .then((r) => setDetail(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load approval"))
  }

  useEffect(() => { load() }, [id])

  const takeAction = async (action: "approved" | "rejected" | "returned") => {
    if (!id) return
    setBusy(action)
    try {
      await api.post(`/approvals/${id}/action`, { action, note: note || undefined })
      load()
      setNote("")
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      alert(typeof detail === "string" ? detail : "Action failed")
    } finally {
      setBusy("")
    }
  }

  if (error) return <div className="p-8 text-center text-destructive">{error}</div>
  if (!detail) return <div className="p-8 text-center animate-pulse">Loading deal details...</div>

  const isResolved = detail.status !== "pending"
  const riskColor =
    detail.risk_score > 70 ? "bg-destructive" :
    detail.risk_score > 40 ? "bg-warning" : "bg-success"

  // Role Checks
  const isSalesRep = user?.role === "SALES_REP"
  const isManager = user?.role === "SALES_MANAGER"
  const isFinance = user?.role === "FINANCE"
  const isAdmin = user?.role === "ADMIN"
  
  const requiresFinance = detail.required_level === "finance"
  
  const canApprove = !isSalesRep && (
    (requiresFinance && (isFinance || isAdmin || isManager)) || 
    (!requiresFinance && (isManager || isFinance || isAdmin))
  )

  const isEndorsementOnly = requiresFinance && isManager
  
  const getAuthorityWarning = () => {
    if (isSalesRep) return "Sales Representatives cannot authorize deals."
    if (requiresFinance && isManager) return "As a Sales Manager, you can endorse this deal, but it requires Finance Director sign-off."
    if (requiresFinance && !isFinance && !isAdmin) return "This deal requires Finance Director approval."
    return null
  }

  const warningMsg = getAuthorityWarning()

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Approval — {detail.deal_number}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${detail.status === "pending" ? "bg-warning/10 text-warning" : detail.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {detail.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {detail.customer_name} · {String(detail.customer_tier).toUpperCase()} · Sales rep: {detail.sales_rep_name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Deal Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="text-lg font-semibold">{inr(detail.deal_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Margin</p>
                <p className={`text-lg font-semibold ${detail.deal_margin >= 30 ? "text-success" : detail.deal_margin >= 15 ? "text-warning" : "text-destructive"}`}>
                  {detail.deal_margin?.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Deal Status</p>
                <p className="capitalize">{String(detail.deal_status || "").replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Required Level</p>
                <p className="capitalize">{String(detail.required_level || "").replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Risk Assessment</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">AI Risk Score</span>
                  <span className="font-medium">{detail.risk_score}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full ${riskColor}`} style={{ width: `${detail.risk_score}%` }} />
                </div>
              </div>
              {detail.risk_score > 60 && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex gap-3 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Elevated risk detected — this deal was routed to {String(detail.required_level).replace(/_/g, " ")} for review.</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Approval Chain</h3>
            {detail.steps && detail.steps.length > 0 ? (
              <div className="space-y-4">
                {detail.steps.map((s: any) => (
                  <div key={s.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.approver_name} — <span className="capitalize">{s.action}</span></p>
                      {s.note && <p className="text-xs text-muted-foreground italic mt-1">"{s.note}"</p>}
                      <p className="text-xs text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleString() : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No approval steps taken yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Actions</h3>
            {isResolved ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                This approval has already been resolved ({detail.status}).
              </div>
            ) : (
              <div className="space-y-3">
                {warningMsg && (
                  <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 text-warning text-xs font-medium flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{warningMsg}</p>
                  </div>
                )}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note..."
                  rows={2}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={!canApprove && isSalesRep}
                />
                <button
                  disabled={!!busy || (!canApprove && isSalesRep)}
                  onClick={() => takeAction("approved")}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 ${isEndorsementOnly ? "bg-blue-600 hover:bg-blue-700" : "bg-success hover:bg-success/90"}`}
                >
                  <Check className="w-4 h-4" /> 
                  {busy === "approved" 
                    ? "Processing..." 
                    : isEndorsementOnly 
                      ? "Endorse Deal" 
                      : "Approve Deal"}
                </button>
                <button
                  disabled={!!busy || isSalesRep}
                  onClick={() => takeAction("returned")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-warning hover:bg-warning/90 text-white font-medium transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> {busy === "returned" ? "Returning..." : "Return to Rep"}
                </button>
                <button
                  disabled={!!busy || isSalesRep}
                  onClick={() => takeAction("rejected")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 font-medium transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> {busy === "rejected" ? "Rejecting..." : "Reject"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
