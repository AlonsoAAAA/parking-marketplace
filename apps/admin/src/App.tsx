import { useState, ReactNode } from 'react';
import { AdminPage, OperatorPage, UserRole } from './types';
import Layout, { NavItem } from './components/Layout';
import Login from './pages/Login';

import AdminDashboard  from './pages/admin/Dashboard';
import AdminVenues     from './pages/admin/Venues';
import AdminEvents     from './pages/admin/Events';
import AdminParkings   from './pages/admin/Parkings';
import AdminCustomers  from './pages/admin/Customers';
import AdminClaims     from './pages/admin/Claims';
import AdminPromotions from './pages/admin/Promotions';
import AdminPayments   from './pages/admin/Payments';
import AdminFraud      from './pages/admin/Fraud';

import OperatorDashboard   from './pages/operator/Dashboard';
import OperatorReservations from './pages/operator/Reservations';
import OperatorScanner     from './pages/operator/Scanner';
import OperatorProfile     from './pages/operator/Profile';

function decodeRole(token: string): UserRole {
  if (token.startsWith('mock_admin'))    return 'admin';
  if (token.startsWith('mock_operator')) return 'operator';
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return payload.role === 'admin' ? 'admin' : 'operator';
  } catch {
    return 'operator';
  }
}

const ic = (paths: ReactNode, active: boolean) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, color: active ? '#fff' : '#bbb' }}>
    {paths}
  </svg>
);

const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',         shortLabel: 'Inicio',   icon: a => ic(<><rect x="2" y="2" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="11" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/></>, a) },
  { id: 'venues',      label: 'Venues',             shortLabel: 'Venues',   icon: a => ic(<><path d="M3 17V8l7-5 7 5v9" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><rect x="7" y="11" width="6" height="6" rx="0.8" stroke="currentColor" strokeWidth="1.3"/></>, a) },
  { id: 'events',      label: 'Eventos',            shortLabel: 'Eventos',  icon: a => ic(<><rect x="2" y="4" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.4"/><path d="M6.5 2v3.5M13.5 2v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>, a) },
  { id: 'parkings',    label: 'Estacionamientos',   shortLabel: 'Parkings', icon: a => ic(<><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.4"/><path d="M7.5 14V7h3.5a2.5 2.5 0 0 1 0 5H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></>, a) },
  { id: 'customers',   label: 'Clientes',           shortLabel: 'Clientes', icon: a => ic(<><circle cx="8" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 17c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>, a) },
  { id: 'claims',      label: 'Reclamos',           shortLabel: 'Reclamos', icon: a => ic(<><path d="M10 3L2 17h16L10 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 9v4M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></>, a) },
  { id: 'promotions',  label: 'Promociones',        shortLabel: 'Promos',   icon: a => ic(<><path d="M17 3L3 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="5.5" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><circle cx="14.5" cy="14.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/></>, a) },
  { id: 'payments',    label: 'Pagos',              shortLabel: 'Pagos',    icon: a => ic(<><rect x="2" y="5" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 9h16" stroke="currentColor" strokeWidth="1.4"/><rect x="5" y="12" width="3" height="1.5" rx="0.5" fill="currentColor"/></>, a) },
  { id: 'fraud',       label: 'Fraude',             shortLabel: 'Fraude',   icon: a => ic(<><path d="M10 2L3 6v5c0 4.4 3 8.5 7 9.5 4-1 7-5.1 7-9.5V6L10 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></>, a) },
];

const OPERATOR_NAV: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',     shortLabel: 'Inicio',  icon: a => ic(<><rect x="2" y="2" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="2" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="11" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/><rect x="11" y="11" width="7" height="7" rx="1.8" fill={a?'currentColor':'none'} stroke="currentColor" strokeWidth="1.4"/></>, a) },
  { id: 'reservations', label: 'Reservaciones', shortLabel: 'Reservas', icon: a => ic(<><path d="M3 6h14M3 10h9M3 14h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>, a) },
  { id: 'scanner',      label: 'Escáner QR',    shortLabel: 'Escáner', icon: a => ic(<><path d="M2 6.5V3.5A1.5 1.5 0 0 1 3.5 2H6.5M13.5 2h3A1.5 1.5 0 0 1 18 3.5V6.5M18 13.5v3A1.5 1.5 0 0 1 16.5 18H13.5M6.5 18h-3A1.5 1.5 0 0 1 2 16.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><rect x="5" y="5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/><rect x="10.5" y="5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/><rect x="5" y="10.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.3"/><rect x="11.5" y="11.5" width="2" height="2" rx="0.4" fill="currentColor"/><rect x="11.5" y="14" width="2" height="1" rx="0.4" fill="currentColor"/><rect x="14" y="11.5" width="1" height="2" rx="0.4" fill="currentColor"/></>, a) },
  { id: 'profile',      label: 'Mi Perfil',     shortLabel: 'Perfil',  icon: a => ic(<><circle cx="10" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M3 18c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>, a) },
];

function AdminApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [page, setPage] = useState<AdminPage>('dashboard');
  const props = { token };
  return (
    <Layout navItems={ADMIN_NAV} page={page} setPage={p => setPage(p as AdminPage)} onLogout={onLogout} role="admin">
      {page === 'dashboard'  && <AdminDashboard  {...props} />}
      {page === 'venues'     && <AdminVenues     {...props} />}
      {page === 'events'     && <AdminEvents     {...props} />}
      {page === 'parkings'   && <AdminParkings   {...props} />}
      {page === 'customers'  && <AdminCustomers  {...props} />}
      {page === 'claims'     && <AdminClaims     {...props} />}
      {page === 'promotions' && <AdminPromotions {...props} />}
      {page === 'payments'   && <AdminPayments   {...props} />}
      {page === 'fraud'      && <AdminFraud      {...props} />}
    </Layout>
  );
}

function OperatorApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [page, setPage] = useState<OperatorPage>('dashboard');
  const props = { token };
  return (
    <Layout navItems={OPERATOR_NAV} page={page} setPage={p => setPage(p as OperatorPage)} onLogout={onLogout} role="operator">
      {page === 'dashboard'    && <OperatorDashboard   {...props} />}
      {page === 'reservations' && <OperatorReservations {...props} />}
      {page === 'scanner'      && <OperatorScanner     {...props} />}
      {page === 'profile'      && <OperatorProfile     {...props} />}
    </Layout>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pm_admin_token'));

  const handleLogin = (t: string) => {
    localStorage.setItem('pm_admin_token', t);
    setToken(t);
  };
  const handleLogout = () => {
    localStorage.removeItem('pm_admin_token');
    setToken(null);
  };

  if (!token) return <Login onLogin={handleLogin} />;

  const role = decodeRole(token);
  return role === 'admin'
    ? <AdminApp token={token} onLogout={handleLogout} />
    : <OperatorApp token={token} onLogout={handleLogout} />;
}
