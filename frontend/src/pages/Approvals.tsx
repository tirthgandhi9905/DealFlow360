import { useState, useEffect } from "react"
import api from "@/lib/api"
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck, ShieldCheck, Filter, FileText } from "lucide-react"

export default function Approvals() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [loading, setLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState<any>(null)
  const [actionNote, setActionNote] = useState("")
  const [processing, setProcessing] = useState(false)

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (statusFilter) params.status = statusFilter
      const res = await api.get("/approvals/", { params })
      setApprovals(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load approvals", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [statusFilter])

  const openApprovalDetail = async (apprId: string) => {
    try {
      const res = await api.get(`/approvals/${apprId}`)
      setSelectedApproval(res.data)
      setActionNote("")
    } catch (err) {
      alert("Failed to load approval details")
    }
  }

  const handleApprovalAction = async (action: "approved" | "rejected" | "returned") => {
    if (!selectedApproval) return
    setProcessing(true)
    try {
      await api.post(`/approvals/${selectedApproval.id}/action`, {
        action,
        note: actionNote || `Action ${action.toUpperCase()} taken by approver`,
      })
      setSelectedApproval(null)
      fetchApprovals()
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to ${action} approval`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Discount Governance & Approval Chains</h2>
          <p className="text-sm text-muted-foreground">Review and resolve quotations exceeding standard customer tier discount ceilings</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              statusFilter === st ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {st} ({st === "pending" ? total : "Archive"})
          </button>
        ))}
      </div>

      {/* Approvals Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
          <span className="font-semibold text-sm">Showing {approvals.length} Approval Requests</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Deal Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3">Deal Amount</th>
                <th className="px-4 py-3">Margin %</th>
                <th className="px-4 py-3">Risk Score</th>
                <th className="px-4 py-3">Required Authority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Loading approval queues...
                  </td>
                </tr>
              ) : approvals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    No approval requests found for the selected status.
                  </td>
                </tr>
              ) : (
                approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold font-mono text-primary flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> {a.deal_number}
                    </td>
                    <td className="px-4 py-3.5 font-medium">{a.customer_name} ({a.customer_tier.toUpperCase()})</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{a.sales_rep_name}</td>
                    <td className="px-4 py-3.5 font-semibold">₹{a.deal_amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 text-emerald-600 font-bold">{a.deal_margin}%</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                        a.risk_score > 70 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {a.risk_score}/100 Risk
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold uppercase text-muted-foreground">
                      {a.required_level.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded text-xs uppercase font-bold ${
                        a.status === "approved" ? "bg-emerald-100 text-emerald-800" : a.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => openApprovalDetail(a.id)}
                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold rounded-lg transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-start border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold">Deal Approval Review</h3>
                <span className="text-xs text-muted-foreground font-mono">{selectedApproval.deal_number} • {selectedApproval.customer_name}</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-accent">
                {selectedApproval.required_level.replace("_", " ")} Level
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-accent/20 text-xs text-center">
              <div>
                <span className="text-muted-foreground block">Deal Total</span>
                <span className="font-bold text-sm">₹{selectedApproval.deal_amount.toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Profit Margin</span>
                <span className="font-bold text-sm text-emerald-600">{selectedApproval.deal_margin}%</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Blended Risk</span>
                <span className="font-bold text-sm text-rose-600">{selectedApproval.risk_score}/100</span>
              </div>
            </div>

            {/* Audit Steps */}
            {selectedApproval.steps?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">Action History</span>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selectedApproval.steps.map((s: any) => (
                    <div key={s.id} className="p-2 rounded border border-border bg-accent/10 text-xs flex justify-between">
                      <span><strong>{s.approver_name}</strong>: {s.note || s.action}</span>
                      <span className="text-muted-foreground">{s.action.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Approver Note / Reason</label>
              <textarea
                rows={2}
                placeholder="Provide feedback or justification..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <button type="button" onClick={() => setSelectedApproval(null)} className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-accent">
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleApprovalAction("returned")}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 rounded-lg"
                >
                  Return
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleApprovalAction("rejected")}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 rounded-lg"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => handleApprovalAction("approved")}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
                >
                  Approve Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
