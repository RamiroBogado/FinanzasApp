import { useState, useEffect } from 'react';
import { alerts as alertsApi } from '../api';
import { AlertTriangle, CheckCheck, BellRing } from 'lucide-react';

const TYPE_STYLES = {
  danger: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  warning: { badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
};

export default function Alerts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const a = await alertsApi.list();
      setList(a);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await alertsApi.markRead(id);
      setList(list.map(a => a.id === id ? { ...a, read: 1 } : a));
    } catch (err) { alert(err.message); }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setList(list.map(a => ({ ...a, read: 1 })));
    } catch (err) { alert(err.message); }
  };

  const unreadCount = list.filter(a => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            <CheckCheck size={18} /> Marcar todas como leídas ({unreadCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-10 text-center">
          <BellRing size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No hay alertas todavía. Las alertas de presupuesto aparecerán acá.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map(a => {
            const style = TYPE_STYLES[a.type] || TYPE_STYLES.warning;
            return (
              <li key={a.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-start gap-3 ${a.read ? 'opacity-60' : ''}`}>
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                      {a.type === 'danger' ? 'Excedido' : 'Aviso'}
                    </span>
                    {!a.read && <span className="text-xs text-gray-400">Nueva</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{a.created_at}</p>
                </div>
                {!a.read && (
                  <button onClick={() => handleMarkRead(a.id)}
                    className="shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 border rounded-lg px-2 py-1.5 hover:border-indigo-200">
                    <AlertTriangle size={12} /> Marcar leída
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}