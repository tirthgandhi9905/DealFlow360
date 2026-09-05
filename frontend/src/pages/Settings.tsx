import { useState, useEffect } from "react"
import { Save, Check, Shield, Activity, Truck, Link as LinkIcon, Database } from "lucide-react"

export default function Settings() {
  const [isSaved, setIsSaved] = useState(false)
  const [settings, setSettings] = useState({
    // Governance Policies
    bronzeCeiling: 5,
    silverCeiling: 10,
    goldCeiling: 15,
    
    // Approval Thresholds
    autoApproveScore: 40,
    managerReviewScore: 70,
    
    // Commercial Hurdle Rates
    minProfitMargin: 25,
    maxConcessionBudget: 100000,
    
    // Logistics & MILP Weights
    freightCostWeight: 0.5,
    deliveryDaysWeight: 0.3,
    warehouseSplitPenalty: 0.2,
    
    // Deal Health Watchdog
    stalledDealThreshold: 7,
    autoNudgeTriggers: true,
    
    // Odoo ERP Connector
    erpUrl: "https://odoo.dealflow360.local",
    erpSyncEnabled: true,
  })

  // Load from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('dealflow_settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        console.error("Failed to parse settings", e)
      }
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('dealflow_settings', JSON.stringify(settings))
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 3000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }))
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enterprise Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure governance policies, thresholds, and integrations.</p>
        </div>
        <button 
          onClick={handleSave}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            isSaved 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-primary text-white hover:bg-primary/90'
          }`}
        >
          {isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isSaved ? "Saved" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Governance & Approvals */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold">Governance & Approvals</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Discount Ceilings (%)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Bronze</label>
                    <input type="number" name="bronzeCeiling" value={settings.bronzeCeiling} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Silver</label>
                    <input type="number" name="silverCeiling" value={settings.silverCeiling} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Gold</label>
                    <input type="number" name="goldCeiling" value={settings.goldCeiling} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <h3 className="text-sm font-medium text-foreground mb-3">Approval Thresholds (Risk Score)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Auto-Approve (≤)</label>
                    <input type="number" name="autoApproveScore" value={settings.autoApproveScore} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Manager Review (≤)</label>
                    <input type="number" name="managerReviewScore" value={settings.managerReviewScore} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                  </div>
                  <p className="text-xs text-muted-foreground col-span-2">Scores &gt; {settings.managerReviewScore} will require Finance Sign-off.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Commercial Hurdle Rates */}
          <section className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold">Commercial Hurdle Rates</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Min Profit Margin (%)</label>
                <input type="number" name="minProfitMargin" value={settings.minProfitMargin} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Max Concession ($)</label>
                <input type="number" name="maxConcessionBudget" value={settings.maxConcessionBudget} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
              </div>
            </div>
          </section>
        </div>

        {/* Column 2 */}
        <div className="space-y-6">
          {/* Logistics & MILP Weights */}
          <section className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold">Logistics & MILP Weights</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1 flex justify-between">
                  <span>Freight Cost (α)</span>
                  <span className="text-muted-foreground">{settings.freightCostWeight}</span>
                </label>
                <input type="range" name="freightCostWeight" min="0" max="1" step="0.1" value={settings.freightCostWeight} onChange={handleChange} className="w-full accent-purple-600" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1 flex justify-between">
                  <span>Delivery Days (β)</span>
                  <span className="text-muted-foreground">{settings.deliveryDaysWeight}</span>
                </label>
                <input type="range" name="deliveryDaysWeight" min="0" max="1" step="0.1" value={settings.deliveryDaysWeight} onChange={handleChange} className="w-full accent-purple-600" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1 flex justify-between">
                  <span>Warehouse Split Penalty (γ)</span>
                  <span className="text-muted-foreground">{settings.warehouseSplitPenalty}</span>
                </label>
                <input type="range" name="warehouseSplitPenalty" min="0" max="1" step="0.1" value={settings.warehouseSplitPenalty} onChange={handleChange} className="w-full accent-purple-600" />
              </div>
            </div>
          </section>

          {/* Odoo Integration */}
          <section className="bg-white rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Database className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold">Odoo ERP Connector</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Connected
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Instance URL</label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="text" name="erpUrl" value={settings.erpUrl} onChange={handleChange} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
                </div>
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-border/50 rounded-lg hover:bg-slate-50 transition-colors">
                <input type="checkbox" name="erpSyncEnabled" checked={settings.erpSyncEnabled} onChange={handleChange} className="w-4 h-4 text-primary rounded focus:ring-primary accent-primary" />
                <div>
                  <div className="text-sm font-medium">Real-time ERP Sync</div>
                  <div className="text-xs text-muted-foreground">Automatically push approved deals to Odoo</div>
                </div>
              </label>
            </div>
          </section>

          {/* Deal Health */}
          <section className="bg-white rounded-xl border border-border p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-lg font-semibold">Deal Health Watchdog</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Stalled Deal Threshold (Days)</label>
                <input type="number" name="stalledDealThreshold" value={settings.stalledDealThreshold} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-border rounded-lg text-sm" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer p-3 border border-border/50 rounded-lg hover:bg-slate-50 transition-colors">
                <input type="checkbox" name="autoNudgeTriggers" checked={settings.autoNudgeTriggers} onChange={handleChange} className="w-4 h-4 text-primary rounded focus:ring-primary accent-primary" />
                <div>
                  <div className="text-sm font-medium">Auto-Nudge Triggers</div>
                  <div className="text-xs text-muted-foreground">Alert sales reps when deals stall past threshold</div>
                </div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
