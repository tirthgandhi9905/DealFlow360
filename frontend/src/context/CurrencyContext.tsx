import React, { createContext, useContext, useState, ReactNode } from 'react';

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatAmount: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// Define exchange rates relative to INR (base currency in DB for this prototype)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
};

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<CurrencyCode>('INR');

  const formatAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '-';
    
    // Apply conversion
    const converted = amount * EXCHANGE_RATES[currency];

    // Format based on currency
    if (currency === 'INR') {
      if (converted >= 10000000) return `₹${(converted / 10000000).toFixed(2)}Cr`;
      if (converted >= 100000) return `₹${(converted / 100000).toFixed(1)}L`;
      if (converted >= 1000) return `₹${(converted / 1000).toFixed(1)}K`;
      return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    }

    // Default formatting for USD, EUR, GBP
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    });
    
    if (converted >= 1000000) return formatter.format(converted / 1000000) + 'M';
    if (converted >= 1000) return formatter.format(converted / 1000) + 'K';
    return formatter.format(converted);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
