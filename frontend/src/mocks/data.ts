export const mockCustomers = [
  { id: '1', name: 'Acme Corp', tier: 'Gold', industry: 'Technology', status: 'active' },
  { id: '2', name: 'Beta Industries', tier: 'Silver', industry: 'Manufacturing', status: 'active' },
  { id: '3', name: 'Gamma Tech', tier: 'Bronze', industry: 'Software', status: 'active' },
];

export const mockProducts = [
  { id: 'p1', name: 'Laptop Pro 14', category: 'Hardware', basePrice: 1450, margin: 40, maxDiscount: 15 },
  { id: 'p2', name: 'Desktop Prime', category: 'Hardware', basePrice: 1800, margin: 35, maxDiscount: 12 },
  { id: 'p3', name: 'Cloud Storage Annual', category: 'Subscription', basePrice: 1200, margin: 80, maxDiscount: 25 },
  { id: 'p4', name: 'Premium Support', category: 'Services', basePrice: 500, margin: 60, maxDiscount: 20 },
  { id: 'p5', name: 'Setup Service', category: 'Services', basePrice: 300, margin: 70, maxDiscount: 10 },
  { id: 'p6', name: 'Docking Station', category: 'Hardware', basePrice: 200, margin: 45, maxDiscount: 20 },
];

export const mockDeals = [
  { 
    id: 'QT-2024-0042', 
    customer: mockCustomers[0], 
    status: 'draft',
    amount: 32625,
    margin: 34.2,
    riskScore: 52,
    createdAt: '2024-10-15T10:30:00Z',
    items: [
      { product: mockProducts[0], quantity: 25, unitPrice: 1450, discount: 10 },
      { product: mockProducts[4], quantity: 1, unitPrice: 300, discount: 0 },
    ]
  },
  { 
    id: 'QT-2024-0043', 
    customer: mockCustomers[1], 
    status: 'pending',
    amount: 15400,
    margin: 38.5,
    riskScore: 24,
    createdAt: '2024-10-16T14:15:00Z',
    items: [
      { product: mockProducts[1], quantity: 10, unitPrice: 1800, discount: 5 },
      { product: mockProducts[3], quantity: 1, unitPrice: 500, discount: 0 },
    ]
  },
  { 
    id: 'QT-2024-0044', 
    customer: mockCustomers[2], 
    status: 'approved',
    amount: 8500,
    margin: 42.1,
    riskScore: 12,
    createdAt: '2024-10-14T09:00:00Z',
    items: [
      { product: mockProducts[2], quantity: 10, unitPrice: 1200, discount: 10 },
    ]
  }
];

export const mockWarehouses = [
  { id: 'w1', name: 'Main Warehouse (Mumbai)', location: 'Mumbai', type: 'primary' },
  { id: 'w2', name: 'East Depot (Delhi)', location: 'Delhi', type: 'depot' }
];

export const getDashboardStats = () => {
  return {
    openDeals: 284000,
    pendingApprovals: 12,
    atRiskDeals: 5,
    avgMargin: 38.2
  }
};
