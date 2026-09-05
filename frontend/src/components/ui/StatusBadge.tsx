import { cn } from "@/lib/utils"

export type StatusType = 'draft' | 'pending' | 'approved' | 'rejected' | 'negotiation' | 'confirmed' | 'fulfilled' | 'at_risk' | 'info';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { bg: string, text: string, defaultLabel: string }> = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground', defaultLabel: 'Draft' },
  pending: { bg: 'bg-warning/20', text: 'text-warning', defaultLabel: 'Pending' },
  approved: { bg: 'bg-success/20', text: 'text-success', defaultLabel: 'Approved' },
  rejected: { bg: 'bg-destructive/20', text: 'text-destructive', defaultLabel: 'Rejected' },
  negotiation: { bg: 'bg-primary/20', text: 'text-primary', defaultLabel: 'Negotiation' },
  confirmed: { bg: 'bg-success/20', text: 'text-success', defaultLabel: 'Confirmed' },
  fulfilled: { bg: 'bg-info/20', text: 'text-info', defaultLabel: 'Fulfilled' },
  at_risk: { bg: 'bg-warning/20', text: 'text-warning', defaultLabel: 'At Risk' },
  info: { bg: 'bg-info/20', text: 'text-info', defaultLabel: 'Info' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      config.bg,
      config.text,
      className
    )}>
      {label || config.defaultLabel}
    </span>
  )
}
