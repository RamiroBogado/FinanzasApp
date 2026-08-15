import { usePeriod } from './PeriodContext';
import { MONTHS } from '../utils/date';

export default function PeriodSelector() {
  const { month, year, setPeriod } = usePeriod();

  return (
    <div className="flex items-center gap-2">
      <select value={month} onChange={e => setPeriod(Number(e.target.value), year)} className="border rounded-lg px-3 py-2 text-sm">
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>
      <select value={year} onChange={e => setPeriod(month, Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm">
        {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}