import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "@/lib/api"
import { FileText, Plus, Search, Filter, ArrowRight, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-react"

export default function Quotes() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchQuotes = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 50 }
      if (search) params.search = search
      const res = await api.get("/quotes/", { params })
      setQuotes(res.data.items || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error("Failed to load quotes", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quotations & Deals Pipeline</h2>
          <p className="text-sm text-muted-foreground">Manage multi-line B2B quotes, deal revisions, and approval dispatch states</p>
        </div>
        <button
          onClick={() => navigate("/quotes/new")}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" /> Create New Quotation
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by quote number (e.g. QT-1001)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Quotes Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/20">
          <span className="font-semibold text-sm">Showing {quotes.length} of {total} Quotations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/40 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Quote Number</th>
                <th className="px-4 py-3">Deal Number</th>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Subtotal</th>
                <th className="px-4 py-3">Total Discount</th>
                <th className="px-4 py-3">Grand Total (incl. GST)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground animate-pulse">
                    Loading quotations...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No quotations found.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" /> {q.quote_number}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-muted-foreground">{q.deal_number}</td>
                    <td className="px-4 py-3.5 font-medium">{q.customer_name}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-accent">v{q.version}</span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">₹{q.subtotal.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3.5 text-rose-600 dark:text-rose-400 font-semibold">
                      -₹{q.total_discount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-foreground">
                      ₹{q.grand_total.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        View & Edit <ArrowRight className="w-3.5 h-3.5" />
                      </button>
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
