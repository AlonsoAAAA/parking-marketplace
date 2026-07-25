import { ReactNode, useState } from 'react';
import { UserRole } from '../types';

export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: (active: boolean) => ReactNode;
}

interface Props {
  navItems: NavItem[];
  page: string;
  setPage: (p: string) => void;
  onLogout: () => void;
  role: UserRole;
  children: ReactNode;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin General',
  operator: 'Operador',
  sub_admin: 'Sub-admin',
  sub_operator: 'Sub-operador',
};

export default function Layout({ navItems, page, setPage, onLogout, role, children }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const isAdmin = role === 'admin';

  const handleNav = (id: string) => { setPage(id); setShowMenu(false); };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Mobile menu sheet (admin roles with many nav items) ── */}
      {isAdmin && showMenu && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-brand-green-dark/50 backdrop-blur-sm"
          onClick={() => setShowMenu(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-4 pb-10 animate-[slideUp_0.25s_ease]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-black/10" />
            <div className="grid grid-cols-2 gap-2">
              {navItems.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNav(n.id)}
                  className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-[13px] font-medium transition-colors ${
                    page === n.id ? 'bg-brand-green-dark text-brand-lime' : 'bg-[#f5f5f5] text-brand-dark hover:opacity-80'
                  }`}
                >
                  {n.icon(page === n.id)}
                  {n.label}
                </button>
              ))}
            </div>
            <button
              className="mt-3 flex w-full items-center gap-2.5 rounded-xl border-none bg-none px-3.5 py-3 text-[13px] font-medium text-[#bbb]"
              onClick={() => { setShowMenu(false); onLogout(); }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3-4-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar: dark green shell ── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-56 flex-col justify-between bg-brand-green-dark px-4 py-7 text-white md:flex">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-2.5 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-lime text-brand-green-dark shadow">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="currentColor"/></svg>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-black tracking-tight">EstacionaT</div>
              <div className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-brand-lime">{ROLE_LABELS[role]}</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map(n => {
              const active = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold uppercase tracking-wide transition-all ${
                    active
                      ? 'border-l-4 border-brand-lime bg-white/10 pl-[8px] text-brand-lime'
                      : 'text-brand-green-light hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {n.icon(active)}
                  <span className="normal-case tracking-normal">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12px] font-medium text-brand-green-light transition-colors hover:bg-white/5 hover:text-white"
          onClick={onLogout}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3-4-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Cerrar sesión
        </button>
      </aside>

      {/* ── Main column ── */}
      <div className="min-w-0 flex-1 md:ml-56">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-black/5 bg-background/95 px-5 py-3.5 backdrop-blur-md md:hidden">
          <span className="flex items-center gap-2 text-[13px] font-black tracking-tight text-brand-green-dark">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-lime text-brand-green-dark">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" fill="currentColor"/></svg>
            </span>
            EstacionaT
          </span>
          {isAdmin ? (
            <button className="flex flex-col gap-1 border-none bg-none p-1" onClick={() => setShowMenu(true)}>
              <span className="block h-[1.5px] w-[18px] rounded bg-brand-green-dark" />
              <span className="block h-[1.5px] w-[18px] rounded bg-brand-green-dark" />
              <span className="block h-[1.5px] w-[18px] rounded bg-brand-green-dark" />
            </button>
          ) : (
            <button onClick={onLogout} className="border-none bg-none text-[11px] uppercase tracking-wider text-[#999]">Salir</button>
          )}
        </div>

        <div className={isAdmin ? '' : 'pb-[76px] md:pb-0'}>{children}</div>

        {!isAdmin && (
          <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-black/8 bg-white/97 px-0 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
            {navItems.map(n => {
              const active = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className={`flex flex-1 flex-col items-center gap-1 border-none bg-none py-1 text-[9px] font-medium uppercase tracking-wide ${active ? 'text-brand-indigo' : 'text-[#bbb]'}`}
                >
                  {n.icon(active)}
                  {n.shortLabel}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
