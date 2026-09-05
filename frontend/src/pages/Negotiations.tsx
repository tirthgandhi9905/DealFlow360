import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Handshake, MessageSquare, Sparkles, CheckCircle2, ShieldAlert, ArrowRight, ExternalLink } from "lucide-react"

export default function Negotiations() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Portal Simulation State
  const [quotes, setQuotes] = useState<any[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("")
  const [portalData, setPortalData] = useState<any>(null)
  const [customerMsg, setCustomerMsg] = useState("")
  const [counterDisc, setCounterDisc] = useState<number | "">("")
  const [counterOptions, setCounterOptions] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)

  const fetchNegotiations = async () => {
    setLoading(true)
    try {
      const [nRes, qRes] = await Promise.all([
        api.get("/negotiations/?limit=50"),
        api.get("/quotes/?limit=20"),
      ])
      setNegotiations(nRes.data.items || [])
      setTotal(nRes.data.total || 0)
      setQuotes(qRes.data.items || [])
      if (qRes.data.items.length > 0 && !selectedQuoteId) {
        setSelectedQuoteId(qRes.data.items[0].id)
      }
    } catch (err) {
      console.error("Failed to load negotiations", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegotiations()
  }, [])

  // Load Portal Quote view
  useEffect(() => {
    if (!selectedQuoteId) return
    const loadPortalQuote = async () => {
      try {
        const res = await api.get(`/negotiations/portal/quote/${selectedQuoteId}`)
        setPortalData(res.data)
        setCounterOptions([])
        setConfirmStatus(null)
      } catch (err) {
        console.error("Failed to load portal quote view", err)
      }
    }
    loadPortalQuote()
  }, [selectedQuoteId])

  const handleSubmitRequest = async () => {
    if (!customerMsg) {
      alert("Please enter a customer message or counter request")
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post(`/negotiations/portal/quote/${selectedQuoteId}/submit-request`, {
        customer_request: customerMsg,
        counter_discount_percent: counterDisc ? Number(counterDisc) : null,
      })
      setCounterOptions(res.data.counter_options || [])
      setCustomerMsg("")
      // Reload portal data
      const pRes = await api.get(`/negotiations/portal/quote/${selectedQuoteId}`)
      setPortalData(pRes.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectOption = async (label: string) => {
    try {
      await api.post(`/negotiations/portal/quote/${selectedQuoteId}/select-option`, {
        selected_option: label,
      })
      alert(`Selected option: ${label}`)
      const pRes = await api.get(`/negotiations/portal/quote/${selectedQuoteId}`)
      setPortalData(pRes.data)
    } catch (err: any) {
      alert("Failed to select option")
    }
  }

  const handleConfirmQuote = async () => {
    try {
      const res = await api.post(`/negotiations/portal/quote/${selectedQuoteId}/confirm`, {
        comments: "Agreed to negotiated terms via portal",
      })
      setConfirmStatus(res.data.message)
      const pRes = await api.get(`/negotiations/portal/quote/${selectedQuoteId}`)
      setPortalData(pRes.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to confirm quotation")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Customer Portal & AI Negotiation Hub</h2>
        <p className="text-sm text-muted-foreground">Interactive customer negotiation simulator with AI counter-proposals and automated approval re-routing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Internal Negotiations Overview */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" /> Active Deal Negotiations ({total})
          </h3>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {negotiations.map((n) => (
              <div key={n.id} className="p-3 rounded-lg border border-border bg-accent/20 space-y-1.5 text-xs">
                <div className="flex justify-between font-bold">
                  <span>{n.deal_number} • {n.customer_name}</span>
                  <span className="text-primary">{n.round_count} Rounds</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deal: ₹{n.deal_amount.toLocaleString("en-IN")}</span>
                  <span>Margin: {n.deal_margin}%</span>
                </div>
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border flex justify-between">
                  <span>Concession Budget Rem:</span>
                  <span className="font-bold text-emerald-600">₹{(n.concession_budget?.remaining || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Live Customer Portal Simulation */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="font-semibold text-base flex items-center gap-2 text-primary">
                <MessageSquare className="w-4 h-4" /> Live Customer Portal View (Public Restricted Sandbox)
              </h3>
              <p className="text-xs text-muted-foreground">Simulate customer perspective without leaking internal cost matrices</p>
            </div>
            <select
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background"
            >
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_number} — {q.customer_name} (₹{q.grand_total.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {portalData ? (
            <div className="space-y-4">
              {/* Quote Banner */}
              <div className="p-4 rounded-lg bg-accent/30 border border-border flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-sm">{portalData.quote_number} • {portalData.customer_name}</h4>
                  <span className="text-xs text-muted-foreground">Status: <strong className="uppercase">{portalData.deal_status}</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block font-semibold">Total Price (incl. Tax)</span>
                  <span className="text-xl font-bold text-primary">₹{portalData.grand_total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Status / Confirm Notification */}
              {confirmStatus && (
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {confirmStatus}
                </div>
              )}

              {/* Negotiation Rounds History */}
              {portalData.negotiation?.rounds?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-muted-foreground">Negotiation Rounds ({portalData.negotiation.rounds.length})</span>
                  <div className="space-y-2">
                    {portalData.negotiation.rounds.map((r: any) => (
                      <div key={r.round_number} className="p-3 rounded-lg border border-border bg-background text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span className="text-primary">Round {r.round_number} Customer Request:</span>
                          <span className="text-muted-foreground">{r.selected_option ? `Selected: ${r.selected_option}` : "Pending Choice"}</span>
                        </div>
                        <p className="text-muted-foreground italic">"{r.customer_request}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Counter-Options Generated */}
              {counterOptions.length > 0 && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-primary">
                    <Sparkles className="w-4 h-4 text-amber-500" /> AI Generated Pareto-Optimal Counter Proposals
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    {counterOptions.map((opt, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border bg-card space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="font-bold block text-foreground">{opt.label}</span>
                          <p className="text-[11px] text-muted-foreground mt-1">{opt.rationale || opt.extras}</p>
                        </div>
                        <button
                          onClick={() => handleSelectOption(opt.label)}
                          className="w-full py-1.5 mt-2 bg-primary text-primary-foreground font-semibold rounded text-xs hover:opacity-90"
                        >
                          Accept Option
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Action Inputs */}
              <div className="space-y-3 pt-2 border-t border-border">
                <label className="block text-xs font-semibold uppercase text-muted-foreground">Customer Negotiation Message / Counter Offer</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Can you match competitor pricing or provide free support?"
                    value={customerMsg}
                    onChange={(e) => setCustomerMsg(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Counter Disc %"
                    value={counterDisc}
                    onChange={(e) => setCounterDisc(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className="w-32 px-3 py-2 text-xs rounded-lg border border-border bg-background focus:outline-none"
                  />
                  <button
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                    className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Generating AI Options..." : "Submit Request"}
                  </button>
                </div>
              </div>

              {/* Confirm Quote Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleConfirmQuote}
                  className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  Confirm & Finalize Quotation
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Select a quotation to open the portal view.</p>
          )}
        </div>
      </div>
    </div>
  )
}
