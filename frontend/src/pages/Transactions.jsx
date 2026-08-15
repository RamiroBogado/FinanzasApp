import { useState, useEffect } from 'react';
import { transactions as txApi, categories as catApi, exportCSV } from '../api';
import { usePeriod } from '../components/PeriodContext';
import { monthBounds, prevMonthName, formatShortDate } from '../utils/date';
import { Plus, Pencil, Trash2, Download, Search, X } from 'lucide-react';

export default function Transactions() {
  const { month, year } = usePeriod();
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ type: '', category_id: '', search: '', start_date: '', end_date: '' });
  const [form, setForm] = useState({ category_id: '', amount: '', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
  const [previousBalance, setPreviousBalance] = useState(null);

  const buildParams = (range = null) => {
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.category_id) params.category_id = filters.category_id;
    if (filters.search) params.search = filters.search;
    if (range) {
      params.start_date = range.start;
      params.end_date = range.end;
    } else {
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
    }
    return params;
  };

  const load = async (range = null) => {
    setLoading(true);
    try {
      const [txns, categories, prev] = await Promise.all([
        txApi.list(buildParams(range)),
        catApi.list(),
        txApi.previousBalance(month, year),
      ]);
      setList(txns);
      setCats(categories);
      setPreviousBalance(prev.amount);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => {
    const range = monthBounds(month, year);
    setFilters(f => ({ ...f, start_date: range.start, end_date: range.end }));
    load(range);
  }, [month, year]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await txApi.update(editing.id, form);
      } else {
        await txApi.create(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ category_id: '', amount: '', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (tx) => {
    setEditing(tx);
    setForm({ category_id: tx.category_id, amount: tx.amount, type: tx.type, description: tx.description, date: tx.date });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    await txApi.remove(id);
    load();
  };

  const handleExport = async () => {
    try {
      const res = await exportCSV(buildParams());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transacciones.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al exportar'); }
  };

  const filteredCats = cats.filter(c => !form.type || c.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
        <button onClick={() => { setEditing(null); setForm({ category_id: '', amount: '', type: 'expense', description: '', date: new Date().toISOString().split('T')[0] }); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={18} /> Nueva
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="Descripción..." />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoría</label>
            <select value={filters.category_id} onChange={e => setFilters({ ...filters, category_id: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">Todas</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={filters.start_date} onChange={e => setFilters({ ...filters, start_date: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={filters.end_date} onChange={e => setFilters({ ...filters, end_date: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={load} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">Filtrar</button>
          <button onClick={handleExport} className="flex items-center gap-1 bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-200">
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
        ) : list.length === 0 && previousBalance === null ? (
          <p className="text-gray-400 text-center py-12">No hay transacciones</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-gray-500">
                  <th className="p-3 font-medium">Fecha</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Categoría</th>
                  <th className="p-3 font-medium">Descripción</th>
                  <th className="p-3 font-medium text-right">Monto</th>
                  <th className="p-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {previousBalance !== null && (
                  <tr className="border-b bg-gray-50/60">
                    <td className="p-3 text-gray-500">{formatShortDate(monthBounds(month, year).start)}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Balance</span>
                    </td>
                    <td className="p-3 text-gray-400">-</td>
                    <td className="p-3">
                      <span className="font-medium text-gray-600">Balance anterior</span>
                      <span className="block text-xs text-gray-400">Saldo de {prevMonthName(month, year)}</span>
                    </td>
                    <td className={`p-3 text-right font-medium ${previousBalance > 0 ? 'text-green-600' : previousBalance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {previousBalance > 0 ? '+' : previousBalance < 0 ? '-' : ''}${Math.abs(previousBalance).toFixed(2)}
                    </td>
                    <td className="p-3 text-right"></td>
                  </tr>
                )}
                {list.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-3">{tx.date}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tx.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tx.category_color }} />
                        {tx.category_name}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 max-w-[200px] truncate">{tx.description || '-'}</td>
                    <td className={`p-3 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      ${tx.amount.toFixed(2)}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEdit(tx)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar' : 'Nueva'} transacción</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'expense', category_id: '' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${form.type === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-500'}`}>Gasto</button>
                <button type="button" onClick={() => setForm({ ...form, type: 'income', category_id: '' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${form.type === 'income' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-500'}`}>Ingreso</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm">
                  <option value="">Seleccionar...</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="Opcional..." />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                {editing ? 'Guardar cambios' : 'Crear transacción'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
