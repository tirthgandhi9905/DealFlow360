import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { StatusBadge, StatusType } from "@/components/ui/StatusBadge"

export default function Approvals() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadData = async () => {
      // In a real app we'd filter for pending/returned approvals specifically
      const data = await mockApi.quotes.list()
      setApprovals(data)
      setLoading(false)
    }
    loadData()
  }, [])

  const columns = [
    { header: "Deal ID", accessorKey: "id", className: "font-medium text-foreground" },
    { header: "Customer", cell: (row: any) => row.customer.name },
    { header: "Amount", cell: (row: any) => <span className="font-medium">${row.amount.toLocaleString()}</span> },
    { 
      header: "Risk Score", 
      cell: (row: any) => (
        <span className={
          row.riskScore > 60 ? "text-destructive font-medium bg-destructive/10 px-2 py-0.5 rounded" : 
          row.riskScore > 30 ? "text-warning font-medium bg-warning/10 px-2 py-0.5 rounded" : 
          "text-success font-medium bg-success/10 px-2 py-0.5 rounded"
        }>
          {row.riskScore}/100
        </span>
      )
    },
    { header: "Status", cell: (row: any) => <StatusBadge status={row.status as StatusType} /> },
    { header: "Submitted", cell: (row: any) => <span className="text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Approvals Queue</h2>
        <p className="text-sm text-muted-foreground mt-1">Review deals requiring your authorization</p>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading queue...</div>
        ) : (
          <DataTable 
            data={approvals} 
            columns={columns} 
            onRowClick={(row) => navigate(`/approvals/${row.id}`)}
          />
        )}
      </div>
    </div>
  )
}
