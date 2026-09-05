import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { CreditCard, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

export default function Billing() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const r = await api.get("/billing/invoices", { params })
      setInvoices(r.data.items || [])
      setTotal(r.data.total || 0)
      setError("")
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  const markPaid = async (inv: any) => {
    if (inv.status === "paid") return
    setBusyId(inv.id)
    try {
      await api.post(`/billing/invoices/${inv.id}/payments`, {
        amount: inv.amount,
        method: "bank_transfer",
      })
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Failed to record payment")
    } finally {
      setBusyId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Paid</span>
      case "overdue":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-destructive/10 text-destructive"><AlertTriangle className="w-3.5 h-3.5" /> Overdue</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning"><Clock className="w-3.5 h-3.5" /> {status || "Unpaid"}</span>
    }
  }

  const columns = [
    { header: "Invoice #", accessorKey: "invoice_number" as const, className: "font-medium text-foreground" },
    { header: "Deal", accessorKey: "deal_number" as const, className: "text-muted-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    { header: "Amount", cell: (r: any) => <span className={r.amount < 0 ? "text-destructive font-medium" : "font-medium"}>{inr(r.amount)}</span> },
    { header: "Due Date", cell: (r: any) => <span className="text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</span> },
    { header: "Status", cell: (r: any) => getStatusBadge(r.status) },
    {
      header: "Action",
      cell: (r: any) => (
        <div className="flex gap-2 items-center">
          {r.status !== "paid" && r.amount > 0 && (
            <button
              onClick={() => markPaid(r)}
              disabled={busyId === r.id}
              className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
            >
              {busyId === r.id ? "..." : "Mark Paid"}
            </button>
          )}
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="View Invoice">
            <FileText className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  // Summary — computed on the current page. For the whole DB, we'd need a separate stats endpoint.
  const totalOutstanding = invoices.filter((i) => i.status !== "paid" && i.amount > 0).reduce((sum, i) => sum + i.amount, 0)
  const totalCollected = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> Billing & Invoicing
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live invoice list — mark payments to update status</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search invoice or deal #..." />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl border-l-4 border-l-primary shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Outstanding (this page)</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{inr(totalOutstanding)}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-success shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Collected (this page)</p>
          <p className="text-3xl font-bold text-success tracking-tight">{inr(totalCollected)}</p>
        </div>
        <div className="glass p-6 rounded-xl border-l-4 border-l-info shadow-sm">
          <p className="text-sm font-medium text-muted-foreground mb-2">Total invoices</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{total}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading invoices...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={invoices} columns={columns} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
