export function formatCurrency(amount, currency = 'USD') {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatArea(sqm) {
  if (!sqm) return '0 sq m';
  const sqft = Math.round(sqm * 10.7639);
  return `${Number(sqm).toLocaleString()} m² (${sqft.toLocaleString()} sq ft)`;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function truncateText(str, maxLength = 120) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}
