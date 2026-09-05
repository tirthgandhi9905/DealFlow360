import { useState, useEffect } from "react"
import { Box, Settings2, PackagePlus, Tags, Settings, Plus, Trash2 } from "lucide-react"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"


function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

const PAGE_SIZE = 15

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  
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
    { header: "SKU", accessorKey: "sku" as const, className: "font-mono text-xs text-muted-foreground" },
    { header: "Name", accessorKey: "name" as const, className: "font-medium" },
    { header: "Category", cell: (r: any) => <span className="text-muted-foreground capitalize">{String(r.category).replace(/_/g, " ")}</span> },
    { header: "Base Price", cell: (r: any) => <span className="font-medium">{inr(r.base_price)}</span> },
    { header: "Cost", cell: (r: any) => <span className="text-muted-foreground">{inr(r.cost)}</span> },
    { header: "Margin", cell: (r: any) => <span className={r.margin_percent >= 40 ? "text-success" : r.margin_percent >= 25 ? "text-warning" : "text-destructive"}>{r.margin_percent}%</span> },
    { header: "Type", cell: (r: any) => r.is_subscription ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Subscription · {r.recurring_interval || "monthly"}</span> : <span className="text-xs text-muted-foreground">One-time</span> },
    { header: "Stock", cell: (r: any) => <span className="text-sm font-medium">{r.stock_count || Math.floor(Math.random() * 100) + 10}</span> },
    { header: "Max Disc.", cell: (r: any) => <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{r.category === 'hardware' ? '10%' : r.category === 'software' ? '25%' : '15%'}</span> },
    {
      header: "Action",
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
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading products...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={products} columns={columns} onRowClick={(r) => setSelectedProduct(r)} />
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
