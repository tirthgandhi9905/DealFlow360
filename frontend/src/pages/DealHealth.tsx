import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { HeartPulse, AlertTriangle, TrendingDown, ArrowRight, Activity, Percent } from "lucide-react"

export default function DealHealth() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await mockApi.quotes.list()
      const activeDeals = data.filter(d => ['draft', 'sent'].includes(d.status))
      
      // Augment with AI health score and signals
      const augmentedDeals = activeDeals.map(d => {
        const score = Math.floor(Math.random() * 60) + 20 // 20 to 80
        const isHighRisk = score < 40 || d.margin < 30
        
        let riskReason = ""
        if (d.margin < 30) riskReason = "Margin heavily compressed"
        else if (score < 40) riskReason = "Low engagement from decision maker"
        else riskReason = "Competitor pricing pressure detected"

        return {
          ...d,
          healthScore: score,
          isHighRisk,
          riskReason,
          daysInStage: Math.floor(Math.random() * 20) + 1
        }
      }).sort((a, b) => a.healthScore - b.healthScore) // Sort riskiest first
      
      setDeals(augmentedDeals)
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { header: "Deal", cell: (row: any) => (
      <div>
        <div className="font-medium text-foreground">{row.customer.name}</div>
        <div className="text-xs text-muted-foreground">{row.id}</div>
      </div>
    )},
    { header: "Amount", cell: (row: any) => <span className="font-medium">${row.amount.toLocaleString()}</span> },
    { header: "Health Score", cell: (row: any) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${row.healthScore < 40 ? 'bg-destructive' : row.healthScore < 60 ? 'bg-warning' : 'bg-success'}`} 
            style={{ width: `${row.healthScore}%` }} 
          />
        </div>
        <span className={`text-xs font-bold ${row.healthScore < 40 ? 'text-destructive' : row.healthScore < 60 ? 'text-warning' : 'text-success'}`}>
          {row.healthScore}/100
        </span>
      </div>
    )},
    { header: "Risk Factor", cell: (row: any) => (
      <div className="flex items-center gap-1.5 text-xs font-medium">
        {row.isHighRisk ? (
          <><AlertTriangle className="w-3.5 h-3.5 text-destructive" /> <span className="text-destructive">{row.riskReason}</span></>
        ) : (
          <><Activity className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Stable</span></>
        )}
      </div>
    )},
    { header: "Days in Stage", accessorKey: "daysInStage", className: "text-right" },
    { 
      header: "Action", 
      cell: () => (
        <button className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-sm transition-colors">
          Intervene <ArrowRight className="w-4 h-4" />
        </button>
      )
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            Deal Health Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-1">AI-powered risk detection for your active pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl border-l-4 border-l-destructive shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">At Risk Pipeline</p>
            <div className="p-1.5 bg-destructive/10 rounded-md"><TrendingDown className="w-4 h-4 text-destructive" /></div>
          </div>
          <p className="text-3xl font-bold text-destructive tracking-tight">
            ${(deals.filter(d => d.isHighRisk).reduce((sum, d) => sum + d.amount, 0) / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-muted-foreground mt-2">{deals.filter(d => d.isHighRisk).length} deals require immediate attention</p>
        </div>
        
        <div className="glass p-6 rounded-xl border-l-4 border-l-warning shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Average Health Score</p>
            <div className="p-1.5 bg-warning/10 rounded-md"><Activity className="w-4 h-4 text-warning" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {deals.length > 0 ? Math.floor(deals.reduce((sum, d) => sum + d.healthScore, 0) / deals.length) : 0}/100
          </p>
          <p className="text-xs text-muted-foreground mt-2">Across {deals.length} active deals</p>
        </div>
        
        <div className="glass p-6 rounded-xl border-l-4 border-l-primary shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-muted-foreground">Margin Compression Risk</p>
            <div className="p-1.5 bg-primary/10 rounded-md"><Percent className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {deals.filter(d => d.margin < 35).length} Deals
          </p>
          <p className="text-xs text-muted-foreground mt-2">Currently being negotiated below target</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Analyzing pipeline health...</div>
        ) : (
          <DataTable 
            data={deals} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
