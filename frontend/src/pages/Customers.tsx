import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { toast } from "@/components/ui/use-toast"
import { Users, Plus } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

const TIER_STYLES: Record<string, string> = {
  gold: "bg-yellow-100 text-yellow-800",
  silver: "bg-slate-200 text-slate-700",
  bronze: "bg-amber-100 text-amber-800",
  platinum: "bg-purple-100 text-purple-800",
}

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [isNewModal, setIsNewModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", industry: "", tier: "bronze" })
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api
      .get("/customers/", { params: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, search: search || undefined } })
      .then((r) => { setCustomers(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load customers"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page, search])

  const handleSave = async () => {
    try {
      const res = await api.post("/customers/", newCustomer)
      setIsNewModal(false)
      setNewCustomer({ name: "", email: "", phone: "", industry: "", tier: "bronze" })
      toast.success("Customer created successfully")
      navigate(`/customers/${res.data.id}`)
    } catch (e) {
      toast.error("Failed to save customer")
    }
  }

  const columns = [
    { header: "Name", accessorKey: "name" as const, className: "font-medium text-foreground" },
    { header: "Email", accessorKey: "email" as const, className: "text-muted-foreground" },
    { header: "Industry", cell: (r: any) => <span className="text-muted-foreground">{r.industry || "—"}</span> },
    { header: "Tier", cell: (r: any) => {
      const tier = String(r.tier || "").toLowerCase()
      return <span className={`text-xs font-medium px-2 py-0.5 rounded ${TIER_STYLES[tier] || "bg-slate-100 text-slate-600"}`}>{tier.toUpperCase() || "—"}</span>
    }},
    { header: "Lifetime Value", cell: (r: any) => <span className="font-medium">{inr(r.lifetime_value || 0)}</span> },
    { header: "Phone", cell: (r: any) => <span className="text-muted-foreground">{r.phone || "—"}</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Customers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Click any row for the full 360° customer view</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name, email, industry..." />
          <button 
            onClick={() => setIsNewModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm shadow-primary/25"
          >
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={customers} columns={columns} onRowClick={(r) => navigate(`/customers/${r.id}`)} isLoading={loading} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {isNewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border font-bold">New Customer</div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Name</label>
                <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Email</label>
                <input type="email" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Phone</label>
                <input type="text" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Industry</label>
                  <input type="text" value={newCustomer.industry} onChange={e => setNewCustomer({...newCustomer, industry: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Tier</label>
                  <select value={newCustomer.tier} onChange={e => setNewCustomer({...newCustomer, tier: e.target.value})} className="w-full border rounded px-3 py-2 text-sm capitalize">
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsNewModal(false)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-100">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
