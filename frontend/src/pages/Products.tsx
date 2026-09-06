import { useState, useEffect, useMemo } from "react"
import { Box, Settings2, PackagePlus, Tags, Settings, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"


import { useCurrency } from "@/context/CurrencyContext"

const PAGE_SIZE = 15

export default function Products() {
  const { formatAmount } = useCurrency()
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string>("name")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isNew, setIsNew] = useState(false)

  const load = () => {
    setLoading(true)
    api
      .get("/products/", { params: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, search: search || undefined } })
      .then((r) => { setProducts(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load products"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [page, search])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedProducts = useMemo(() => {
    if (!sortKey) return products
    return [...products].sort((a, b) => {
      let valA: any = a[sortKey]
      let valB: any = b[sortKey]

      if (sortKey === "type") {
        valA = a.is_subscription ? 1 : 0
        valB = b.is_subscription ? 1 : 0
      } else if (sortKey === "max_discount") {
        const disc = (cat: string) => cat === 'hardware' ? 10 : cat === 'software' ? 25 : 15
        valA = a.category_discount_ceiling ?? disc(a.category)
        valB = b.category_discount_ceiling ?? disc(b.category)
      } else if (sortKey === "stock_count") {
        valA = a.stock_count ?? 0
        valB = b.stock_count ?? 0
      }

      if (valA === undefined || valA === null) valA = ""
      if (valB === undefined || valB === null) valB = ""

      let comparison = 0
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: "base" })
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [products, sortKey, sortDirection])

  const handleSave = async () => {
    try {
      if (isNew) {
        await api.post("/products/", selectedProduct)
      } else {
        await api.patch(`/products/${selectedProduct.id}`, selectedProduct)
      }
      setSelectedProduct(null)
      setIsNew(false)
      load()
    } catch (e) {
      alert("Failed to save product")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return
    try {
      await api.delete(`/products/${selectedProduct.id}`)
      setSelectedProduct(null)
      load()
    } catch (e) {
      alert("Failed to delete product")
    }
  }

  const columns = [
    { header: "SKU", accessorKey: "sku" as const, sortable: true, className: "font-mono text-xs text-muted-foreground" },
    { header: "Name", accessorKey: "name" as const, sortable: true, className: "font-medium" },
    { header: "Category", accessorKey: "category" as const, sortable: true, cell: (r: any) => <span className="text-muted-foreground capitalize">{String(r.category).replace(/_/g, " ")}</span> },
    { header: "Base Price", accessorKey: "base_price" as const, sortable: true, cell: (r: any) => <span className="font-medium">{formatAmount(r.base_price)}</span> },
    { header: "Cost", accessorKey: "cost" as const, sortable: true, cell: (r: any) => <span className="text-muted-foreground">{formatAmount(r.cost)}</span> },
    { header: "Margin", accessorKey: "margin_percent" as const, sortable: true, cell: (r: any) => <span className={r.margin_percent >= 40 ? "text-success" : r.margin_percent >= 25 ? "text-warning" : "text-destructive"}>{r.margin_percent}%</span> },
    { header: "Type", sortable: true, sortKey: "type", cell: (r: any) => r.is_subscription ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Subscription · {r.recurring_interval || "monthly"}</span> : <span className="text-xs text-muted-foreground">One-time</span> },
    { header: "Stock", accessorKey: "stock_count" as const, sortable: true, cell: (r: any) => <span className="text-sm font-medium">{r.stock_count ?? 0}</span> },
    { header: "Max Disc.", sortable: true, sortKey: "max_discount", cell: (r: any) => <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{r.category === 'hardware' ? '10%' : r.category === 'software' ? '25%' : '15%'}</span> },
    {
      header: "Action",
      sortable: false,
      cell: (r: any) => (
        <button 
          onClick={(e) => { e.stopPropagation(); setSelectedProduct(r); }}
          className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" 
          title="Manage Product"
        >
          <Settings className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-primary" />
            Product Catalog
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live catalog with margins and subscription flags</p>
        </div>
        <div className="flex gap-3 items-center">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by name or SKU..." />
          <button 
            onClick={() => {
              setIsNew(true)
              setSelectedProduct({
                name: "", sku: "", category: "hardware", base_price: 0, cost: 0, tax_percent: 0, is_subscription: false
              })
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm shadow-primary/25"
          >
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {/* Quick Sorting Header (Paytm Flights Style) */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 pb-3 border-b border-border/60">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="font-semibold text-foreground mr-1 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" /> Quick Sort:
            </span>
            {[
              { label: "Price (Low → High)", key: "base_price", dir: "asc" },
              { label: "Price (High → Low)", key: "base_price", dir: "desc" },
              { label: "Margin %", key: "margin_percent", dir: "desc" },
              { label: "Stock Count", key: "stock_count", dir: "desc" },
              { label: "Name (A-Z)", key: "name", dir: "asc" },
            ].map((preset) => {
              const active = sortKey === preset.key && sortDirection === preset.dir
              return (
                <button
                  key={`${preset.key}-${preset.dir}`}
                  onClick={() => { setSortKey(preset.key); setSortDirection(preset.dir as any) }}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                      : "bg-white border-border text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                  }`}
                >
                  <span>{preset.label}</span>
                  {active && (preset.dir === "asc" ? <ArrowUp className="w-3 h-3 stroke-[2.5]" /> : <ArrowDown className="w-3 h-3 stroke-[2.5]" />)}
                </button>
              )
            })}
          </div>
          {sortKey && (
            <div className="text-xs text-muted-foreground">
              Sorted by <span className="font-medium text-foreground capitalize">{sortKey.replace(/_/g, " ")}</span> ({sortDirection === "asc" ? "Ascending ▲" : "Descending ▼"})
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading products...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable 
              data={sortedProducts} 
              columns={columns} 
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              onRowClick={(r) => setSelectedProduct(r)} 
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Product Settings Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  {isNew ? (
                    <input 
                      type="text" 
                      className="text-lg font-bold text-foreground bg-transparent border-b border-border focus:outline-none focus:border-primary"
                      value={selectedProduct.name}
                      onChange={e => setSelectedProduct({...selectedProduct, name: e.target.value})}
                      placeholder="Product Name"
                    />
                  ) : (
                    <h2 className="text-lg font-bold text-foreground">{selectedProduct.name}</h2>
                  )}
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    SKU: 
                    <input 
                      type="text"
                      className="w-24 bg-transparent border-b border-border text-sm focus:outline-none focus:border-primary"
                      value={selectedProduct.sku}
                      onChange={e => setSelectedProduct({...selectedProduct, sku: e.target.value})}
                    />
                    · Category: 
                    <select 
                      className="bg-transparent border-b border-border text-sm focus:outline-none focus:border-primary capitalize"
                      value={selectedProduct.category}
                      onChange={e => setSelectedProduct({...selectedProduct, category: e.target.value})}
                    >
                      <option value="hardware">Hardware</option>
                      <option value="software">Software</option>
                      <option value="services">Services</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </p>
                </div>
              </div>
              <button onClick={() => {setSelectedProduct(null); setIsNew(false)}} className="p-2 text-muted-foreground hover:bg-slate-200 rounded-full transition-colors">
                <Settings2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><Tags className="w-4 h-4 text-primary" /> Pricing & Ceilings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border border-border rounded-lg bg-slate-50">
                    <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1">Base Price</label>
                    <input type="number" value={selectedProduct.base_price} onChange={e => setSelectedProduct({...selectedProduct, base_price: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border border-border rounded bg-white" />
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-slate-50">
                    <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1">Cost</label>
                    <input type="number" value={selectedProduct.cost} onChange={e => setSelectedProduct({...selectedProduct, cost: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border border-border rounded bg-white" />
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-slate-50">
                    <label className="text-xs text-muted-foreground uppercase font-semibold block mb-1">Max Discount Ceiling</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" value={selectedProduct.category_discount_ceiling || (selectedProduct.category === 'hardware' ? 10 : 25)} onChange={e => setSelectedProduct({...selectedProduct, category_discount_ceiling: Number(e.target.value)})} className="w-16 px-2 py-1 text-sm border border-border rounded bg-white" />
                      <span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-slate-50">
                    <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-2 mb-1">
                      <input type="checkbox" checked={selectedProduct.is_subscription} onChange={e => setSelectedProduct({...selectedProduct, is_subscription: e.target.checked})} className="rounded text-primary" />
                      Is Subscription?
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3"><PackagePlus className="w-4 h-4 text-primary" /> Warehouse Inventory</h3>
                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 border-b border-border text-left">
                    <tr><th className="py-2 px-3 font-medium">Warehouse</th><th className="py-2 px-3 font-medium text-right">In Stock</th><th className="py-2 px-3 font-medium text-right">Reserved</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr><td className="py-2 px-3">Main Depot</td><td className="py-2 px-3 text-right">45</td><td className="py-2 px-3 text-right text-muted-foreground">12</td></tr>
                    <tr><td className="py-2 px-3">East Coast Hub</td><td className="py-2 px-3 text-right">18</td><td className="py-2 px-3 text-right text-muted-foreground">5</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-slate-50 flex justify-between items-center gap-3">
              {!isNew && (
                <button onClick={handleDelete} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {isNew && <div></div>}
              <div className="flex items-center gap-3">
                <button onClick={() => {setSelectedProduct(null); setIsNew(false)}} className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
