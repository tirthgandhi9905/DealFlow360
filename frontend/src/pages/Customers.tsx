import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Users, Search, Plus, Building, Phone, Mail, Filter } from "lucide-react"

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [tierFilter, setTierFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // New Customer Form State
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    tier: "bronze",
    address: "",
    industry: "IT Services",
    lifetime_value: 0,
  })

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (tierFilter) params.tier = tierFilter
      if (search) params.search = search
      const res = await api.get("/customers/", { params })
      setCustomers(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load customers", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [tierFilter, search])

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post("/customers/", newCustomer)
      setShowCreateModal(false)
      setNewCustomer({ name: "", email: "", phone: "", tier: "bronze", address: "", industry: "IT Services", lifetime_value: 0 })
      fetchCustomers()
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create customer")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customer CRM Directory</h2>
          <p className="text-sm text-muted-foreground">Manage enterprise B2B accounts, tier discount ratings, and lifetime value</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by company name, email, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none"
          >
            <option value="">All Account Tiers</option>
            <option value="gold">Gold Tier (Up to 15% Max Disc)</option>
            <option value="silver">Silver Tier (Up to 10% Max Disc)</option>
            <option value="bronze">Bronze Tier (Up to 5% Max Disc)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
          <span className="font-semibold text-sm">Showing {customers.length} of {total} B2B Accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Industry</th>
                <th className="px-4 py-3">Contact Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Lifetime Value</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-foreground flex items-center gap-2">
                      <Building className="w-4 h-4 text-primary" /> {c.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs uppercase font-bold ${
                        c.tier === "gold" ? "bg-amber-100 text-amber-800" : c.tier === "silver" ? "bg-slate-200 text-slate-800" : "bg-orange-100 text-orange-800"
                      }`}>
                        {c.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.industry || "General"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.email}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="px-4 py-3.5 font-semibold text-foreground">₹{(c.lifetime_value || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-xs truncate">{c.address || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold">Add New B2B Customer</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Company Name</label>
                <input required type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Email</label>
                  <input required type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Tier</label>
                  <select value={newCustomer.tier} onChange={(e) => setNewCustomer({ ...newCustomer, tier: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none">
                    <option value="bronze">Bronze (5% Max Disc)</option>
                    <option value="silver">Silver (10% Max Disc)</option>
                    <option value="gold">Gold (15% Max Disc)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Industry</label>
                  <input type="text" value={newCustomer.industry} onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Phone</label>
                  <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">Address</label>
                <textarea rows={2} value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-accent">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
