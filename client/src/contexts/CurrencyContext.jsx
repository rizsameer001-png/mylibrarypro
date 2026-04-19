/**
 * CurrencyContext
 * Loads system currency from /api/cms/settings once and exposes:
 *   currency      – ISO code e.g. "USD"
 *   symbol        – "$"
 *   formatPrice   – (amount) => "$9.99"
 *
 * Books already include `digitalPriceDisplay` from the API, but this context
 * lets any component format arbitrary amounts consistently.
 */
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹',
  CAD: 'CA$', AUD: 'A$', JPY: '¥', AED: 'AED ',
  SGD: 'S$', CHF: 'CHF ', MXN: 'MX$',
};

const CurrencyContext = createContext({
  currency:    'USD',
  symbol:      '$',
  formatPrice: (n) => `$${Number(n || 0).toFixed(2)}`,
});

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    api.get('/cms/settings')
      .then(({ data }) => { if (data.settings?.currency) setCurrency(data.settings.currency); })
      .catch(() => {});
  }, []);

  const symbol      = SYMBOLS[currency] || `${currency} `;
  const formatPrice = (amount) => `${symbol}${Number(amount || 0).toFixed(2)}`;

  return (
    <CurrencyContext.Provider value={{ currency, symbol, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
