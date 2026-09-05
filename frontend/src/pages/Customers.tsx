import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { Users, Plus, Edit, Mail } from "lucide-react"

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setCustomers(await mockApi.customers.list())
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { header: "Customer ID", accessorKey: "id", className: "font-medium text-foreground" },
    { header: "Company Name", accessorKey: "name", className: "font-medium" },
    { header: "Industry", accessorKey: "industry", className: "text-muted-foreground" },
    { header: "Risk Profile", cell: (row: any) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.riskProfile === 'Low' ? 'bg-success/10 text-success' : row.riskProfile === 'Medium' ? 'bg-warning/10 text-warning-foreground' : 'bg-destructive/10 text-destructive'}`}>
        {row.riskProfile} Risk
      </span>
    )},
    { header: "Lifetime Value", cell: (row: any) => <span className="font-medium">${(Math.floor(Math.random() * 500000) + 10000).toLocaleString()}</span> },
    { 
      header: "Action", 
      cell: () => (
        <div className="flex gap-2">
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="Contact">
            <Mail className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage B2B relationships and credit profiles</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading customers...</div>
        ) : (
          <DataTable 
            data={customers} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
