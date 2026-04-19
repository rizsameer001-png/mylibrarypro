/**
 * currency.js  (server-side helper)
 * Centralised currency formatting so every price response is consistent.
 */

const SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹',
  CAD: 'CA$', AUD: 'A$', JPY: '¥', AED: 'AED ',
  SGD: 'S$', CHF: 'CHF ', MXN: 'MX$',
};

/**
 * Format a numeric amount with the given ISO currency code.
 * e.g. formatPrice(9.99, 'INR') => '₹9.99'
 */
const formatPrice = (amount, currencyCode = 'USD') => {
  const symbol = SYMBOLS[currencyCode] || `${currencyCode} `;
  return `${symbol}${Number(amount || 0).toFixed(2)}`;
};

/**
 * Attach currency-formatted fields to a book object
 * so the client never has to know the currency itself.
 */
const attachPriceDisplay = (book, currencyCode) => {
  if (!book) return book;
  const b = typeof book.toObject === 'function' ? book.toObject() : { ...book };
  b.digitalPriceDisplay = formatPrice(b.digitalPrice || 0, currencyCode);
  return b;
};

module.exports = { formatPrice, attachPriceDisplay, SYMBOLS };
