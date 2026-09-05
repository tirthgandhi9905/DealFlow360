import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { mockApi } from "@/mocks/handlers"
import { Check, X, FileText, Download, Building, Phone, Mail } from "lucide-react"

export default function CustomerPortal() {
  const { token } = useParams()
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Use a hardcoded mock deal if token is just for show, or fetch real one
  useEffect(() => {
    const load = async () => {
      // In reality, this would fetch by token. We just grab the first mock deal.
      const deals = await mockApi.quotes.list()
      setDeal(deals[0])
      setLoading(false)
    }
    load()
  }, [token])

  if (loading || !deal) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground animate-pulse bg-background">Loading portal...</div>
  }

  const subtotal = deal.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
  const discount = deal.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * (item.discount / 100)), 0)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Portal Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 md:px-12 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            <span className="font-bold text-lg leading-none">D</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">DealFlow360 Customer Portal</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="hidden md:inline-block opacity-80">Logged in as {deal.customer.name}</span>
          <button className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded transition-colors">Log out</button>
        </div>
      </header>

      {/* Portal Body */}
      <main className="max-w-4xl mx-auto py-8 px-4 md:px-0">
        
        {/* Deal Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">Quotation {deal.id}</h2>
            <p className="text-muted-foreground">Please review your quotation details below.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-border bg-white rounded shadow-sm text-sm font-medium hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>

        {/* Paper Sheet */}
        <div className="bg-white border border-border shadow-sm rounded-lg overflow-hidden mb-8">
          
          <div className="p-8 border-b border-border flex justify-between">
            <div>
              <h3 className="font-bold text-lg mb-4 text-primary">From</h3>
              <p className="font-medium text-foreground">DealFlow360 Solutions Inc.</p>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p className="flex items-center gap-2"><Building className="w-3.5 h-3.5" /> 123 Tech Blvd, Suite 400</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +1 (555) 123-4567</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> sales@dealflow360.com</p>
              </div>
            </div>
            
            <div className="text-right">
              <h3 className="font-bold text-lg mb-4 text-primary">To</h3>
              <p className="font-medium text-foreground">{deal.customer.name}</p>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>{deal.customer.industry} Sector</p>
                <p>Valid Until: {new Date(Date.now() + 15 * 86400000).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">Order Lines</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Quantity</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
                  <th className="pb-3 font-medium text-right">Discount</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deal.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-4 font-medium">{item.product.name}</td>
                    <td className="py-4 text-right">{item.quantity}</td>
                    <td className="py-4 text-right">${item.unitPrice.toLocaleString()}</td>
                    <td className="py-4 text-right">{item.discount}%</td>
                    <td className="py-4 text-right font-medium">${(item.quantity * item.unitPrice * (1 - item.discount / 100)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 p-8 border-t border-border flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-success">
                <span>Discount</span>
                <span>-${discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxes</span>
                <span className="font-medium">${(deal.amount * 0.1).toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${(deal.amount * 1.1).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white border border-border shadow-sm rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Ready to proceed?</h3>
            <p className="text-sm text-muted-foreground mt-1">Accepting this quotation confirms your order and agreement to our terms of service.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 border border-border bg-white rounded shadow-sm text-sm font-medium hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4 text-destructive" /> Reject
            </button>
            <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded shadow-sm text-sm font-medium hover:bg-primary/90 transition-colors">
              <Check className="w-4 h-4" /> Accept & Sign
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}
