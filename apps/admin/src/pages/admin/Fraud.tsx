import { useState, useEffect, useMemo, useCallback } from 'react';
import { FraudAlert, FraudRule, FraudStats } from '../../types';
import { api } from '../../lib/api';

interface Props { token: string; }

type Tab = 'dashboard' | 'alerts' | 'rules';

// ─── Level config ────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  high:   { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444', label: 'Alto' },
  medium: { bg: '#FEF3C7', color: '#92400E', dot: '#F59E0B', label: 'Medio' },
  low:    { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6', label: 'Bajo' },
};

const ALERT_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente' },
  reviewed:  { bg: '#D1FAE5', color: '#065F46', label: 'Revisado'  },
  dismissed: { bg: '#F3F4F6', color: '#6B7280', label: 'Descartado'},
};

const RULE_LABEL: Record<string, string> = {
  rapid_reservations: 'Reservas rápidas',
  failed_payments:    'Pagos fallidos',
  duplicate_scan:     'QR duplicado',
  repeat_cancel:      'Cancelaciones repetidas',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Bar chart (SVG, no deps) ─────────────────────────────────────────────

function BarChart({ daily }: { daily: FraudStats['daily'] }) {
  // Fill last 30 days
  const days = useMemo(() => {
    const map = new Map(daily.map(d => [d.day.slice(0, 10), d]));
    const result: Array<{ day: string; count: number; high: number; medium: number; low: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push(map.get(key) ?? { day: key, count: 0, high: 0, medium: 0, low: 0 });
    }
    return result;
  }, [daily]);

  const maxCount = Math.max(...days.map(d => d.count), 1);
  const W = 600;
  const H = 100;
  const barW = Math.floor((W - 30) / 30) - 1;
  const gap  = (W - 30) / 30;

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px 16px', marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#bbb', marginBottom: 16 }}>
        Alertas — últimos 30 días
      </div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', overflow: 'visible' }}>
        {days.map((d, i) => {
          const x = 15 + i * gap;
          const totalH = d.count === 0 ? 0 : Math.max(4, (d.count / maxCount) * H);
          const highH  = totalH * (d.high   / d.count || 0);
          const midH   = totalH * (d.medium / d.count || 0);
          const lowH   = totalH - highH - midH;
          const isToday = d.day.slice(0, 10) === new Date().toISOString().slice(0, 10);

          return (
            <g key={d.day}>
              {d.count > 0 && (
                <>
                  <rect x={x} y={H - lowH}  width={barW} height={lowH}  fill="#93C5FD" rx={lowH  < totalH ? 0 : 2} />
                  <rect x={x} y={H - lowH - midH}  width={barW} height={midH}  fill="#FCD34D" rx={midH  < totalH ? 0 : 2} />
                  <rect x={x} y={H - totalH} width={barW} height={highH} fill="#F87171" rx={2} />
                </>
              )}
              {d.count === 0 && (
                <rect x={x} y={H - 2} width={barW} height={2} fill="#F3F4F6" rx={1} />
              )}
              {isToday && (
                <rect x={x} y={H + 8} width={barW} height={2} fill="#04210f" rx={1} />
              )}
            </g>
          );
        })}
        <line x1={15} y1={H} x2={W - 15} y2={H} stroke="#F3F4F6" strokeWidth={1} />
        <text x={15} y={H + 18} fontSize={8} fill="#ccc">
          {days[0]?.day.slice(5)}
        </text>
        <text x={W - 15} y={H + 18} fontSize={8} fill="#ccc" textAnchor="end">
          {days[29]?.day.slice(5)}
        </text>
        <text x={W - 15} y={8} fontSize={8} fill="#ccc" textAnchor="end">
          {maxCount}
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        {[['#F87171','Alto'],['#FCD34D','Medio'],['#93C5FD','Bajo']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 10, color: '#bbb', fontWeight: 500 }}>{l}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 4 }}>
          <div style={{ width: 16, height: 2, background: '#04210f', borderRadius: 1 }} />
          <span style={{ fontSize: 10, color: '#bbb', fontWeight: 500 }}>Hoy</span>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard tab ────────────────────────────────────────────────────────

function DashboardTab({ stats }: { stats: FraudStats | null }) {
  if (!stats) {
    return <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>;
  }
  const { today } = stats;

  const cards = [
    { dot: '#EF4444', val: today.highToday,    lbl: 'Alto hoy' },
    { dot: '#F59E0B', val: today.mediumToday,  lbl: 'Medio hoy' },
    { dot: '#3B82F6', val: today.lowToday,     lbl: 'Bajo hoy' },
    { dot: '#6B7280', val: today.pendingTotal,  lbl: 'Sin revisar' },
  ];

  return (
    <>
      <div className="adm-metrics" style={{ marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.lbl} className="adm-metric">
            <div className="adm-metric-dot" style={{ background: c.dot }} />
            <div className="adm-metric-val">{c.val}</div>
            <div className="adm-metric-lbl">{c.lbl}</div>
          </div>
        ))}
      </div>
      <BarChart daily={stats.daily} />
    </>
  );
}

