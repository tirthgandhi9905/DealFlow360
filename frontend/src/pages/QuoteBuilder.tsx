import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { ShoppingCart, Plus, Trash2, ArrowLeft, Zap, ShieldCheck, AlertTriangle, ArrowUpRight, CheckCircle2, Sparkles, Building, Package } from "lucide-react"

export default function QuoteBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Live Upsell & Telemetry
  const [upsellData, setUpsellData] = useState<any>(null)
  const [submissionResult, setSubmissionResult] = useState<any>(null)

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [cRes, pRes] = await Promise.all([
          api.get("/customers/?limit=100"),
          api.get("/products/?limit=100"),
        ])
        setCustomers(cRes.data.items || [])
        setProducts(pRes.data.items || [])

        if (id && id !== "new") {
          // Load existing quote
          const qRes = await api.get(`/quotes/${id}`)
          const quote = qRes.data
          setSelectedCustomer(quote.customer_name ? (cRes.data.items.find((c: any) => c.name === quote.customer_name)?.id || "") : "")
          if (quote.lines) {
            setLines(
              quote.lines.map((l: any) => ({
                product_id: l.product_id,
                quantity: l.quantity,
                unit_price: l.unit_price,
                discount_percent: l.discount_percent,
              }))
            )
          }
        } else if (cRes.data.items.length > 0) {
          setSelectedCustomer(cRes.data.items[0].id)
        }
      } catch (err) {
        console.error("Failed to initialize QuoteBuilder", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  // Track customer selection
  useEffect(() => {
    if (selectedCustomer) {
      const c = customers.find((cust) => cust.id === selectedCustomer)
      setCustomerDetails(c || null)
    }
  }, [selectedCustomer, customers])

  // Live upsell calculation whenever cart changes
  useEffect(() => {
    const calculateUpsell = async () => {
      if (lines.length === 0) {
        setUpsellData(null)
        return
      }
      try {
        const payload = {
          customer_id: selectedCustomer || undefined,
          lines: lines.map((l) => ({
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
            discount_percent: l.discount_percent,
          })),
        }
        const res = await api.post("/quotes/upsell-suggestions", payload)
        setUpsellData(res.data)
      } catch (err) {
        console.error("Live upsell check failed", err)
      }
    }
    const timer = setTimeout(() => {
      calculateUpsell()
    }, 200)
    return () => clearTimeout(timer)
  }, [lines, selectedCustomer])

  const addProductToCart = (prodId?: string) => {
    const p = prodId ? products.find((prod) => prod.id === prodId) : products[0]
    if (!p) return
    setLines([
      ...lines,
      {
        product_id: p.id,
        quantity: 1,
        unit_price: p.base_price,
        discount_percent: 0,
      },
    ])
  }

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines]
    newLines[index][field] = value
    if (field === "product_id") {
      const p = products.find((prod) => prod.id === value)
      if (p) newLines[index].unit_price = p.base_price
    }
    setLines(newLines)
  }

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleCreateQuote = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer account")
      return
    }
    if (lines.length === 0) {
      alert("Please add at least one line item to the quotation")
      return
    }

    setSaving(true)
    setSubmissionResult(null)
    try {
      const payload = {
        customer_id: selectedCustomer,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent),
        })),
        notes,
      }
      const res = await api.post("/quotes/", payload)
      setSubmissionResult(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create quotation")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading quotation builder...</div>
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/quotes")} className="p-2 border border-border rounded-lg hover:bg-accent">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Interactive Quotation Builder</h2>
            <p className="text-sm text-muted-foreground">Self-governing deal engine with live margin tracking and automated approval routing</p>
          </div>
        </div>

        <button
          onClick={handleCreateQuote}
          disabled={saving || lines.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
        >
          <Zap className="w-4 h-4" /> {saving ? "Dispatching..." : "Submit Quotation & Enforce Rules"}
        </button>
      </div>

      {/* Result Alert / Routing Status Banner */}
      {submissionResult && (
        <div className={`p-5 rounded-xl border ${
          submissionResult.auto_approved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300" : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
        } space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-base flex items-center gap-2">
              {submissionResult.auto_approved ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
              {submissionResult.auto_approved ? "Quotation Auto-Approved & Confirmed!" : `Quotation Routed for ${submissionResult.deal.required_approval_level.toUpperCase()} Approval`}
            </span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-background">
              Deal: {submissionResult.deal.deal_number} • Quote: {submissionResult.quote.quote_number}
            </span>
          </div>
          <p className="text-sm">
            Total Amount: <strong>₹{submissionResult.quote.grand_total.toLocaleString("en-IN")}</strong> • Margin: <strong>{submissionResult.deal.margin_percent}%</strong> • Blended Risk Score: <strong>{submissionResult.deal.risk_score}/100</strong>
          </p>
          <div className="pt-2 flex gap-3">
            <button onClick={() => navigate("/quotes")} className="text-xs underline font-semibold">View Quotations List</button>
            <button onClick={() => navigate("/approvals")} className="text-xs underline font-semibold">View Approvals Pipeline</button>
          </div>
        </div>
      )}

      {/* Main Grid: Builder on Left, Live Upsell & Telemetry on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Customer + Cart Lines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" /> Target Customer Account & Governance Tier
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Select Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier.toUpperCase()} Tier)
                    </option>
                  ))}
                </select>
              </div>
              {customerDetails && (
                <div className="p-3 rounded-lg border border-border bg-accent/20 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount Ceiling:</span>
                    <span className="font-bold text-foreground">
                      {customerDetails.tier === "gold" ? "Up to 15%" : customerDetails.tier === "silver" ? "Up to 10%" : "Up to 5%"} Max Disc
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account LTV:</span>
                    <span className="font-semibold">₹{(customerDetails.lifetime_value || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="text-muted-foreground truncate">{customerDetails.address || customerDetails.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Quotation Line Items ({lines.length})
              </h3>
              <button
                onClick={() => addProductToCart()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Line
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl space-y-3">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm">No items in quotation cart yet.</p>
                <button
                  onClick={() => addProductToCart()}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90"
                >
                  Add First Product
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line, idx) => {
                  const currentProd = products.find((p) => p.id === line.product_id)
                  const lineSubtotal = (line.unit_price || 0) * (line.quantity || 1)
                  const lineNet = lineSubtotal * (1 - (line.discount_percent || 0) / 100)

                  return (
                    <div key={idx} className="p-3.5 rounded-lg border border-border bg-accent/10 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">Product</label>
                          <select
                            value={line.product_id}
                            onChange={(e) => updateLine(idx, "product_id", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (₹{p.base_price.toLocaleString("en-IN")})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">Disc %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={line.discount_percent}
                            onChange={(e) => updateLine(idx, "discount_percent", parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-md border border-border bg-background font-semibold"
                          />
                        </div>

                        <div className="sm:col-span-2 text-right">
                          <label className="block text-[10px] font-semibold uppercase text-muted-foreground mb-1">Line Total</label>
                          <span className="font-bold text-xs">₹{lineNet.toLocaleString("en-IN")}</span>
                        </div>

                        <div className="sm:col-span-1 text-right">
                          <button onClick={() => removeLine(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Live Margin Telemetry & Upsell Panel */}
        <div className="space-y-6">
          {/* Live Margin Indicator */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Real-Time Margin & Pricing Indicator
            </h3>
            {upsellData ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Order Revenue:</span>
                  <span className="font-bold">₹{upsellData.current_cart.total_revenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border">
                  <span className="text-muted-foreground">Order Cost:</span>
                  <span className="text-muted-foreground">₹{upsellData.current_cart.total_cost.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-2 bg-emerald-500/10 px-3 rounded-lg border border-emerald-500/20">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">Live Margin:</span>
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-base">
                    {upsellData.current_cart.current_margin_percent}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Add products to calculate live order margin.</p>
            )}
          </div>

          {/* Live Upsell & Cross-Sell Panel */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Live Upsell Suggestions
              </h3>
              <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Margin Boost</span>
            </div>

            {upsellData?.suggestions?.length > 0 ? (
              <div className="space-y-3">
                {upsellData.suggestions.map((sug: any) => (
                  <div key={sug.product_id} className="p-3 rounded-lg border border-border bg-accent/20 space-y-2 hover:border-primary/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs">{sug.name}</h4>
                        <span className="text-[10px] text-muted-foreground uppercase">{sug.category} • ₹{sug.base_price.toLocaleString("en-IN")}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" /> +{sug.margin_delta_if_added}% Margin
                      </span>
                    </div>
                    {sug.promotion_tag && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                        {sug.promotion_tag}
                      </span>
                    )}
                    <button
                      onClick={() => addProductToCart(sug.product_id)}
                      className="w-full py-1.5 mt-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add to Quote
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Add items to view automated cross-sell recommendations.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
