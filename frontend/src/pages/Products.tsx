import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { Box, Plus, Edit, Trash2 } from "lucide-react"

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setProducts(await mockApi.products.list())
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { header: "Product ID", accessorKey: "id", className: "font-medium text-foreground" },
    { header: "Name", accessorKey: "name", className: "font-medium" },
    { header: "Category", accessorKey: "category", className: "text-muted-foreground" },
    { header: "Base Price", cell: (row: any) => <span className="font-medium">${row.basePrice.toLocaleString()}</span> },
    { header: "Max Discount", cell: (row: any) => <span className="text-warning-foreground">{row.maxDiscount}%</span> },
    { header: "Target Margin", cell: (row: any) => <span className="text-success">{row.margin}%</span> },
    { 
      header: "Action", 
      cell: () => (
        <div className="flex gap-2">
          <button className="p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-primary rounded-md transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-primary" />
            Product Catalog
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your catalog, pricing, and margin constraints</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading products...</div>
        ) : (
          <DataTable 
            data={products} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
