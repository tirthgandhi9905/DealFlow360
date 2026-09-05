import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Repeat, Calendar, CheckCircle2, Clock, PauseCircle, Ban, Eye, Settings, FileText, ArrowRight } from "lucide-react"
import { Repeat, Calendar, CheckCircle2, Clock, PauseCircle, Ban, Eye, Settings, FileText, ArrowRight, X } from "lucide-react"

import { useCurrency } from "@/context/CurrencyContext"

const PAGE_SIZE = 15

export default function Subscriptions() {
  const { formatAmount } = useCurrency()
  const [subs, setSubs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  // Modal State
  const [selectedSub, setSelectedSub] = useState<any>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params: any = { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      
      const r = await api.get("/subscriptions/", { params })
      
      setSubs(r.data.items || [])
      setTotal(r.data.total || 0)
      setError("")
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, search, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
      case "paused":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20"><PauseCircle className="w-3.5 h-3.5" /> Paused</span>
      case "cancelled":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200"><Ban className="w-3.5 h-3.5" /> Cancelled</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">{status}</span>
    }
  }

  const columns = [
    { header: "Contract #", accessorKey: "deal_number" as const, className: "font-medium text-primary" },
    { header: "Customer", accessorKey: "customer_name" as const, className: "font-medium" },
    { header: "Cycle", cell: (r: any) => <span className="capitalize text-muted-foreground">{r.cycle}</span> },
    { header: "Recurring", cell: (r: any) => <span className="font-semibold text-foreground">{formatAmount(r.recurring_total)}<span className="text-xs text-muted-foreground font-normal">/{r.cycle === 'monthly' ? 'mo' : 'qtr'}</span></span> },
    { header: "Next Bill Date", cell: (r: any) => <span className="text-slate-600 font-medium flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-muted-foreground" /> {r.next_billing_date ? new Date(r.next_billing_date).toLocaleDateString() : "—"}</span> },
    { header: "Status", cell: (r: any) => getStatusBadge(r.status) },
    {
      header: "Action",
      cell: (r: any) => (
        <button 
          onClick={() => setSelectedSub(r)}
          className="px-3 py-1.5 text-xs font-medium bg-white border border-border shadow-sm rounded-md hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <Settings className="w-3.5 h-3.5" /> Manage
        </button>
      ),
    },
  ]

  const handleModify = async () => {
    try {
      await api.post(`/subscriptions/${selectedSub.id}/modify-quantity`, { new_quantity: 2 })
      alert("Subscription modified!")
      load()
    } catch(e) {
      alert("Failed to modify subscription")
    }
  }
  
  const handleCancel = async () => {
    if(confirm("Cancel this subscription? A prorated credit note will be issued for the remaining days in the cycle.")) {
      try {
        await api.post(`/subscriptions/${selectedSub.id}/cancel`, { immediate: true })
        alert("Subscription cancelled. Credit note generated.")
        setSelectedSub(null)
        load()
      } catch(e) {
        alert("Failed to cancel subscription")
      }
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Repeat className="w-6 h-6 text-primary" /> Active Contracts & Subscriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage recurring billing, proration, and contract lifecycles</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search contract or customer..." />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={subs} columns={columns} isLoading={loading} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Subscription / Hybrid Billing Detail Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Contract {selectedSub.deal_number}</h2>
                  <p className="text-sm text-muted-foreground">Hybrid Billing Detail · {selectedSub.customer_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedSub.status)}
                <button onClick={() => setSelectedSub(null)} className="p-2 text-muted-foreground hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Billing Cycle</p>
                  <p className="text-lg font-bold text-foreground capitalize">{selectedSub.cycle}</p>
                  <p className="text-xs text-slate-500 mt-1">Started: {selectedSub.start_date ? new Date(selectedSub.start_date).toLocaleDateString() : "—"}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Next Bill Date</p>
                  <p className="text-lg font-bold text-foreground">{selectedSub.next_billing_date ? new Date(selectedSub.next_billing_date).toLocaleDateString() : "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">Amount: {formatAmount(selectedSub.recurring_total)}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center">
                  <button onClick={handleModify} className="w-full mb-2 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Modify Subscription (Prorate)
                  </button>
                  <button onClick={handleCancel} className="w-full bg-white border border-destructive text-destructive hover:bg-destructive hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Cancel (Issue Credit Note)
                  </button>
                </div>
              </div>

              {/* Hybrid Lines Split */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" /> Recurring Items
                  </h3>
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-border text-slate-600 font-medium">
                        <tr>
                          <th className="py-3 px-4 text-left">Plan / License</th>
                          <th className="py-3 px-4 text-right">Seats/Qty</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Recurring Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        <tr>
                          <td className="py-3 px-4 font-medium">Enterprise Software License</td>
                          <td className="py-3 px-4 text-right">50</td>
                          <td className="py-3 px-4 text-right">{formatAmount(selectedSub.recurring_total / 50)}</td>
                          <td className="py-3 px-4 text-right font-medium text-primary">{formatAmount(selectedSub.recurring_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" /> One-Time Items (Previously Billed)
                  </h3>
                  <div className="bg-white border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-border text-slate-600 font-medium">
                        <tr>
                          <th className="py-3 px-4 text-left">Hardware / Service</th>
                          <th className="py-3 px-4 text-right">Qty</th>
                          <th className="py-3 px-4 text-right">Unit Price</th>
                          <th className="py-3 px-4 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedSub.one_time_total > 0 ? (
                          <tr>
                            <td className="py-3 px-4 text-slate-600">Implementation & Onboarding</td>
                            <td className="py-3 px-4 text-right text-slate-600">1</td>
                            <td className="py-3 px-4 text-right text-slate-600">{formatAmount(selectedSub.one_time_total)}</td>
                            <td className="py-3 px-4 text-right font-medium text-slate-700">{formatAmount(selectedSub.one_time_total)}</td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 px-4 text-center text-muted-foreground">No one-time items on this contract.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-between">
              <button className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                <FileText className="w-4 h-4" /> View Original Quote
              </button>
              <button className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
                View Billing History <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
