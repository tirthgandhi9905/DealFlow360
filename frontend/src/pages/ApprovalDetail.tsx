import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { mockApi } from "@/mocks/handlers"
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge"
import { Check, X, AlertTriangle, ArrowLeft, Send } from "lucide-react"

export default function ApprovalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [deal, setDeal] = useState<any>(null)
  
  useEffect(() => {
    const load = async () => {
      setDeal(await mockApi.quotes.get(id!))
    }
    load()
  }, [id])

  if (!deal) return <div className="p-8 text-center animate-pulse">Loading deal details...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-surface rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">Approval Request: {deal.id}</h2>
            <StatusBadge status={deal.status as StatusType} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{deal.customer.name} • Submitted {new Date(deal.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Risk Assessment</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Commercial Risk (Margin: {deal.margin}%)</span>
                  <span className="font-medium">High</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-destructive w-[85%]" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Customer Risk (Payment History)</span>
                  <span className="font-medium text-success">Low</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-success w-[15%]" />
                </div>
              </div>
              
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg mt-4 flex gap-3 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p>This deal requests a discount that drops margin to {deal.margin}%, which is below the 40% policy threshold. Executive approval required.</p>
              </div>
            </div>
          </div>
          
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Line Items</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Qty</th>
                  <th className="pb-2">Discount</th>
                  <th className="pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deal.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 font-medium">{item.product.name}</td>
                    <td className="py-3">{item.quantity}</td>
                    <td className="py-3">
                      <span className={item.discount > item.product.maxDiscount ? 'text-destructive font-bold' : ''}>
                        {item.discount}%
                      </span>
                    </td>
                    <td className="py-3">${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-success hover:bg-success/90 text-white font-medium transition-all shadow-lg shadow-success/20">
                <Check className="w-4 h-4" /> Approve Deal
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-warning hover:bg-warning/90 text-warning-foreground font-medium transition-all shadow-lg shadow-warning/20">
                <Send className="w-4 h-4" /> Return to Rep
              </button>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 font-medium transition-colors">
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
          
          <div className="glass rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Approval Chain</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div className="w-px h-10 bg-success my-1" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sales Manager</p>
                  <p className="text-xs text-muted-foreground">Approved 2h ago</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full border-2 border-primary bg-background flex items-center justify-center shrink-0" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">VP of Sales (You)</p>
                  <p className="text-xs text-primary font-medium">Pending Action</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
