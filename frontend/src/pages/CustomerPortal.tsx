import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { Check, X, Download, Building, Phone, Mail, MessageSquare } from "lucide-react"

// This page is public — no auth required. Uses raw axios instead of `api` (which auto-injects token & 401 redirects to /login).
const publicApi = axios.create({ baseURL: "/api" })

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function CustomerPortal() {
  const { token } = useParams()
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [request, setRequest] = useState("")
  const [counterPct, setCounterPct] = useState<number | "">("")
  const [busy, setBusy] = useState("")
  const [proposal, setProposal] = useState<any>(null)

  // token could either be a Quote UUID or a Deal UUID passed as a token. Try quote-view endpoint first.
  const load = () => {
    if (!token) return
    setError("")
    publicApi
      .get(`/negotiations/portal/quote/${token}`)
      .then((r) => setQuote(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Portal link invalid or expired"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const submitRequest = async () => {
    if (!request.trim()) return alert("Describe your request")
    setBusy("submit")
    try {
      const r = await publicApi.post(`/negotiations/portal/quote/${token}/submit-request`, {
        customer_request: request,
        counter_discount_percent: counterPct === "" ? undefined : Number(counterPct),
      })
      setProposal(r.data)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to submit request")
    } finally {
      setBusy("")
    }
  }

  const selectOption = async (label: string) => {
    setBusy("select-" + label)
    try {
      await publicApi.post(`/negotiations/portal/quote/${token}/select-option`, {
        selected_option: label,
      })
      alert(`Option "${label}" recorded. You can now confirm the quote.`)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to select option")
    } finally {
      setBusy("")
    }
  }

  const confirmQuote = async () => {
    setBusy("confirm")
    try {
      const r = await publicApi.post(`/negotiations/portal/quote/${token}/confirm`, {
        comments: "Customer confirmed via portal",
      })
      alert(r.data.message)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to confirm")
    } finally {
      setBusy("")
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse bg-background">Loading portal...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-destructive bg-background">{error}</div>
  if (!quote) return null

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="bg-primary text-primary-foreground py-4 px-6 md:px-12 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            <span className="font-bold text-lg leading-none">D</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">DealFlow360 Customer Portal</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="hidden md:inline-block opacity-80">{quote.customer_name}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 md:px-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">{quote.quote_number}</h2>
            <p className="text-muted-foreground">
              Deal {quote.deal_number} · Status: <span className="capitalize">{String(quote.deal_status).replace(/_/g, " ")}</span>
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-white rounded shadow-sm text-sm font-medium hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        <div className="bg-white border border-border shadow-sm rounded-lg overflow-hidden mb-8">
          <div className="p-8 border-b border-border flex justify-between">
            <div>
              <h3 className="font-bold text-lg mb-4 text-primary">From</h3>
              <p className="font-medium text-foreground">DealFlow360 Solutions Inc.</p>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p className="flex items-center gap-2"><Building className="w-3.5 h-3.5" /> Gandhinagar, IN</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +91 555 123 4567</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> sales@dealflow360.in</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="font-bold text-lg mb-4 text-primary">To</h3>
              <p className="font-medium text-foreground">{quote.customer_name}</p>
            </div>
          </div>

          <div className="p-8">
            <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">Order Lines</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Qty</th>
                  <th className="pb-3 font-medium text-right">Unit</th>
                  <th className="pb-3 font-medium text-right">Disc</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quote.lines.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-4 font-medium">
                      {item.product_name}
                      <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                    </td>
                    <td className="py-4 text-right">{item.quantity}</td>
                    <td className="py-4 text-right">{inr(item.unit_price)}</td>
                    <td className="py-4 text-right">{item.discount_percent}%</td>
                    <td className="py-4 text-right font-medium">{inr(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-8 border-t border-border flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{inr(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span>-{inr(quote.total_discount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{inr(quote.tax_amount)}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between font-bold text-lg">
                <span>Grand Total</span>
                <span>{inr(quote.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Negotiation panel */}
        <div className="bg-white border border-border shadow-sm rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Negotiate this quote
          </h3>
          <div className="space-y-3">
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              placeholder="e.g. Can we get 12% additional discount on the hardware lines?"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Counter %"
                value={counterPct}
                onChange={(e) => setCounterPct(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-32 text-sm border border-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={submitRequest}
                disabled={busy === "submit"}
                className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all disabled:opacity-50"
              >
                {busy === "submit" ? "Generating…" : "Get AI Counter-Proposals"}
              </button>
            </div>
          </div>

          {proposal?.counter_options && proposal.counter_options.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase">Round {proposal.round_number} — Counter Options</h4>
              {proposal.counter_options.map((opt: any, i: number) => {
                const label = opt.label || opt.name || `Option ${String.fromCharCode(65 + i)}`
                return (
                  <div key={i} className="p-4 border border-border rounded-lg bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{label}</p>
                      <button
                        onClick={() => selectOption(label)}
                        disabled={busy === "select-" + label}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
                      >
                        Select
                      </button>
                    </div>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{typeof opt === "string" ? opt : JSON.stringify(opt, null, 2)}</pre>
                  </div>
                )
              })}
            </div>
          )}

          {quote.negotiation?.rounds && quote.negotiation.rounds.length > 0 && !proposal && (
            <div className="mt-6 text-xs text-muted-foreground">
              History: {quote.negotiation.rounds.length} round(s) already recorded.
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="bg-white border border-border shadow-sm rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Ready to proceed?</h3>
            <p className="text-sm text-muted-foreground mt-1">Confirming will route back for final approval if terms exceed threshold; otherwise moves to fulfillment.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 border border-border bg-white rounded shadow-sm text-sm font-medium hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4 text-destructive" /> Reject
            </button>
            <button
              onClick={confirmQuote}
              disabled={busy === "confirm"}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded shadow-sm text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {busy === "confirm" ? "Confirming…" : "Accept & Sign"}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
