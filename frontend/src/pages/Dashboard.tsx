import { useState, useEffect } from "react"
import { MetricCard } from "@/components/ui/MetricCard"
import { mockApi } from "@/mocks/handlers"
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { DollarSign, Clock, AlertTriangle, TrendingUp } from "lucide-react"

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [pipeline, setPipeline] = useState<any[]>([])
  const [distribution, setDistribution] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      setStats(await mockApi.dashboard.getStats())
      setPipeline(await mockApi.dashboard.getPipeline())
      setDistribution(await mockApi.dashboard.getDealDistribution())
    }
    loadData()
  }, [])

  if (!stats) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Sales Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Open Deals" 
          value={`$${(stats.openDeals / 1000).toFixed(0)}K`}
          trend={{ value: 18, direction: 'down' }}
          icon={<DollarSign className="w-5 h-5" />}
          glowColor="primary"
        />
        <MetricCard 
          title="Pending Approvals" 
          value={stats.pendingApprovals}
          trend={{ value: 12, direction: 'up' }}
          icon={<Clock className="w-5 h-5" />}
          glowColor="info"
        />
        <MetricCard 
          title="At-Risk Deals" 
          value={stats.atRiskDeals}
          trend={{ value: 12, direction: 'down' }}
          icon={<AlertTriangle className="w-5 h-5" />}
          glowColor="warning"
        />
        <MetricCard 
          title="Avg Margin" 
          value={`${stats.avgMargin}%`}
          trend={{ value: 38.2, direction: 'up' }}
          icon={<TrendingUp className="w-5 h-5" />}
          glowColor="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">Revenue Pipeline</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-foreground">Deal Status Distribution</h3>
          </div>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderColor: 'hsl(var(--border))', borderRadius: '8px', zIndex: 100 }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
