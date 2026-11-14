/**
 * Currency, Date, and Phone formatting utilities for Northern Flavors Restaurant
 */

export function formatNaira(amount, includeDecimals = false) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })
    .format(num)
    .replace('NGN', '₦');
}

export function formatDateLagos(isoDateString, includeTime = true) {
  if (!isoDateString) return '—';
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        : {}),
    }).format(date);
  } catch {
    return String(isoDateString);
  }
}

export function normalizeNigerianPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.slice(1);
  } else if (cleaned.startsWith('+234')) {
    cleaned = cleaned.replace('+', '');
  }
  return cleaned;
}

