import { useState, useEffect } from 'react';
import { savings as savingsApi } from '../api';
import { Plus, Pencil, Trash2, X, PiggyBank } from 'lucide-react';

export default function Savings() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '' });
  const [depositAmount, setDepositAmount] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await savingsApi.list();
      setList(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await savingsApi.update(editing.id, form);
      } else {
        await savingsApi.create(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', target_amount: '', deadline: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleDeposit = async (id) => {
    try {
      await savingsApi.deposit(id, parseFloat(depositAmount));
      setShowDeposit(null);
      setDepositAmount('');
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (g) => {
    setEditing(g);
    setForm({ name: g.name, target_amount: g.target_amount, deadline: g.deadline || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await savingsApi.remove(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Metas de ahorro</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', target_amount: '', deadline: '' }); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={18} /> Nueva meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
        ) : list.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <PiggyBank size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No hay metas de ahorro. Creá tu primera meta.</p>
          </div>
        ) : list.map(g => {
          const percent = g.target_amount > 0 ? Math.min((g.current_amount / g.target_amount) * 100, 100) : 0;
          const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
          return (
            <div key={g.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{g.name}</h3>
                  {daysLeft !== null && (
                    <p className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-500' : daysLeft < 30 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {daysLeft < 0 ? 'Vencida' : `${daysLeft} días restantes`}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setShowDeposit(g.id); setDepositAmount(''); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium">Depositar</button>
                  <button onClick={() => handleEdit(g)} className="p-1 text-gray-400 hover:text-indigo-600"><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(g.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Progreso: <strong>${g.current_amount.toFixed(2)}</strong></span>
                <span className="text-gray-500">Meta: <strong>${g.target_amount.toFixed(2)}</strong></span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                <div className="h-3 rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-xs text-gray-400 text-right">{Math.round(percent)}% completado</p>

              {showDeposit === g.id && (
                <div className="mt-3 flex gap-2">
                  <input type="number" step="0.01" min="0" value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm" placeholder="Monto a depositar" />
                  <button onClick={() => handleDeposit(g.id)} disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Agregar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar' : 'Nueva'} meta de ahorro</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="Ej: Viaje, Auto..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto objetivo</label>
                <input type="number" step="0.01" min="0" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="1000.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite (opcional)</label>
                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                {editing ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
