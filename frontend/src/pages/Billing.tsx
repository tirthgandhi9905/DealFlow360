import { useState, useEffect } from "react"
import api from "@/lib/api"
import { CreditCard, Repeat, Plus, Filter, FileText, CheckCircle2, ArrowRight, DollarSign } from "lucide-react"

export default function Billing() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [tab, setTab] = useState<"invoices" | "subscriptions">("invoices")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // Payment Recording Modal
  const [payingInvoice, setPayingInvoice] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer")
  const [recordingPayment, setRecordingPayment] = useState(false)

  // Subscription Modification
  const [modifyingSub, setModifyingSub] = useState<any>(null)
  const [newSeats, setNewSeats] = useState(2)

  const fetchBillingData = async () => {
    setLoading(true)
    try {
      const invParams: any = { limit: 50 }
      if (statusFilter) invParams.status = statusFilter
      const [iRes, sRes] = await Promise.all([
        api.get("/billing/invoices", { params: invParams }),
        api.get("/subscriptions/?limit=50"),
      ])
      setInvoices(iRes.data.items || [])
      setSubscriptions(sRes.data.items || [])
    } catch (err) {
      console.error("Failed to load billing", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBillingData()
  }, [statusFilter])

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingInvoice) return
    setRecordingPayment(true)
    try {
      await api.post(`/billing/invoices/${payingInvoice.id}/payments`, {
        amount: Number(paymentAmount),
        method: paymentMethod,
      })
      setPayingInvoice(null)
      fetchBillingData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Payment recording failed")
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription mid-cycle? Automated prorated credit note will be issued.")) return
    try {
      const res = await api.post(`/subscriptions/${subId}/cancel`, { immediate: true })
      alert(res.data.message)
      fetchBillingData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Cancellation failed")
    }
  }

  const handleModifyQuantity = async (subId: string) => {
    try {
      const res = await api.post(`/subscriptions/${subId}/modify-quantity`, {
        new_quantity: Number(newSeats),
      })
      alert(res.data.message)
      setModifyingSub(null)
      fetchBillingData()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Modification failed")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hybrid Billing & Recurring Subscriptions</h2>
          <p className="text-sm text-muted-foreground">Manage one-time invoice collections, recurring schedules, and mid-cycle proration credit notes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("invoices")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "invoices" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          <CreditCard className="w-4 h-4" /> Invoices & Collections ({invoices.length})
        </button>
        <button
          onClick={() => setTab("subscriptions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "subscriptions" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-accent"
          }`}
        >
          <Repeat className="w-4 h-4" /> Recurring Subscriptions & Proration ({subscriptions.length})
        </button>
      </div>

      {tab === "invoices" ? (
        /* Invoices Table */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
            <span className="font-semibold text-sm">One-Time & Recurring Invoices</span>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-md border border-border bg-background"
              >
                <option value="">All Payment Statuses</option>
                <option value="unpaid">Unpaid Invoices</option>
                <option value="paid">Paid Invoices</option>
                <option value="issued">Credit Notes</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Invoice Number</th>
                  <th className="px-4 py-3">Deal Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due / Paid Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground animate-pulse">Loading invoices...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices found.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3.5 font-bold font-mono text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> {inv.invoice_number}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{inv.deal_number}</td>
                      <td className="px-4 py-3.5 font-medium">{inv.customer_name}</td>
                      <td className={`px-4 py-3.5 font-bold ${inv.amount < 0 ? "text-rose-600" : "text-foreground"}`}>
                        ₹{inv.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${
                          inv.status === "paid" ? "bg-emerald-100 text-emerald-800" : inv.status === "issued" ? "bg-purple-100 text-purple-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : inv.due_date ? `Due: ${new Date(inv.due_date).toLocaleDateString()}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {inv.status === "unpaid" && (
                          <button
                            onClick={() => {
                              setPayingInvoice(inv)
                              setPaymentAmount(inv.amount)
                            }}
                            className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:opacity-90"
                          >
                            Record Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Subscriptions Table */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
            <span className="font-semibold text-sm">Active Recurring Contracts & Proration Controls</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Plan / Product</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Cycle Amount</th>
                  <th className="px-4 py-3">Billing Cycle</th>
                  <th className="px-4 py-3">Next Billing Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground">{s.plan_name}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{s.customer_name}</td>
                    <td className="px-4 py-3.5 font-bold">₹{s.amount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 uppercase text-xs font-semibold text-muted-foreground">{s.cycle}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded text-xs uppercase font-bold ${
                        s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-2">
                      {s.status === "active" && (
                        <>
                          <button
                            onClick={() => {
                              setModifyingSub(s)
                              setNewSeats(2)
                            }}
                            className="px-2.5 py-1 bg-accent text-accent-foreground text-xs font-semibold rounded hover:bg-accent/80"
                          >
                            Modify Qty
                          </button>
                          <button
                            onClick={() => handleCancelSubscription(s.id)}
                            className="px-2.5 py-1 bg-rose-500/10 text-rose-700 text-xs font-semibold rounded hover:bg-rose-500/20"
                          >
                            Cancel (Prorate)
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Record Customer Payment</h3>
            <p className="text-xs text-muted-foreground">Invoice: <strong>{payingInvoice.invoice_number}</strong> for {payingInvoice.customer_name}</p>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none font-bold text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-border bg-background">
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI Instant</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setPayingInvoice(null)} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-accent">Cancel</button>
                <button type="submit" disabled={recordingPayment} className="px-4 py-2 text-xs bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90">
                  {recordingPayment ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Quantity Modal */}
      {modifyingSub && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Mid-Cycle Plan / Quantity Modification</h3>
            <p className="text-xs text-muted-foreground">Plan: <strong>{modifyingSub.plan_name}</strong> (Current: ₹{modifyingSub.amount.toLocaleString("en-IN")})</p>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">New Seat / Quantity Multiplier</label>
                <input
                  type="number"
                  min="1"
                  value={newSeats}
                  onChange={(e) => setNewSeats(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold"
                />
              </div>
              <p className="text-xs text-muted-foreground">Automated mid-cycle day-rate proration adjustment invoice will be generated automatically.</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setModifyingSub(null)} className="px-4 py-2 text-xs border border-border rounded-lg hover:bg-accent">Cancel</button>
                <button type="button" onClick={() => handleModifyQuantity(modifyingSub.id)} className="px-4 py-2 text-xs bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90">Apply Adjustment</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
