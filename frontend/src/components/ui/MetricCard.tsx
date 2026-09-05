import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  className?: string;
  glowColor?: 'primary' | 'success' | 'warning' | 'info';
}

const glowVariants = {
  primary: 'shadow-sm hover:border-primary/40',
  success: 'shadow-sm hover:border-emerald-500/40',
  warning: 'shadow-sm hover:border-amber-500/40',
  info: 'shadow-sm hover:border-sky-500/40',
}

export function MetricCard({ title, value, trend, icon, className, glowColor = 'primary' }: MetricCardProps) {
  return (
    <div className={cn(
      "glass p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden group transition-all duration-300 hover:glass-elevated hover:shadow-md",
      glowVariants[glowColor],
      className
    )}>
      <div className="flex justify-between items-start">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md",
            trend.direction === 'up' && "bg-emerald-50 text-emerald-700 border border-emerald-200",
            trend.direction === 'down' && "bg-rose-50 text-rose-700 border border-rose-200",
            trend.direction === 'neutral' && "bg-slate-100 text-slate-700",
          )}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'neutral' && '→'}
            {trend.value}% {trend.label || ""}
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-2xl font-black text-foreground tracking-tight">
          {value}
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-slate-100 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
