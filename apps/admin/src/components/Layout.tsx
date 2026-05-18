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

export default function Layout({ navItems, page, setPage, onLogout, role, children }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const isAdmin = role === 'admin';

  const handleNav = (id: string) => { setPage(id); setShowMenu(false); };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .adm-shell { display: flex; min-height: 100vh; background: #EDEDED; font-family: 'Inter', -apple-system, sans-serif; }

        /* ── SIDEBAR ── */
        .adm-sidebar {
          display: none; width: 220px; flex-shrink: 0;
          position: fixed; top: 0; left: 0; bottom: 0;
          background: #fff; border-right: 1px solid rgba(0,0,0,0.07);
          flex-direction: column; padding: 28px 0 20px; z-index: 50;
        }
        @media(min-width:768px){ .adm-sidebar { display: flex; } }

        .adm-logo { font-size: 11px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; color: #1a1a1a; padding: 0 24px 20px; border-bottom: 1px solid rgba(0,0,0,0.06); margin-bottom: 6px; }
        .adm-logo span { color: #bbb; }
        .adm-role-badge { margin: 8px 24px 12px; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #999; padding: 4px 8px; background: #f5f5f5; border-radius: 5px; display: inline-block; }

        .adm-nav { flex: 1; padding: 4px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
        .adm-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 500; color: #999; cursor: pointer; border: none; background: none; font-family: 'Inter', sans-serif; text-align: left; transition: all 0.15s; width: 100%; }
        .adm-nav-item:hover { background: rgba(0,0,0,0.04); color: #1a1a1a; }
        .adm-nav-item.on { background: #1a1a1a; color: #fff; }
        .adm-nav-item.on:hover { background: #333; }

        .adm-logout { margin: 8px 12px 0; padding: 10px 12px; border-radius: 10px; font-size: 12px; font-weight: 500; color: #bbb; cursor: pointer; border: none; background: none; font-family: 'Inter', sans-serif; text-align: left; transition: all 0.15s; display: flex; align-items: center; gap: 10px; width: calc(100% - 24px); }
        .adm-logout:hover { color: #1a1a1a; background: rgba(0,0,0,0.04); }

        /* ── MAIN ── */
        .adm-main { flex: 1; min-width: 0; }
        @media(min-width:768px){ .adm-main { margin-left: 220px; } }
        .adm-main-pad { padding-bottom: ${isAdmin ? '0' : '72'}px; }
        @media(min-width:768px){ .adm-main-pad { padding-bottom: 0; } }

        /* ── TOP BAR (mobile) ── */
        .adm-topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 14px; position: sticky; top: 0; background: rgba(237,237,237,0.96); backdrop-filter: blur(16px); z-index: 40; border-bottom: 1px solid rgba(0,0,0,0.06); }
        @media(min-width:768px){ .adm-topbar { display: none; } }
        .adm-topbar-logo { font-size: 11px; font-weight: 600; letter-spacing: 4px; text-transform: uppercase; }
        .adm-topbar-logo span { color: #bbb; }
        .adm-hamburger { background: none; border: none; cursor: pointer; padding: 4px; display: flex; flex-direction: column; gap: 4px; }
        .adm-hamburger span { display: block; width: 18px; height: 1.5px; background: #1a1a1a; border-radius: 2px; }

        /* ── BOTTOM TABS (operator mobile) ── */
        .adm-tabs { display: ${isAdmin ? 'none' : 'flex'}; position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.97); backdrop-filter: blur(20px); border-top: 1px solid rgba(0,0,0,0.08); padding: 8px 0 max(8px, env(safe-area-inset-bottom)); z-index: 50; }
        @media(min-width:768px){ .adm-tabs { display: none !important; } }
        .adm-tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 4px 0; cursor: pointer; border: none; background: none; font-family: 'Inter', sans-serif; font-size: 9px; font-weight: 500; letter-spacing: 0.5px; color: #bbb; text-transform: uppercase; transition: color 0.15s; }
        .adm-tab.on { color: #1a1a1a; }

        /* ── MOBILE MENU SHEET (admin) ── */
        .adm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: flex-end; }
        .adm-sheet { background: #fff; border-radius: 20px 20px 0 0; padding: 20px 16px max(32px, env(safe-area-inset-bottom)); width: 100%; animation: slideUp 0.25s ease; }
        .adm-sheet-handle { width: 36px; height: 3px; background: #e0e0e0; border-radius: 3px; margin: 0 auto 20px; }
        .adm-sheet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .adm-sheet-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; border: none; background: #f5f5f5; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #1a1a1a; transition: all 0.15s; text-align: left; }
        .adm-sheet-item.on { background: #1a1a1a; color: #fff; }
        .adm-sheet-item:hover { opacity: 0.8; }
        .adm-sheet-logout { margin-top: 12px; padding: 12px 14px; border-radius: 12px; border: none; background: none; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: #bbb; width: 100%; display: flex; align-items: center; gap: 10px; }
      `}</style>

      {isAdmin && showMenu && (
        <div className="adm-overlay" onClick={() => setShowMenu(false)}>
          <div className="adm-sheet" onClick={e => e.stopPropagation()}>
            <div className="adm-sheet-handle" />
            <div className="adm-sheet-grid">
              {navItems.map(n => (
                <button key={n.id} onClick={() => handleNav(n.id)} className={`adm-sheet-item${page === n.id ? ' on' : ''}`}>
                  {n.icon(page === n.id)}
                  {n.label}
                </button>
              ))}
            </div>
            <button className="adm-sheet-logout" onClick={() => { setShowMenu(false); onLogout(); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3-4-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      <div className="adm-shell">
        <aside className="adm-sidebar">
          <div className="adm-logo">Park<span>MX</span></div>
          <div className="adm-role-badge">{isAdmin ? 'Admin General' : 'Operador'}</div>
          <nav className="adm-nav">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} className={`adm-nav-item${page === n.id ? ' on' : ''}`}>
                {n.icon(page === n.id)}
                {n.label}
              </button>
            ))}
          </nav>
          <button className="adm-logout" onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M10 11l4-3-4-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Cerrar sesión
          </button>
        </aside>

        <div className="adm-main">
          <div className="adm-topbar">
            <span className="adm-topbar-logo">Park<span>MX</span></span>
            {isAdmin
              ? <button className="adm-hamburger" onClick={() => setShowMenu(true)}><span/><span/><span/></button>
              : <button onClick={onLogout} style={{background:'none',border:'none',cursor:'pointer',color:'#bbb',fontSize:11,letterSpacing:'1.5px',textTransform:'uppercase',fontFamily:'Inter,sans-serif'}}>Salir</button>
            }
          </div>
          <div className="adm-main-pad">{children}</div>
        </div>

        {!isAdmin && (
          <nav className="adm-tabs">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} className={`adm-tab${page === n.id ? ' on' : ''}`}>
                {n.icon(page === n.id)}
                {n.shortLabel}
              </button>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
