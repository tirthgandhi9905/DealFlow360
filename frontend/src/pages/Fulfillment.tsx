import { useState, useEffect } from "react"
import { mockApi } from "@/mocks/handlers"
import { DataTable } from "@/components/ui/DataTable"
import { Package, Truck, CheckCircle2, Clock } from "lucide-react"

export default function Fulfillment() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const deals = await mockApi.quotes.list()
      // Filter deals that are approved or confirmed
      const approvedDeals = deals.filter(d => ['approved', 'confirmed', 'won'].includes(d.status))
      
      // Augment with mock fulfillment data
      const fulfillmentOrders = approvedDeals.map((d, i) => ({
        ...d,
        fulfillmentStatus: i % 3 === 0 ? 'delivered' : i % 2 === 0 ? 'processing' : 'shipped',
        trackingNumber: `TRK-${Math.floor(100000 + Math.random() * 900000)}`,
        estimatedDelivery: new Date(Date.now() + (i * 86400000)).toLocaleDateString()
      }))
      
      setOrders(fulfillmentOrders)
      setLoading(false)
    }
    load()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Delivered</span>
      case 'shipped':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-info/10 text-info"><Truck className="w-3.5 h-3.5" /> Shipped</span>
      case 'processing':
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning-foreground"><Clock className="w-3.5 h-3.5" /> Processing</span>
    }
  }

  const columns = [
    { header: "Order ID", accessorKey: "id", className: "font-medium text-foreground" },
    { header: "Customer", cell: (row: any) => row.customer.name },
    { header: "Tracking", cell: (row: any) => <span className="font-mono text-muted-foreground">{row.trackingNumber}</span> },
    { header: "Est. Delivery", accessorKey: "estimatedDelivery" },
    { header: "Status", cell: (row: any) => getStatusBadge(row.fulfillmentStatus) },
    { 
      header: "Action", 
      cell: () => (
        <button className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
          View Details
        </button>
      )
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Fulfillment Operations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Track order processing, shipments, and deliveries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-warning shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-warning" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter(o => o.fulfillmentStatus === 'processing').length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Processing Orders</p>
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-info shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-info" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter(o => o.fulfillmentStatus === 'shipped').length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Shipped / In Transit</p>
          </div>
        </div>
        <div className="glass p-6 rounded-xl flex items-center gap-4 border-t-4 border-t-success shadow-sm">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-success" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {orders.filter(o => o.fulfillmentStatus === 'delivered').length}
            </p>
            <p className="text-sm font-medium text-muted-foreground">Delivered (30d)</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        {loading ? (
          <div className="text-center p-8 text-muted-foreground animate-pulse">Loading fulfillment queue...</div>
        ) : (
          <DataTable 
            data={orders} 
            columns={columns} 
          />
        )}
      </div>
    </div>
  )
}
