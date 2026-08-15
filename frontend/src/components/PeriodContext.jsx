import { createContext, useContext, useState, useEffect } from 'react';

const PeriodContext = createContext();

const STORAGE_KEY = 'finanzas-period';

export function PeriodProvider({ children }) {
  const now = new Date();
  const [period, setPeriod] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Number.isInteger(saved.month) && saved.month >= 1 && saved.month <= 12 &&
          Number.isInteger(saved.year) && saved.year >= 2000 && saved.year <= 2100) {
        return { month: saved.month, year: saved.year };
      }
    } catch { /* periodo inválido: usar el actual */ }
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(period));
  }, [period]);

  const value = {
    month: period.month,
    year: period.year,
    setPeriod: (month, year) => setPeriod({ month, year }),
  };

  return (
    <PeriodContext.Provider value={value}>
      {children}
    </PeriodContext.Provider>
  );
}

export const usePeriod = () => useContext(PeriodContext);