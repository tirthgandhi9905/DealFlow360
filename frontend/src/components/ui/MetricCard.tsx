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
  primary: 'shadow-sm hover:border-primary/30',
  success: 'shadow-sm hover:border-success/30',
  warning: 'shadow-sm hover:border-warning/30',
  info: 'shadow-sm hover:border-info/30',
}

export function MetricCard({ title, value, trend, icon, className, glowColor = 'primary' }: MetricCardProps) {
  return (
    <div className={cn(
      "glass p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group transition-all duration-300 hover:glass-elevated",
      glowVariants[glowColor],
      className
    )}>
      {/* Background ambient glow effect on hover */}
      <div className={cn(
        "absolute -inset-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl -z-10",
        glowColor === 'primary' && 'bg-primary/10',
        glowColor === 'success' && 'bg-success/10',
        glowColor === 'warning' && 'bg-warning/10',
        glowColor === 'info' && 'bg-info/10',
      )} />

      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
            trend.direction === 'up' && "bg-success/10 text-success",
            trend.direction === 'down' && "bg-destructive/10 text-destructive",
            trend.direction === 'neutral' && "bg-muted text-muted-foreground",
          )}>
            {trend.direction === 'up' && '↑'}
            {trend.direction === 'down' && '↓'}
            {trend.direction === 'neutral' && '→'}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold text-foreground tracking-tight">
          {value}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-slate-100 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
