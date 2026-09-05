import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { Plus } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const STAGES = [
  { id: "DRAFT", label: "Draft", color: "bg-slate-100 border-slate-200 text-slate-700" },
  { id: "PENDING_APPROVAL", label: "Pending Approval", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "APPROVED", label: "Approved", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { id: "NEGOTIATION", label: "Negotiation", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "CONFIRMED", label: "Confirmed", color: "bg-purple-50 border-purple-200 text-purple-700" }
]

export default function Pipeline() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.get("/quotes/", { params: { limit: 100 } })
      .then((r) => setQuotes(r.data.items || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const quotesByStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = quotes.filter(q => q.status === stage.id)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Deal Pipeline</h2>
          <p className="text-sm text-muted-foreground mt-1">Kanban view of all ongoing quotes</p>
        </div>
        <button
          onClick={() => navigate("/quotes/new")}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 h-full">
        {STAGES.map(stage => (
          <div key={stage.id} className="flex-none w-80 flex flex-col h-full bg-slate-50/50 rounded-xl border border-border">
            <div className={`p-3 m-2 rounded-lg border text-sm font-semibold flex justify-between items-center ${stage.color}`}>
              {stage.label}
              <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs">
                {quotesByStage[stage.id]?.length || 0}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {loading ? (
                <div className="text-center p-4 text-xs text-muted-foreground animate-pulse">Loading...</div>
              ) : quotesByStage[stage.id]?.length === 0 ? (
                <div className="text-center p-8 text-xs text-muted-foreground border-2 border-dashed border-border rounded-xl mx-2">
                  No deals
                </div>
              ) : (
                quotesByStage[stage.id]?.map(quote => (
                  <div 
                    key={quote.id} 
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                    className="bg-white p-4 rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-primary px-2 py-1 bg-primary/5 rounded-md">
                        {quote.quote_number}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        v{quote.version}
                      </span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {quote.customer_name}
                    </h4>
                    <p className="text-xl font-bold text-slate-800 tracking-tight mb-3">
                      {inr(quote.grand_total)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
                      <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                      {quote.total_discount > 0 && (
                        <span className="text-success font-medium">-{inr(quote.total_discount)} saved</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
