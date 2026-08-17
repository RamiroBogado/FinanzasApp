import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactions, alerts as alertsApi } from '../api';
import { usePeriod } from '../components/PeriodContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Goal, AlertTriangle, CheckCheck, Bell } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const { month, year } = usePeriod();
  const [data, setData] = useState(null);
  const [alertList, setAlertList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([
        transactions.dashboard(month, year),
        alertsApi.list(),
      ]);
      setData(d);
      setAlertList(a);
      alertsApi.check(month, year)
        .then(() => alertsApi.list())
        .then(setAlertList)
        .catch(() => {});
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [month, year]);

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlertList(alertList.map(a => ({ ...a, read: 1 })));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!data) return <p className="text-gray-500 text-center py-12">Error al cargar datos</p>;

  const expenseByCategory = data.byCategory.filter(c => c.type === 'expense' && c.total > 0);
  const unreadAlerts = alertList.filter(a => !a.read);
  const hasDanger = unreadAlerts.some(a => a.type === 'danger');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {unreadAlerts.length > 0 && (
        <div className={`rounded-xl p-4 ${hasDanger ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className={hasDanger ? 'text-red-600' : 'text-yellow-600'} />
            <span className={`font-medium ${hasDanger ? 'text-red-800' : 'text-yellow-800'}`}>
              Alertas ({unreadAlerts.length})
            </span>
            <div className="flex-1" />
            <Link to="/alerts" className={`text-sm font-medium flex items-center gap-1 ${hasDanger ? 'text-red-700 hover:text-red-800' : 'text-yellow-700 hover:text-yellow-800'}`}>
              <Bell size={14} /> Ver todas
            </Link>
            <button onClick={handleMarkAllRead}
              className={`text-sm font-medium flex items-center gap-1 border rounded-lg px-2 py-1 ${hasDanger ? 'border-red-200 text-red-700 hover:bg-red-100' : 'border-yellow-200 text-yellow-700 hover:bg-yellow-100'}`}>
              <CheckCheck size={14} /> Marcar todas
            </button>
          </div>
          <ul className="space-y-1">
            {unreadAlerts.map(a => (
              <li key={a.id} className={`text-sm ${a.type === 'danger' ? 'text-red-700' : 'text-yellow-700'}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${a.type === 'danger' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos</p>
              <p className="text-2xl font-bold text-green-600">${data.income.toFixed(2)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full"><TrendingUp size={24} className="text-green-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Gastos</p>
              <p className="text-2xl font-bold text-red-600">${data.expense.toFixed(2)}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full"><TrendingDown size={24} className="text-red-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Metas</p>
              <p className="text-2xl font-bold text-amber-600">${data.savings.toFixed(2)}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full"><Goal size={24} className="text-amber-600" /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className={`text-2xl font-bold ${data.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                ${data.balance.toFixed(2)}
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full"><Wallet size={24} className="text-indigo-600" /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Gastos por categoría</h3>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-8">Sin gastos este mes</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Evolución mensual</h3>
          {data.monthlySummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[...data.monthlySummary].reverse()}>
                <XAxis dataKey="month" tickFormatter={(m) => new Date(2024, m - 1).toLocaleString('es', { month: 'short' })} />
                <YAxis />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-8">Sin datos mensuales</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Últimas transacciones</h3>
        {data.recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Categoría</th>
                  <th className="pb-2 font-medium">Descripción</th>
                  <th className="pb-2 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map(tx => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="py-2.5">{tx.date}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tx.category_color }} />
                        {tx.category_name}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">{tx.description || '-'}</td>
                    <td className={`py-2.5 text-right font-medium ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No hay transacciones todavía</p>}
      </div>
    </div>
  );
}
