import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { mockApi } from "@/mocks/handlers"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { Save, Send, Plus, AlertCircle, CheckCircle2, TrendingUp, Sparkles, X } from "lucide-react"

export default function QuoteBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'
  
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(!isNew)
  const [items, setItems] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const products = await mockApi.products.list()
      setAllProducts(products)
      
      if (!isNew) {
        const data = await mockApi.quotes.get(id!)
        setQuote(data)
        if (data) setItems(data.items)
      } else {
        setItems([ { product: products[0], quantity: 1, unitPrice: products[0].basePrice, discount: 0 } ])
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-8 text-center animate-pulse">Loading quote builder...</div>

  const updateItem = (index: number, field: string, value: number) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const discountTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discount / 100)), 0)
  const total = subtotal - discountTotal
  
  // Calculate average margin
  const totalCost = items.reduce((sum, item) => {
    const cost = item.unitPrice * (1 - (item.product.margin / 100))
    return sum + (cost * item.quantity)
  }, 0)
  
  const currentMargin = total > 0 ? ((total - totalCost) / total) * 100 : 0
  const riskScore = currentMargin < 20 ? 85 : currentMargin < 30 ? 45 : 12

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 animate-in fade-in">
      {/* Header */}
      <div className="bg-surface border-b border-border p-6 flex justify-between items-center shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-foreground">
              {isNew ? 'New Quotation' : `Quotation ${id}`}
            </h2>
            <StatusBadge status={quote?.status || 'draft'} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isNew ? 'Drafting for new customer' : `For ${quote?.customer?.name}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-slate-50 text-sm transition-colors">
            <Save className="w-4 h-4" /> Save Draft
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all shadow-lg shadow-primary/20">
            <Send className="w-4 h-4" /> Submit for Approval
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content (Lines) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 w-24">Qty</th>
                  <th className="px-4 py-3 w-32">Unit Price</th>
                  <th className="px-4 py-3 w-32">Discount %</th>
                  <th className="px-4 py-3 w-32">Final Price</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item, idx) => {
                  const overLimit = item.discount > item.product.maxDiscount
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-4 py-4">
                        <div className="font-medium text-foreground">{item.product.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                          Max allowed discount: {item.product.maxDiscount}%
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input 
                          type="number" min="1" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-background border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-4 py-4">${item.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-4">
                        <div className="relative flex items-center">
                          <input 
                            type="number" min="0" max="100" 
                            value={item.discount} 
                            onChange={(e) => updateItem(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className={`w-full bg-background border rounded px-2 py-1 pr-7 focus:outline-none ${overLimit ? 'border-destructive focus:ring-destructive' : 'border-border focus:ring-primary focus:ring-1'}`}
                          />
                          <span className="absolute right-2 text-muted-foreground">%</span>
                        </div>
                        {overLimit && (
                          <div className="text-[10px] text-destructive flex items-center gap-1 mt-1 absolute">
                            <AlertCircle className="w-3 h-3" /> Requires Approval
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 font-medium">
                        ${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <div className="p-4 border-t border-border bg-slate-50 flex justify-between items-center">
              <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
                <Plus className="w-4 h-4" /> Add Line Item
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar (Summary & Upsell) */}
        <div className="w-80 border-l border-border bg-surface flex flex-col overflow-y-auto shrink-0">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground mb-4">Deal Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>-${discountTotal.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border my-2"></div>
              <div className="flex justify-between font-bold text-lg text-foreground">
                <span>Total</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground mb-4">Deal Health</h3>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Blended Margin</span>
                <span className={currentMargin < 30 ? 'text-destructive font-medium' : 'text-success font-medium'}>
                  {currentMargin.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${currentMargin < 30 ? 'bg-destructive' : currentMargin < 40 ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(currentMargin, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">AI Risk Score</span>
                <span className="font-medium">{riskScore}/100</span>
              </div>
              <div className="flex gap-2">
                {riskScore > 30 && (
                  <div className="flex items-start gap-2 bg-destructive/10 text-destructive p-3 rounded-lg text-xs leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    High discount requested on hardware products requires VP approval.
                  </div>
                )}
                {riskScore <= 30 && (
                  <div className="flex items-center gap-2 bg-success/10 text-success p-3 rounded-lg text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Auto-approval likely
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-b from-primary/5 to-transparent flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" /> 
              Suggested Upsells
            </h3>
            
            <div className="space-y-3">
              {allProducts.slice(2, 4).map(product => (
                <div key={product.id} className="p-3 rounded-lg border border-primary/20 bg-surface shadow-sm hover:border-primary/50 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm group-hover:text-primary transition-colors">{product.name}</span>
                    <span className="text-sm font-semibold">${product.basePrice}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-success flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +{product.margin}% Margin
                    </span>
                    <button 
                      onClick={() => setItems([...items, { product, quantity: 1, unitPrice: product.basePrice, discount: 0 }])}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
