import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge"
import { Plus } from "lucide-react"

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      setQuotes(await mockApi.quotes.list())
      setLoading(false)
    }
    loadData()
  }, [])

  const columns = [
    { header: "Quote ID", accessorKey: "id", className: "font-medium text-foreground" },
    { 
      header: "Customer", 
      cell: (row: any) => (
        <div>
          <div className="font-medium">{row.customer.name}</div>
          <div className="text-xs text-muted-foreground">{row.customer.industry}</div>
        </div>
      ) 
    },
    { 
      header: "Amount", 
      cell: (row: any) => <span className="font-medium">${row.amount.toLocaleString()}</span> 
    },
    { 
      header: "Margin", 
      cell: (row: any) => (
        <span className={row.margin >= 40 ? "text-success" : row.margin >= 30 ? "text-warning" : "text-destructive"}>
          {row.margin}%
        </span>
      )
    },
    { 
      header: "Status", 
      cell: (row: any) => <StatusBadge status={row.status as StatusType} /> 
    },
    { 
      header: "Date", 
      cell: (row: any) => <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span> 
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Quotations</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage active quotes and draft new proposals</p>
        </div>
        <button 
          onClick={() => navigate('/quotes/new')}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25"
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading quotations...</div>
        ) : (
          <DataTable 
            data={quotes} 
            columns={columns} 
            onRowClick={(row) => navigate(`/quotes/${row.id}`)}
          />
        )}
      </div>
    </div>
  )
}
