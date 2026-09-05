import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Bell, Settings, Search, CheckCircle2, AlertTriangle, ArrowRight, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

const MOCK_NOTIFICATIONS = [
  { id: 1, title: "High-Risk Escalation", message: "Quote #1042 routed to Finance", type: "alert", time: "10m ago", read: false },
  { id: 2, title: "Customer Counter-Offer", message: "Negotiation round submitted for #1038", type: "info", time: "1h ago", read: false },
  { id: 3, title: "Warehouse Auto-Split", message: "Order #1033 split between Mumbai & Delhi", type: "info", time: "2h ago", read: false },
  { id: 4, title: "Deal Health Warning", message: "Quote #1021 stalled > 7 days", type: "warning", time: "1d ago", read: true },
  { id: 5, title: "Payment Received", message: "Invoice INV-001 paid in full", type: "success", time: "2d ago", read: true },
]

export default function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const getIcon = (type: string) => {
    switch(type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search deals, customers..." 
            className="w-full bg-slate-100 border border-border rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-muted-foreground relative" ref={notifRef}>
          <button 
            className="hover:text-foreground transition-colors relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute top-10 right-8 w-80 bg-white border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-border flex items-center justify-between bg-slate-50">
                <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-border">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.read ? 'bg-primary/5' : ''}`}>
                        <div className="mt-0.5">{getIcon(n.type)}</div>
                        <div className="flex-1">
                          <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-slate-700'}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-border bg-slate-50 text-center">
                <button className="text-xs font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                  View All Activity <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <button 
            className="hover:text-foreground transition-colors ml-2"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="h-6 w-px bg-border/50"></div>
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.name || "John Doe"}</p>
            <p className="text-xs text-muted-foreground mt-1">{user?.role || "Sales Rep"}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-info flex items-center justify-center cursor-pointer border border-border/50" onClick={logout}>
            <span className="text-white font-medium text-sm">{(user?.name || "J")[0]}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
