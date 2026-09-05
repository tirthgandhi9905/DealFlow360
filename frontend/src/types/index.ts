export interface Deal { id: string; deal_number: string; customer_id: string; status: string; total_amount: number; margin_percent: number; risk_score: number; created_at: string }
export interface Customer { id: string; name: string; email: string; tier: string; industry: string }
export interface Product { id: string; name: string; sku: string; category: string; base_price: number; cost: number }
export interface RiskBreakdown { total_score: number; approval_level: string; policy: { score: number; violations: any[] }; behavioral: { score: number; factors: any[] }; commercial: { score: number; factors: any[] } }
