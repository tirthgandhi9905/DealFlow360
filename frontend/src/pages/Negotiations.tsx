import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { Handshake, MessageSquare, Clock } from "lucide-react"

export default function Negotiations() {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const data = await mockApi.quotes.list()
      const negotiationDeals = data.filter(d => ['sent', 'draft'].includes(d.status)).map(d => ({
        ...d,
        lastMessage: "Can we do 15% discount on the servers?",
        lastMessageTime: "2 hours ago",
        unread: true
      }))
      setDeals(negotiationDeals)
      setLoading(false)
    }
    load()
  }, [])

  const columns = [
    { header: "Deal", cell: (row: any) => (
      <div>
        <div className="font-medium text-foreground">{row.customer.name}</div>
        <div className="text-xs text-muted-foreground">{row.id}</div>
      </div>
    )},
    { header: "Amount", cell: (row: any) => <span className="font-medium">${row.amount.toLocaleString()}</span> },
    { header: "Latest Activity", cell: (row: any) => (
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-foreground">"{row.lastMessage}"</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" /> {row.lastMessageTime}
          </p>
        </div>
      </div>
    )},
    { header: "Status", cell: (row: any) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning-foreground">
        Awaiting Your Reply
      </span>
    )},
    { 
      header: "Action", 
      cell: () => (
        <button className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
          Reply
        </button>
      )
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            Active Negotiations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Review counter-offers and customer comments</p>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading negotiations...</div>
        ) : (
          <DataTable 
            data={deals} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
