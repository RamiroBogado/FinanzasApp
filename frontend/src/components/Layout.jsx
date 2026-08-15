import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRightLeft, Tags, PiggyBank, Goal, LogOut, Menu, X, Bot
} from 'lucide-react';
import { useAuth } from './AuthContext';
import PeriodSelector from './PeriodSelector';
import ChatBot from './ChatBot';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transacciones', icon: ArrowRightLeft },
  { path: '/categories', label: 'Categorías', icon: Tags },
  { path: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { path: '/savings', label: 'Metas', icon: Goal },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden ${sidebarOpen ? '' : 'hidden'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-indigo-600">Finanzas App</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full">
            <LogOut size={20} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between gap-3 lg:justify-end">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 lg:hidden">Finanzas App</h2>
          <div className="flex items-center gap-2 lg:gap-3 text-sm text-gray-500">
            <PeriodSelector />
            <span className="hidden sm:inline">{user?.email}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-3.5 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        {chatOpen ? <X size={24} /> : <Bot size={24} />}
      </button>

      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
    </div>
  );
}
