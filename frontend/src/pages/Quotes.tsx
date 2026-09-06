import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { DataTable } from "@/components/ui/DataTable"
import { SearchBox } from "@/components/ui/SearchBox"
import { Pagination } from "@/components/ui/Pagination"
import { Plus, Pencil, Eye, Link } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

import { useCurrency } from "@/context/CurrencyContext"

const PAGE_SIZE = 15

export default function Quotes() {
  const { formatAmount } = useCurrency()
  const [quotes, setQuotes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api
      .get("/quotes/", { params: { limit: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, search: search || undefined } })
      .then((r) => { setQuotes(r.data.items || []); setTotal(r.data.total || 0) })
      .catch((e) => setError(e?.response?.data?.detail || "Failed to load quotes"))
      .finally(() => setLoading(false))
  }, [page, search])

  const columns = [
    { header: "Quote #", accessorKey: "quote_number" as const, sortable: true, className: "font-medium text-foreground" },
    { header: "Deal #", accessorKey: "deal_number" as const, sortable: true, className: "text-muted-foreground" },
    { header: "Customer", accessorKey: "customer_name" as const, sortable: true, className: "font-medium" },
    { header: "Version", accessorKey: "version" as const, sortable: true, cell: (r: any) => `v${r.version}` },
    { header: "Subtotal", accessorKey: "subtotal" as const, sortable: true, cell: (r: any) => <span className="text-muted-foreground">{formatAmount(r.subtotal)}</span> },
    { header: "Discount", accessorKey: "total_discount" as const, sortable: true, cell: (r: any) => <span className="text-success">-{formatAmount(r.total_discount)}</span> },
    { header: "Grand Total", accessorKey: "grand_total" as const, sortable: true, cell: (r: any) => <span className="font-semibold">{formatAmount(r.grand_total)}</span> },
    { header: "Created", accessorKey: "created_at" as const, sortable: true, cell: (r: any) => <span className="text-muted-foreground text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</span> },
    {
      header: "Actions",
      sortable: false,
      cell: (r: any) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${r.id}`) }}
            className="p-1.5 rounded hover:bg-slate-100 text-muted-foreground hover:text-primary"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${r.id}/edit`) }}
            className="p-1.5 rounded hover:bg-slate-100 text-muted-foreground hover:text-primary"
            title="Edit (only while pending approval)"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              const link = `${window.location.origin}/portal/${r.id}`;
              navigator.clipboard.writeText(link);
              toast.success("Portal link copied to clipboard!")
            }}
            className="p-1.5 rounded hover:bg-slate-100 text-muted-foreground hover:text-primary"
            title="Copy Portal Link"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Quotations</h2>
          <p className="text-sm text-muted-foreground mt-1">All quotes generated across deals</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by quote #..." />
          <button
            onClick={() => navigate("/quotes/new")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25"
          >
            <Plus className="w-4 h-4" />
            Create Quote
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading quotations...</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">{error}</div>
        ) : (
          <>
            <DataTable data={quotes} columns={columns} />
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
