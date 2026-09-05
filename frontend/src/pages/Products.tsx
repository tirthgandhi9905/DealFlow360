import { useState, useEffect } from "react"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { Box } from "lucide-react"

function inr(n: number): string {
  return `₹${(n || 0).toLocaleString("en-IN")}`
}

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    api
      .get("/products/", { params: { limit: 100 } })
      .then((r) => setProducts(r.data.items || []))
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load products"))
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { header: "SKU", accessorKey: "sku" as const, className: "font-mono text-xs text-muted-foreground" },
    { header: "Name", accessorKey: "name" as const, className: "font-medium" },
    { header: "Category", cell: (r: any) => <span className="text-muted-foreground capitalize">{String(r.category).replace(/_/g, " ")}</span> },
    { header: "Base Price", cell: (r: any) => <span className="font-medium">{inr(r.base_price)}</span> },
    { header: "Cost", cell: (r: any) => <span className="text-muted-foreground">{inr(r.cost)}</span> },
    { header: "Margin", cell: (r: any) => <span className={r.margin_percent >= 40 ? "text-success" : r.margin_percent >= 25 ? "text-warning" : "text-destructive"}>{r.margin_percent}%</span> },
    { header: "Type", cell: (r: any) => r.is_subscription ? <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Subscription · {r.recurring_interval || "monthly"}</span> : <span className="text-xs text-muted-foreground">One-time</span> },
    { header: "Active", cell: (r: any) => r.is_active ? <span className="text-success">●</span> : <span className="text-muted-foreground">○</span> },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-primary" />
            Product Catalog
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Live catalog with margins and subscription flags</p>
        </div>
        <div className="text-sm text-muted-foreground">{products.length} products</div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading products...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <DataTable data={products} columns={columns} />
        )}
      </div>
    </div>
  )
}
