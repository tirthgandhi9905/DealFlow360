import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Package, Search, Plus, Filter, Tag, Percent } from "lucide-react"

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [priceLists, setPriceLists] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (categoryFilter) params.category = categoryFilter
      if (search) params.search = search
      const [pRes, plRes] = await Promise.all([
        api.get("/products/", { params }),
        api.get("/products/price-lists"),
      ])
      setProducts(pRes.data.items || [])
      setTotal(pRes.data.total || 0)
      setPriceLists(plRes.data.items || [])
    } catch (err) {
      console.error("Failed to load products", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [categoryFilter, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Catalog & Price Lists</h2>
          <p className="text-sm text-muted-foreground">Browse hardware, software, services, and subscription plans with real-time margin rates</p>
        </div>
      </div>

      {/* Price List Governance Ceilings */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Percent className="w-4 h-4 text-primary" /> Active Discount Governance Ceilings (Tier × Category Matrix)
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          {priceLists.map((pl) => (
            <div key={pl.id} className="p-2.5 rounded-lg border border-border bg-accent/20 flex flex-col justify-between">
              <span className="font-bold uppercase text-muted-foreground">{pl.tier} • {pl.category}</span>
              <span className="font-bold text-sm text-foreground mt-1">Max {pl.max_discount_percent}% Disc</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="hardware">Hardware</option>
            <option value="software">Software</option>
            <option value="services">Services</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
          <span className="font-semibold text-sm">Showing {products.length} of {total} Products</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Product / SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Base Price</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Gross Margin</th>
                <th className="px-4 py-3">GST Tax %</th>
                <th className="px-4 py-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Loading product catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> {p.name}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-xs uppercase font-bold bg-accent text-accent-foreground">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground">₹{p.base_price.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">₹{p.cost.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      {p.margin_percent}% (₹{(p.margin_amount || 0).toLocaleString("en-IN")})
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">{p.tax_percent}%</td>
                    <td className="px-4 py-3.5">
                      {p.is_subscription ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                          Recurring ({p.recurring_interval || "Monthly"})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          One-Time
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
