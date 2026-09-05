import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { CreditCard, FileText, Download, CheckCircle2, Clock, AlertTriangle } from "lucide-react"

export default function Billing() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const deals = await mockApi.quotes.list()
      // Generate some mock invoices from the deals
      const mockInvoices = deals.slice(0, 15).map((d, i) => {
        const isPaid = i % 3 !== 0;
        const isOverdue = !isPaid && i % 2 === 0;
        return {
          id: `INV-2026-${String(i + 1).padStart(4, '0')}`,
          customer: d.customer.name,
          amount: d.amount,
          date: new Date(Date.now() - (i * 864000000)).toLocaleDateString(),
          dueDate: new Date(Date.now() - ((i - 2) * 864000000)).toLocaleDateString(),
          status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
          relatedDeal: d.id
        }
      })
      
      setInvoices(mockInvoices)
      setLoading(false)
    }
    load()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>
      case 'overdue':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive"><AlertTriangle className="w-3.5 h-3.5" /> Overdue</span>
      case 'pending':
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning-foreground"><Clock className="w-3.5 h-3.5" /> Pending</span>
    }
  }

  const columns = [
    { header: "Invoice", accessorKey: "id", className: "font-medium text-foreground" },
    { header: "Customer", accessorKey: "customer" },
    { header: "Issue Date", accessorKey: "date", className: "text-muted-foreground" },
    { header: "Due Date", accessorKey: "dueDate", className: "text-muted-foreground" },
    { header: "Amount", cell: (row: any) => <span className="font-medium">${row.amount.toLocaleString()}</span> },
    { header: "Status", cell: (row: any) => getStatusBadge(row.status) },
    { 
      header: "Action", 
      cell: () => (
        <div className="flex gap-2">
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="View Invoice">
            <FileText className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="Download PDF">
            <Download className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Billing & Invoicing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage customer invoices, payments, and subscriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-6 rounded-xl border-l-4 border-l-primary shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-muted-foreground mb-2">Total Outstanding</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">${(totalOutstanding / 1000).toFixed(1)}k</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-destructive shadow-sm flex flex-col justify-between">
          <p className="text-sm font-medium text-muted-foreground mb-2">Overdue Payments</p>
          <p className="text-3xl font-bold text-destructive tracking-tight">${(totalOverdue / 1000).toFixed(1)}k</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading invoices...</div>
        ) : (
          <DataTable 
            data={invoices} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