// ─── Alerts tab ───────────────────────────────────────────────────────────

function AlertsTab({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.admin.fraudAlerts(token, statusFilter, levelFilter)
      .then(d => setAlerts((d as any)?.data || []))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, [token, statusFilter, levelFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts.filter(a =>
      !q ||
      (a.userName || '').toLowerCase().includes(q) ||
      (a.userPhone || '').toLowerCase().includes(q) ||
      (a.ruleName  || '').toLowerCase().includes(q) ||
      a.rule_key.includes(q),
    );
  }, [alerts, search]);

  const changeStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await api.admin.updateFraudAlert(token, id, status);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: status as any } : a));
    } catch { /* ignore */ }
    finally { setUpdating(null); }
  };

  const LEVELS = ['all', 'high', 'medium', 'low'];
  const STATUSES = ['all', 'pending', 'reviewed', 'dismissed'];

  return (
    <>
      <div className="adm-search-bar">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ opacity: 0.3, flexShrink: 0 }}>
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#04210f" strokeWidth="1.4"/>
          <path d="M9 9L12 12" stroke="#04210f" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por usuario, regla..." />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 18, lineHeight: 1 }}>×</button>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {LEVELS.map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`adm-filter${levelFilter === l ? ' on' : ''}`}>
              {l === 'all' ? 'Todos' : LEVEL_CONFIG[l]?.label ?? l}
            </button>
          ))}
        </div>
        <div style={{ width: 1, background: 'rgba(0,0,0,0.08)', margin: '0 2px' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`adm-filter${statusFilter === s ? ' on' : ''}`}>
              {ALERT_STATUS[s]?.label ?? 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
      ) : filtered.length === 0 ? (
        <div className="adm-tw">
          <div className="adm-empty">
            <div className="adm-empty-icon">🛡️</div>
            <div className="adm-empty-text">Sin alertas de fraude</div>
            <div className="adm-empty-sub">Las alertas aparecen automáticamente cuando se detectan patrones sospechosos</div>
          </div>
        </div>
      ) : (
        <div className="adm-tw" style={{ overflowX: 'auto' }}>
          <table className="adm-t">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo de fraude</th>
                <th>Nivel</th>
                <th>Detalle</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const lc  = LEVEL_CONFIG[a.level]  ?? LEVEL_CONFIG.medium;
                const sc  = ALERT_STATUS[a.status] ?? ALERT_STATUS.pending;
                const det = a.detail || {};
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.userName || '—'}</div>
                      {a.userPhone && <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>{a.userPhone}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: '#555' }}>
                      {a.ruleName || RULE_LABEL[a.rule_key] || a.rule_key}
                    </td>
                    <td>
                      <span className="adm-pill" style={{ background: lc.bg, color: lc.color }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: lc.dot, display: 'inline-block', marginRight: 5 }} />
                        {lc.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#888', maxWidth: 200 }}>
                      {det.count !== undefined && `${det.count} veces`}
                      {det.threshold !== undefined && ` (límite: ${det.threshold})`}
                      {det.windowMinutes !== undefined && det.windowMinutes > 0 && ` en ${det.windowMinutes} min`}
                      {det.reservationId && <span style={{ fontFamily: 'monospace' }}>{String(det.reservationId).slice(0, 8)}</span>}
                    </td>
                    <td style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>{fmtDate(a.created_at)}</td>
                    <td>
                      <span className="adm-pill" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                    </td>
                    <td>
                      {a.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="adm-btn adm-btn-ghost adm-btn-sm"
                            disabled={updating === a.id}
                            onClick={() => changeStatus(a.id, 'reviewed')}
                          >Revisar</button>
                          <button
                            className="adm-btn adm-btn-sm"
                            style={{ background: '#F3F4F6', color: '#6B7280' }}
                            disabled={updating === a.id}
                            onClick={() => changeStatus(a.id, 'dismissed')}
                          >Descartar</button>
                        </div>
                      )}
                      {a.status !== 'pending' && (
                        <button
                          className="adm-btn adm-btn-ghost adm-btn-sm"
                          disabled={updating === a.id}
                          onClick={() => changeStatus(a.id, 'pending')}
                        >Reabrir</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── Rules tab ────────────────────────────────────────────────────────────

function RulesTab({ token }: { token: string }) {
  const [rules, setRules] = useState<FraudRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, { threshold: string; windowMinutes: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    api.admin.fraudRules(token)
      .then(d => setRules((d as any)?.data || []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleActive = async (rule: FraudRule) => {
    setSaving(rule.id);
    try {
      const updated = await api.admin.updateFraudRule(token, rule.id, { isActive: !rule.is_active });
      const row = (updated as any)?.data ?? updated;
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, is_active: row.is_active } : r));
    } catch { /* ignore */ }
    finally { setSaving(null); }
  };

  const saveThreshold = async (rule: FraudRule) => {
    const ed = editing[rule.id];
    if (!ed) return;
    setSaving(rule.id);
    try {
      const data: Record<string, number> = {};
      const t = parseInt(ed.threshold);
      const w = parseInt(ed.windowMinutes);
      if (!isNaN(t) && t > 0)  data.threshold = t;
      if (!isNaN(w) && w >= 0) data.windowMinutes = w;
      const updated = await api.admin.updateFraudRule(token, rule.id, data);
      const row = (updated as any)?.data ?? updated;
      setRules(prev => prev.map(r => r.id === rule.id
        ? { ...r, threshold: row.threshold, window_minutes: row.window_minutes }
        : r,
      ));
      setEditing(prev => { const n = { ...prev }; delete n[rule.id]; return n; });
    } catch { /* ignore */ }
    finally { setSaving(null); }
  };

  if (loading) {
    return <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>;
  }

  return (
    <div className="adm-tw">
      <table className="adm-t">
        <thead>
          <tr>
            <th>Regla</th>
            <th>Nivel</th>
            <th>Umbral</th>
            <th>Ventana (min)</th>
            <th>Activa</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map(rule => {
            const lc = LEVEL_CONFIG[rule.level] ?? LEVEL_CONFIG.medium;
            const ed = editing[rule.id];
            const isDirty = !!ed;
            const isSaving = saving === rule.id;
            return (
              <tr key={rule.id} style={{ opacity: rule.is_active ? 1 : 0.5 }}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{rule.name}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>{rule.description}</div>
                </td>
                <td>
                  <span className="adm-pill" style={{ background: lc.bg, color: lc.color }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: lc.dot, display: 'inline-block', marginRight: 5 }} />
                    {lc.label}
                  </span>
                </td>
                <td>
                  <input
                    className="adm-input adm-input-sm"
                    style={{ width: 72 }}
                    type="number"
                    min={1}
                    value={ed?.threshold ?? String(rule.threshold)}
                    onChange={e => setEditing(prev => ({
                      ...prev,
                      [rule.id]: { threshold: e.target.value, windowMinutes: ed?.windowMinutes ?? String(rule.window_minutes) },
                    }))}
                    onBlur={() => { if (isDirty) saveThreshold(rule); }}
                    disabled={isSaving}
                  />
                </td>
                <td>
                  {rule.rule_key === 'duplicate_scan' ? (
                    <span style={{ fontSize: 12, color: '#bbb' }}>N/A</span>
                  ) : (
                    <input
                      className="adm-input adm-input-sm"
                      style={{ width: 72 }}
                      type="number"
                      min={0}
                      value={ed?.windowMinutes ?? String(rule.window_minutes)}
                      onChange={e => setEditing(prev => ({
                        ...prev,
                        [rule.id]: { threshold: ed?.threshold ?? String(rule.threshold), windowMinutes: e.target.value },
                      }))}
                      onBlur={() => { if (isDirty) saveThreshold(rule); }}
                      disabled={isSaving}
                    />
                  )}
                </td>
                <td>
                  <button
                    onClick={() => toggleActive(rule)}
                    disabled={isSaving}
                    style={{
                      width: 40, height: 22, borderRadius: 11, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                      background: rule.is_active ? '#04210f' : '#e0e0e0',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                    title={rule.is_active ? 'Desactivar' : 'Activar'}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: rule.is_active ? 21 : 3, width: 16, height: 16,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                </td>
                <td>
                  {isDirty && (
                    <button className="adm-btn adm-btn-sm" disabled={isSaving} onClick={() => saveThreshold(rule)}>
                      {isSaving ? '...' : 'Guardar'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function AdminFraud({ token }: Props) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<FraudStats | null>(null);

  useEffect(() => {
    api.admin.fraudStats(token)
      .then(d => setStats((d as any)?.data ?? null))
      .catch(() => {});
  }, [token]);

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'dashboard', label: 'Resumen' },
    { id: 'alerts',    label: 'Alertas' },
    { id: 'rules',     label: 'Reglas'  },
  ];

  const pendingCount = stats?.today.pendingTotal ?? 0;

  return (
    <>
      <div className="adm-page" style={{ maxWidth: 1080 }}>
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Prevención de Fraude</h1>
            <p className="adm-ps">Monitoreo en tiempo real de patrones sospechosos</p>
          </div>
          {pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEE2E2', borderRadius: 10, padding: '8px 14px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#991B1B' }}>
                {pendingCount} alerta{pendingCount !== 1 ? 's' : ''} sin revisar
              </span>
            </div>
          )}
        </div>

        <div className="adm-filter-row" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`adm-filter${tab === t.id ? ' on' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab stats={stats} />}
        {tab === 'alerts'    && <AlertsTab token={token} />}
        {tab === 'rules'     && <RulesTab  token={token} />}
      </div>
    </>
  );
}
