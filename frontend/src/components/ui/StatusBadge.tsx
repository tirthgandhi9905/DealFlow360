import { cn } from "@/lib/utils"

export type StatusType = 'draft' | 'pending' | 'pending_approval' | 'approved' | 'rejected' | 'returned' | 'negotiation' | 'confirmed' | 'fulfilled' | 'delivered' | 'paid' | 'unpaid' | 'overridden' | 'consolidated' | 'active' | 'cancelled' | 'modified';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

const statusConfig: Record<string, { bg: string, text: string, defaultLabel: string }> = {
  draft: { bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700', defaultLabel: 'Draft' },
  pending: { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-800', defaultLabel: 'Pending' },
  pending_approval: { bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-800', defaultLabel: 'Pending Approval' },
  approved: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', defaultLabel: 'Approved' },
  rejected: { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-800', defaultLabel: 'Rejected' },
  returned: { bg: 'bg-orange-50 border border-orange-200', text: 'text-orange-800', defaultLabel: 'Returned' },
  negotiation: { bg: 'bg-purple-50 border border-purple-200', text: 'text-purple-800', defaultLabel: 'Negotiation' },
  confirmed: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', defaultLabel: 'Confirmed' },
  fulfilled: { bg: 'bg-teal-50 border border-teal-200', text: 'text-teal-800', defaultLabel: 'Fulfilled' },
  delivered: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', defaultLabel: 'Delivered' },
  paid: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', defaultLabel: 'Paid' },
  unpaid: { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-800', defaultLabel: 'Unpaid' },
  issued: { bg: 'bg-purple-50 border border-purple-200', text: 'text-purple-800', defaultLabel: 'Credit Note' },
  consolidated: { bg: 'bg-purple-50 border border-purple-200', text: 'text-purple-800', defaultLabel: 'Consolidated' },
  active: { bg: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', defaultLabel: 'Active' },
  cancelled: { bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-800', defaultLabel: 'Cancelled' },
  modified: { bg: 'bg-sky-50 border border-sky-200', text: 'text-sky-800', defaultLabel: 'Modified' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase()
  const config = statusConfig[normalizedStatus] || { bg: 'bg-slate-100', text: 'text-slate-800', defaultLabel: status };
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
      config.bg,
      config.text,
      className
    )}>
      {label || config.defaultLabel}
    </span>
  )
}
