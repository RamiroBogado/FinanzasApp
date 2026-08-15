export const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2024, i).toLocaleString('es', { month: 'long' }));

export function monthName(month) {
  return MONTHS[month - 1] || '';
}

export function prevMonthName(month, year) {
  return new Date(year, month - 1, 0).toLocaleString('es', { month: 'long' });
}

export function monthBounds(month, year) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  return { start, end };
}

export function formatShortDate(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}