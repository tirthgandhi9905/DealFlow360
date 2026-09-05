import { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import api from "@/lib/api"
import { Send, Plus, AlertCircle, CheckCircle2, TrendingUp, Sparkles, X, Pencil, Lock, Zap } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

interface Product {
  id: string
  name: string
  sku: string
  category: string
  base_price: number
  cost: number
  margin_percent: number
  is_subscription?: boolean
}

interface Customer {
  id: string
  name: string
  tier: string
  industry?: string
}

interface Line {
  product: Product
  quantity: number
  unit_price: number
  discount_percent: number
}

export default function QuoteBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const isNew = !id || id === "new"
  const isEdit = !isNew && location.pathname.endsWith("/edit")
  const isView = !isNew && !isEdit
  const canEdit = isNew || isEdit

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [savedResult, setSavedResult] = useState<any>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [lines, setLines] = useState<Line[]>([])
  const [upsell, setUpsell] = useState<any>({ current_cart: {}, suggestions: [] })
  const [showAddPicker, setShowAddPicker] = useState(false)

  // Digital Twin state
  const [showTwinModal, setShowTwinModal] = useState(false)
  const [twinLoading, setTwinLoading] = useState(false)
  const [twinAlternatives, setTwinAlternatives] = useState<any[]>([])

  const [quoteMeta, setQuoteMeta] = useState<any>(null)

  useEffect(() => {
    const boot = async () => {
      try {
        const [prodRes, custRes] = await Promise.all([
          api.get("/products/", { params: { limit: 100, is_active: true } }),
          api.get("/customers/", { params: { limit: 100 } }),
        ])
        const prodItems: Product[] = prodRes.data.items || []
        const custItems: Customer[] = custRes.data.items || []
        setProducts(prodItems)
        setCustomers(custItems)

        if (!isNew && id) {
          const q = await api.get(`/quotes/${id}`)
          const data = q.data
          setQuoteMeta(data)
          setSelectedCustomer(data.customer_id || "")
          const restoredLines: Line[] = (data.lines || [])
            .map((l: any): Line | null => {
              const prod = prodItems.find((p) => p.id === l.product_id)
              if (!prod) return null
              return {
                product: prod,
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount_percent: l.discount_percent,
              }
            })
            .filter((x: Line | null): x is Line => x !== null)
          setLines(restoredLines)

          if (isEdit && !data.editable) {
            setError(`This quote is no longer editable (deal is ${data.deal_status}). Redirecting to view mode…`)
            setTimeout(() => navigate(`/quotes/${id}`, { replace: true }), 2500)
          }
        } else {
          if (custItems[0]) setSelectedCustomer(custItems[0].id)
          if (prodItems[0]) {
            setLines([{ product: prodItems[0], quantity: 1, unit_price: prodItems[0].base_price, discount_percent: 0 }])
          }
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || "Failed to load quote builder")
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [id, isNew, isEdit])

  useEffect(() => {
    if (!canEdit || lines.length === 0) {
      setUpsell({ current_cart: {}, suggestions: [] })
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const payload = {
          customer_id: selectedCustomer || undefined,
          lines: lines.map((l) => ({
            product_id: l.product.id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
          })),
        }
        const r = await api.post("/quotes/upsell-suggestions", payload)
        setUpsell(r.data)
      } catch {
        /* silently ignore */
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [lines, selectedCustomer, canEdit])

  const updateLine = (index: number, field: keyof Line, value: any) => {
    const next = [...lines]
    ;(next[index] as any)[field] = value
    setLines(next)
  }

  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index))

  const addProduct = (prod: Product) => {
    setLines([...lines, { product: prod, quantity: 1, unit_price: prod.base_price, discount_percent: 0 }])
    setShowAddPicker(false)
  }

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
    const discount = lines.reduce((s, l) => s + l.quantity * l.unit_price * (l.discount_percent / 100), 0)
    const net = subtotal - discount
    const cost = lines.reduce((s, l) => s + l.product.cost * l.quantity, 0)
    const margin = net > 0 ? ((net - cost) / net) * 100 : 0
    return { subtotal, discount, net, margin }
  }, [lines])

  const loadTwinAlternatives = async () => {
    if (!selectedCustomer) return alert("Select a customer first.")
    setShowTwinModal(true)
    setTwinLoading(true)
    try {
      const cust = customers.find(c => c.id === selectedCustomer)
      const context = JSON.stringify({
        customer: cust?.name,
        tier: cust?.tier,
        subtotal: totals.subtotal,
        discount: totals.discount,
        margin: totals.margin,
        lines: lines.map(l => ({ name: l.product.name, qty: l.quantity, disc: l.discount_percent }))
      })
      const policies = "Strict finance rules: limit overall discount to 15% for non-enterprise. Favor software/services to boost margin."
      
      const r = await api.post("/quotes/find-better-deal", { deal_context: context, policies })
      setTwinAlternatives(r.data.alternatives || [])
    } catch (e) {
      console.error(e)
    } finally {
      setTwinLoading(false)
    }
  }

  const applyTwinAlternative = (alt: any) => {
    if (alt.changes.discount_percent !== undefined) {
      setLines(lines.map(l => ({ ...l, discount_percent: alt.changes.discount_percent })))
    }
    if (alt.changes.quantity_increase) {
      setLines(lines.map(l => ({ ...l, quantity: l.quantity + Math.floor(l.quantity * 0.2) })))
    }
    setShowTwinModal(false)
  }

  const submitQuote = async () => {
    if (!selectedCustomer) return alert("Pick a customer first.")
    if (lines.length === 0) return alert("Add at least one line item.")
    setSubmitting(true)
    setError("")
    try {
      const payload = {
        customer_id: selectedCustomer,
        lines: lines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
        })),
      }

      if (isEdit && id) {
        const r = await api.patch(`/quotes/${id}`, { lines: payload.lines })
        setSavedResult(r.data)
      } else {
        const r = await api.post("/quotes/", payload)
        setSavedResult(r.data)
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === "string" ? detail : "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center animate-pulse">Loading quote builder...</div>

  const headerTitle = isNew
    ? "New Quotation"
    : isEdit
      ? `Editing ${quoteMeta?.quote_number || ""}`
      : `Quotation ${quoteMeta?.quote_number || id?.slice(0, 8)}`

  const headerSubtitle = isNew
    ? "Real-time risk routing + AI upsell"
    : isEdit
      ? `In-place edit — approval will be re-triggered. Deal status: ${quoteMeta?.deal_status || "?"}`
      : `Read-only view · Deal ${quoteMeta?.deal_number || ""} · Status: ${quoteMeta?.deal_status || "?"}`

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 animate-in fade-in relative">
      {/* Header */}
      <div className="bg-surface border-b border-border p-6 flex justify-between items-center shrink-0 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {isEdit && <Pencil className="w-5 h-5 text-primary" />}
            {isView && !quoteMeta?.editable && <Lock className="w-5 h-5 text-muted-foreground" />}
            {headerTitle}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{headerSubtitle}</p>
          {(quoteMeta?.edit_count ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1 italic">
              Last edited by <span className="font-medium text-foreground">{quoteMeta.last_edited_by_name || "unknown"}</span>
              {quoteMeta.last_edited_at && (
                <> on <span className="font-medium text-foreground">{new Date(quoteMeta.last_edited_at).toLocaleString()}</span></>
              )}
              {" · "}<span>{quoteMeta.edit_count} edit(s)</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {canEdit && (
            <>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                disabled={isEdit}
                className="px-3 py-2 rounded-lg border border-border bg-white text-sm min-w-[220px] disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">Select customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({String(c.tier).toUpperCase()})
                  </option>
                ))}
              </select>
              <button
                onClick={loadTwinAlternatives}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" /> Deal Twin
              </button>
              <button
                onClick={submitQuote}
                disabled={submitting || lines.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting
                  ? (isEdit ? "Saving…" : "Submitting…")
                  : (isEdit ? "Save Changes" : "Create Quote & Deal")}
              </button>
            </>
          )}
          {isView && quoteMeta?.editable && (
            <button
              onClick={() => navigate(`/quotes/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-all"
            >
              <Pencil className="w-4 h-4" /> Edit this Quote
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {savedResult && (
        <div className="m-4 p-4 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
          <p className="font-semibold mb-1">
            ✓ {isEdit ? "Quote updated" : "Quote created"}: {savedResult.quote?.quote_number} for {savedResult.deal?.deal_number}
          </p>
          <p className="text-xs">
            Status: <span className="font-medium capitalize">{String(savedResult.deal?.status).replace(/_/g, " ")}</span>
            {" · "}Risk: {savedResult.deal?.risk_score}/100
            {" · "}{savedResult.auto_approved ? "Auto-approved" : `Routed to: ${savedResult.deal?.required_approval_level}`}
            {isEdit && savedResult.quote?.edit_count && (
              <> · Edit count: {savedResult.quote.edit_count}</>
            )}
          </p>
          <div className="mt-3 flex gap-3 text-xs flex-wrap">
            <button onClick={() => navigate("/quotes")} className="underline">→ Go to Quotes list</button>
            <button
              onClick={() => window.open(`/portal/${savedResult.quote?.id}`, "_blank", "noopener")}
              className="underline"
            >
              → Open Customer Portal (new tab)
            </button>
            {savedResult.approval_id && (
              <button onClick={() => navigate(`/approvals/${savedResult.approval_id}`)} className="underline">
                → Go to Approval
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Line items */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 w-24">Qty</th>
                  <th className="px-4 py-3 w-32">Unit Price</th>
                  <th className="px-4 py-3 w-32">Discount %</th>
                  <th className="px-4 py-3 w-32">Final</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line, idx) => {
                  const finalPrice = line.quantity * line.unit_price * (1 - line.discount_percent / 100)
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{line.product.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {String(line.product.category).replace(/_/g, " ")} · margin {line.product.margin_percent}%
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number" min="1"
                          value={line.quantity}
                          disabled={!canEdit}
                          onChange={(e) => updateLine(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="w-full bg-background border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.unit_price}
                          disabled={!canEdit}
                          onChange={(e) => updateLine(idx, "unit_price", parseFloat(e.target.value) || 0)}
                          className="w-full bg-background border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative flex items-center">
                          <input
                            type="number" min="0" max="100"
                            value={line.discount_percent}
                            disabled={!canEdit}
                            onChange={(e) => updateLine(idx, "discount_percent", parseFloat(e.target.value) || 0)}
                            className="w-full bg-background border border-border rounded px-2 py-1 pr-7 focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
                          />
                          <span className="absolute right-2 text-muted-foreground">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium">{inr(finalPrice)}</td>
                      <td className="px-4 py-4">
                        {canEdit && (
                          <button onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {canEdit && (
              <div className="p-4 border-t border-border bg-slate-50 relative">
                <button
                  onClick={() => setShowAddPicker(!showAddPicker)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
                {showAddPicker && (
                  <div className="mt-3 max-h-64 overflow-y-auto border border-border rounded-lg bg-white">
                    {products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="w-full text-left px-4 py-2 border-b border-border last:border-b-0 hover:bg-slate-50 text-sm flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.sku} · {inr(p.base_price)}</div>
                        </div>
                        <span className="text-xs text-success">{p.margin_percent}% margin</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-border bg-surface flex flex-col overflow-y-auto shrink-0">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground mb-4">Deal Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{inr(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-{inr(totals.discount)}</span>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between font-bold text-lg text-foreground">
                <span>Total</span>
                <span>{inr(totals.net)}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground mb-4">Live Health</h3>
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Blended Margin</span>
                <span className={totals.margin < 30 ? "text-destructive font-medium" : totals.margin < 40 ? "text-warning font-medium" : "text-success font-medium"}>
                  {totals.margin.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${totals.margin < 30 ? "bg-destructive" : totals.margin < 40 ? "bg-warning" : "bg-success"}`}
                  style={{ width: `${Math.min(Math.max(totals.margin, 0), 100)}%` }}
                />
              </div>
            </div>

            {totals.margin < 20 && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive p-3 rounded-lg text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Very low margin — likely to require Finance approval.
              </div>
            )}
            {totals.margin >= 20 && totals.margin < 40 && (
              <div className="flex items-start gap-2 bg-warning/10 text-warning p-3 rounded-lg text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Mid-tier margin — may need Sales Manager sign-off.
              </div>
            )}
            {totals.margin >= 40 && (
              <div className="flex items-center gap-2 bg-success/10 text-success p-3 rounded-lg text-xs font-medium">
                <CheckCircle2 className="w-4 h-4" /> Healthy margin — auto-approval likely.
              </div>
            )}
          </div>

          {canEdit && (
            <div className="p-6 bg-gradient-to-b from-primary/5 to-transparent flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" /> AI Upsell Suggestions
              </h3>
              {upsell.suggestions?.length === 0 ? (
                <p className="text-xs text-muted-foreground">Add items to see suggestions.</p>
              ) : (
                <div className="space-y-3">
                  {upsell.suggestions.slice(0, 4).map((s: any) => {
                    const prod = products.find((p) => p.id === s.product_id)
                    return (
                      <div key={s.product_id} className="p-3 rounded-lg border border-primary/20 bg-surface shadow-sm hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className="text-sm font-semibold">{inr(s.base_price)}</span>
                        </div>
                        {s.promotion_tag && (
                          <div className="text-[10px] uppercase font-medium text-primary mb-1">{s.promotion_tag}</div>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-xs flex items-center gap-1 ${s.margin_delta_if_added > 0 ? "text-success" : "text-muted-foreground"}`}>
                            <TrendingUp className="w-3 h-3" />
                            {s.margin_delta_if_added > 0 ? "+" : ""}{s.margin_delta_if_added}% margin
                          </span>
                          {prod && (
                           <button
                              onClick={() => addProduct(prod)}
                              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Deal Digital Twin Modal */}
      {showTwinModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Deal Digital Twin</h3>
                  <p className="text-sm text-muted-foreground">AI-powered deal structure optimization</p>
                </div>
              </div>
              <button onClick={() => setShowTwinModal(false)} className="p-2 text-muted-foreground hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 bg-white min-h-[300px]">
              {twinLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse">
                  <Sparkles className="w-8 h-8 mb-4 text-blue-400" />
                  <p>Running multi-variable deal simulations...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-foreground font-medium mb-2">Simulated alternative structures for better margins & faster approval:</p>
                  {twinAlternatives.map((alt, i) => (
                    <div key={i} className="border border-border rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-blue-700">{alt.label}</h4>
                        <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">Impact: {alt.margin_impact}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{alt.rationale}</p>
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Expected Routing: <span className="capitalize">{String(alt.approval_level).replace('_', ' ')}</span>
                        </div>
                        <button 
                          onClick={() => applyTwinAlternative(alt)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
                        >
                          Apply to Quote
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {twinAlternatives.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">No better alternatives found. Your deal structure is optimal!</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
