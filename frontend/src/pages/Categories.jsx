import { useState, useEffect } from 'react';
import { categories as catApi } from '../api';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#14b8a6', '#f97316'];

export default function Categories() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'expense', color: '#6366f1' });

  const load = async () => {
    setLoading(true);
    try {
      const data = await catApi.list();
      setList(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await catApi.update(editing.id, form);
      } else {
        await catApi.create(form);
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', type: 'expense', color: '#6366f1' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, color: cat.color });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await catApi.remove(id);
      load();
    } catch (err) { alert(err.message); }
  };

  const openNew = () => {
    const usedColors = list.map(c => c.color);
    const avail = COLORS.find(c => !usedColors.includes(c)) || '#6366f1';
    setEditing(null);
    setForm({ name: '', type: 'expense', color: avail });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={18} /> Nueva
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
        ) : list.length === 0 ? (
          <p className="col-span-full text-gray-400 text-center py-12">No hay categorías. Creá tu primera categoría.</p>
        ) : list.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
              <div>
                <p className="font-medium text-gray-900">{cat.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cat.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {cat.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(cat)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Editar' : 'Nueva'} categoría</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'expense' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${form.type === 'expense' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-500'}`}>Gasto</button>
                <button type="button" onClick={() => setForm({ ...form, type: 'income' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${form.type === 'income' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-500'}`}>Ingreso</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="Ej: Comida, Sueldo..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 ${form.color === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700">
                {editing ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
