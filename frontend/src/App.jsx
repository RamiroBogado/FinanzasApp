import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { PeriodProvider } from './components/PeriodContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Budgets from './pages/Budgets';
import Savings from './pages/Savings';
import Alerts from './pages/Alerts';

function LoadingScreen() {
  return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/transactions" element={<PrivateRoute><Layout><Transactions /></Layout></PrivateRoute>} />
      <Route path="/categories" element={<PrivateRoute><Layout><Categories /></Layout></PrivateRoute>} />
      <Route path="/budgets" element={<PrivateRoute><Layout><Budgets /></Layout></PrivateRoute>} />
      <Route path="/savings" element={<PrivateRoute><Layout><Savings /></Layout></PrivateRoute>} />
      <Route path="/alerts" element={<PrivateRoute><Layout><Alerts /></Layout></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PeriodProvider>
        <AppRoutes />
      </PeriodProvider>
    </AuthProvider>
  );
}
