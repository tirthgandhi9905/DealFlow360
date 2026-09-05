import { mockDeals, getDashboardStats, mockProducts, mockCustomers } from './data';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  dashboard: {
    getStats: async () => {
      await delay(500);
      return getDashboardStats();
    },
    getPipeline: async () => {
      await delay(600);
      return [
        { name: 'Jan', value: 40000 },
        { name: 'Feb', value: 150000 },
        { name: 'Mar', value: 180000 },
        { name: 'Apr', value: 200000 },
        { name: 'May', value: 350000 },
        { name: 'Jun', value: 220000 },
        { name: 'Jul', value: 290000 },
        { name: 'Aug', value: 380000 },
      ];
    },
    getDealDistribution: async () => {
      await delay(500);
      return [
        { name: 'Draft', value: 40, fill: 'hsl(215 28% 17%)' },
        { name: 'Pending', value: 30, fill: 'hsl(38 92% 50%)' },
        { name: 'Approved', value: 20, fill: 'hsl(142 76% 36%)' },
        { name: 'At Risk', value: 10, fill: 'hsl(0 84% 60%)' },
      ];
    }
  },
  quotes: {
    list: async () => {
      await delay(700);
      return mockDeals;
    },
    get: async (id: string) => {
      await delay(500);
      return mockDeals.find(d => d.id === id);
    }
  },
  products: {
    list: async () => {
      await delay(400);
      return mockProducts;
    }
  },
  customers: {
    list: async () => {
      await delay(400);
      return mockCustomers;
    }
  }
};
