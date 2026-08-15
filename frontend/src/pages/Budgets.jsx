import { useState, useEffect } from 'react';
import { budgets as budgetApi, categories as catApi } from '../api';
import { usePeriod } from '../components/PeriodContext';
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';

export default function Budgets() {
  const { month, year } = usePeriod();
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category_id: '', amount: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([budgetApi.list(month, year), catApi.list()]);
      setList(b);
      setCats(c.filter(c => c.type === 'expense'));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [month, year]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await budgetApi.update(editing.id, { amount: form.amount });
      } else {
        await budgetApi.create({ category_id: form.category_id, month: String(month).padStart(2, '0'), year, amount: form.amount });
      }
      setShowModal(false);
      setEditing(null);
      setForm({ category_id: '', amount: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (b) => {
    setEditing(b);
    setForm({ category_id: b.category_id, amount: b.amount });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await budgetApi.remove(id);
    load();
  };

  const expenseCats = cats.filter(c => c.type === 'expense');
  const usedCatIds = list.map(b => b.category_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
        <div className="flex gap-2">
          <button onClick={() => { setEditing(null); setForm({ category_id: '', amount: '' }); setShowModal(true); }}
            disabled={expenseCats.length === usedCatIds.length}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Plus size={18} /> Nuevo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
        ) : list.length === 0 ? (
          <p className="col-span-full text-gray-400 text-center py-12">No hay presupuestos para este mes</p>
        ) : list.map(b => {
          const percent = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
          const isOver = b.spent > b.amount;
          const isWarning = !isOver && b.spent > b.amount * 0.8;
          return (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.category_color }} />
                  <span className="font-medium text-gray-900">{b.category_name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(b)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Gastado: <strong className={isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-700'}>${b.spent.toFixed(2)}</strong></span>
                <span className="text-gray-500">Presupuesto: <strong>${b.amount.toFixed(2)}</strong></span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all ${isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${percent}%` }} />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{Math.round(percent)}% utilizado</span>
                {isOver && <span className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Excedido</span>}
                {isWarning && !isOver && <span className="text-xs text-yellow-600">Cerca del límite</span>}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar' : 'Nuevo'} presupuesto</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required
                    className="w-full border rounded-lg px-3 py-2.5 text-sm">
                    <option value="">Seleccionar...</option>
                    {expenseCats.filter(c => !usedCatIds.includes(c.id)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto presupuestado</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="0.00" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                {editing ? 'Guardar cambios' : 'Crear presupuesto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
