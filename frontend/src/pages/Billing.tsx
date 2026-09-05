import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { CreditCard, FileText, CheckCircle2, Clock, AlertTriangle, Printer, Download, X } from "lucide-react"

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
  
  // Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)

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
      if (selectedInvoice && selectedInvoice.id === inv.id) {
        setSelectedInvoice({ ...selectedInvoice, status: "paid" })
      }
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
          <button 
            onClick={() => setSelectedInvoice(r)}
            className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" 
            title="View Invoice"
          >
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
    <div className="space-y-6 animate-in fade-in duration-500 relative">
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

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Invoice {selectedInvoice.invoice_number}</h2>
                  <p className="text-sm text-muted-foreground">Generated from Deal {selectedInvoice.deal_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedInvoice.status)}
                <button onClick={() => setSelectedInvoice(null)} className="p-2 text-muted-foreground hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 4-Node Timeline Stepper */}
            <div className="bg-white border-b border-border px-12 py-5 hidden sm:block">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-4 right-4 top-4 -translate-y-1/2 h-1 bg-slate-100 z-0 rounded-full"></div>
                <div 
                  className="absolute left-4 top-4 -translate-y-1/2 h-1 bg-primary z-0 rounded-full transition-all duration-500" 
                  style={{ width: selectedInvoice.status === 'paid' ? 'calc(100% - 2rem)' : selectedInvoice.status === 'invoiced' ? '66%' : selectedInvoice.status === 'shipped' ? '33%' : '10%' }}
                ></div>
                
                {['Confirmed', 'Shipped', 'Invoiced', 'Paid'].map((step, i) => {
                  const isActive = 
                    (selectedInvoice.status === 'paid') || 
                    (selectedInvoice.status === 'invoiced' && i <= 2) || 
                    (selectedInvoice.status === 'shipped' && i <= 1) || 
                    (i === 0);
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-colors duration-300 ${isActive ? 'bg-primary border-primary text-white shadow-md shadow-primary/20' : 'bg-white border-slate-200 text-slate-400'}`}>
                        {isActive ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-foreground' : 'text-slate-400'}`}>{step}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed To</h3>
                  <p className="text-lg font-medium text-foreground">{selectedInvoice.customer_name}</p>
                  <p className="text-sm text-slate-500 mt-1">Acme Corp Ltd.<br />123 Business Avenue<br />Tech Park, Mumbai</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invoice Details</h3>
                  <table className="text-sm ml-auto">
                    <tbody>
                      <tr>
                        <td className="py-1 pr-4 text-slate-500">Invoice Date:</td>
                        <td className="py-1 font-medium">{new Date().toLocaleDateString()}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-slate-500">Due Date:</td>
                        <td className="py-1 font-medium text-red-600">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : "Upon Receipt"}</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-4 text-slate-500">Total Amount:</td>
                        <td className="py-1 font-bold text-lg">{inr(selectedInvoice.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Line Items Mock */}
              <div className="mb-8">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-border">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-slate-600">Description</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-600">Qty</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-600">Unit Price</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-4 px-4">
                        <p className="font-medium">Enterprise License (Annual)</p>
                        <p className="text-xs text-muted-foreground mt-1">SKU: ENT-LIC-001</p>
                      </td>
                      <td className="py-4 px-4 text-right">1</td>
                      <td className="py-4 px-4 text-right">{inr(selectedInvoice.amount * 0.8)}</td>
                      <td className="py-4 px-4 text-right font-medium">{inr(selectedInvoice.amount * 0.8)}</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-4">
                        <p className="font-medium">Implementation Services</p>
                        <p className="text-xs text-muted-foreground mt-1">One-time setup fee</p>
                      </td>
                      <td className="py-4 px-4 text-right">1</td>
                      <td className="py-4 px-4 text-right">{inr(selectedInvoice.amount * 0.2)}</td>
                      <td className="py-4 px-4 text-right font-medium">{inr(selectedInvoice.amount * 0.2)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="border-t-2 border-border">
                    <tr>
                      <td colSpan={3} className="py-4 px-4 text-right font-semibold">Subtotal:</td>
                      <td className="py-4 px-4 text-right">{inr(selectedInvoice.amount)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-2 px-4 text-right text-slate-500">Tax (18% GST):</td>
                      <td className="py-2 px-4 text-right text-slate-500">{inr(selectedInvoice.amount * 0.18)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-4 px-4 text-right font-bold text-lg">Total:</td>
                      <td className="py-4 px-4 text-right font-bold text-lg text-primary">{inr(selectedInvoice.amount * 1.18)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-border bg-slate-50 flex items-center justify-between">
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  <Printer className="w-4 h-4 text-slate-500" /> Print
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  <Download className="w-4 h-4 text-slate-500" /> PDF
                </button>
              </div>
              
              <div className="flex gap-2">
                {selectedInvoice.status !== "paid" && (
                  <button 
                    onClick={() => markPaid(selectedInvoice)}
                    disabled={busyId === selectedInvoice.id}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {busyId === selectedInvoice.id ? "Processing..." : "Record Payment"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
