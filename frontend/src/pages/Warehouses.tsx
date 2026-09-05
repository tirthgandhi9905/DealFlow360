import { useState, useEffect } from "react"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { Building2, Plus, Trash2 } from "lucide-react"

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isNew, setIsNew] = useState(false)
  const [selected, setSelected] = useState<any>(null)

  const load = () => {
    setLoading(true)
    api.get("/warehouses/")
      .then(r => setWarehouses(r.data.items || []))
      .catch(() => toast.error("Failed to load warehouses"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    try {
      if (isNew) {
        await api.post("/warehouses/", selected)
      } else {
        await api.patch(`/warehouses/${selected.id}`, selected)
      }
      setSelected(null)
      setIsNew(false)
      toast.success("Warehouse saved successfully")
      load()
    } catch (e) {
      toast.error("Failed to save warehouse")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return
    try {
      await api.delete(`/warehouses/${id}`)
      toast.success("Warehouse deleted")
      load()
    } catch (e) {
      toast.error("Failed to delete warehouse")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Warehouses
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage global fulfillment centers</p>
        </div>
        <button 
          onClick={() => { setIsNew(true); setSelected({ name: "", location: "", capacity: 100 }) }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm shadow-primary/25"
        >
          <Plus className="w-4 h-4" /> New Warehouse
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="glass rounded-xl p-6 border border-border animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-slate-200 rounded w-24"></div>
                <div className="flex gap-2">
                  <div className="h-4 bg-slate-200 rounded w-8"></div>
                  <div className="h-4 bg-slate-200 rounded w-10"></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          warehouses.map(w => (
            <div key={w.id} className="glass rounded-xl p-6 border border-border">
              <h3 className="font-bold text-lg mb-1">{w.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{w.location}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-700">Capacity: {w.capacity}</span>
                <div className="flex gap-2">
                  <button onClick={() => {setSelected(w); setIsNew(false)}} className="text-xs text-primary hover:underline">Edit</button>
                  <button onClick={() => handleDelete(w.id)} className="text-xs text-destructive hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border font-bold">
              {isNew ? "New Warehouse" : "Edit Warehouse"}
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Name</label>
                <input type="text" value={selected.name} onChange={e => setSelected({...selected, name: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Location</label>
                <input type="text" value={selected.location} onChange={e => setSelected({...selected, location: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground mb-1 block">Capacity</label>
                <input type="number" value={selected.capacity} onChange={e => setSelected({...selected, capacity: Number(e.target.value)})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setSelected(null)} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-100">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
