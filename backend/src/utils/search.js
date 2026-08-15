export function parseSearchNumber(term) {
  if (!term) return null;
  const s = term.trim().replace(/\s/g, '');
  if (!/^\d+([.,]\d+)*$/.test(s)) return null;

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');

  let decimal = null;
  let thousands = null;

  if (lastDot !== -1 && lastComma !== -1) {
    if (lastDot > lastComma) { decimal = '.'; thousands = ','; }
    else { decimal = ','; thousands = '.'; }
  } else if (lastDot !== -1) {
    const frac = s.length - lastDot - 1;
    if (frac >= 1 && frac <= 2) decimal = '.';
    else thousands = '.';
  } else if (lastComma !== -1) {
    const frac = s.length - lastComma - 1;
    if (frac >= 1 && frac <= 2) decimal = ',';
    else thousands = ',';
  }

  let digits = s;
  if (thousands) digits = digits.split(thousands).join('');
  if (decimal) digits = digits.replace(decimal, '.');

  const num = parseFloat(digits);
  return Number.isFinite(num) ? num : null;
}

export function searchClause(search) {
  const amount = parseSearchNumber(search);
  if (amount === null) {
    return { sql: ' AND t.description LIKE ?', params: [`%${search}%`] };
  }
  return { sql: ' AND (t.description LIKE ? OR t.amount = ?)', params: [`%${search}%`, amount] };
}