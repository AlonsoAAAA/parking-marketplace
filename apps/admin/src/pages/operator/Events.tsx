import { useState, useEffect } from 'react';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const CATEGORIES = [
  { key: 'priceAuto',   label: 'Auto' },
  { key: 'priceSub',    label: 'Sub' },
  { key: 'pricePickup', label: 'Pick Up' },
  { key: 'priceMoto',   label: 'Moto' },
] as const;

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export default function OperatorEvents({ token }: Props) {
  const [events, setEvents]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<any | null>(null);
  const [prices, setPrices]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [saved, setSaved]     = useState(false);

  const load = () => {
    setLoading(true);
    api.operator.events(token)
      .then(d => setEvents((d as any).data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const openModal = (ev: any) => {
    setModal(ev);
    setPrices({
      priceAuto:   ev.price_auto   != null ? String(ev.price_auto)   : '',
      priceSub:    ev.price_sub    != null ? String(ev.price_sub)    : '',
      pricePickup: ev.price_pickup != null ? String(ev.price_pickup) : '',
      priceMoto:   ev.price_moto   != null ? String(ev.price_moto)   : '',
    });
    setError(''); setSaved(false);
  };

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const data: Record<string, number | undefined> = {};
      for (const { key } of CATEGORIES) {
        const v = prices[key];
        if (v !== '') data[key] = parseFloat(v) || 0;
      }
      await api.operator.updateEventPrices(token, modal.id, data);
      setSaved(true);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <style>{ADMIN_CSS + `
        .ev-price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .ev-base { font-size: 12px; color: #999; margin-bottom: 4px; }
        .ev-prices { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
        .ev-pill-price { font-size: 11px; background: #f5f5f5; border-radius: 6px; padding: 3px 8px; color: #555; }
        .ev-pill-price strong { color: #1a1a1a; }
      `}</style>
      <div className="adm-page" style={{ maxWidth: 820 }}>
        <div className="adm-ph">
          <div>
            <h1 className="adm-pt">Mis Eventos</h1>
            <p className="adm-ps">Configura los precios por categoría de vehículo</p>
          </div>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : events.length === 0 ? (
          <div className="adm-tw">
            <div className="adm-empty"><div className="adm-empty-icon">📅</div><div className="adm-empty-text">Sin eventos asignados</div></div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(ev => {
              const total    = Number(ev.total_slots) || 0;
              const reserved = Number(ev.slots_reserved) || 0;
              const hasPrices = ev.price_auto || ev.price_sub || ev.price_pickup || ev.price_moto;
              return (
                <div key={ev.id} className="adm-tw" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{ev.name}</div>
                      <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                        {ev.venue_name} · {fmtDate(ev.starts_at)} · {reserved}/{total} reservas
                      </div>
                      <div className="ev-base">Precio base: <strong style={{ color: '#1a1a1a' }}>${Number(ev.price).toLocaleString('es-MX')}</strong></div>
                      {hasPrices ? (
                        <div className="ev-prices">
                          {ev.price_auto   && <span className="ev-pill-price">Auto <strong>${Number(ev.price_auto).toLocaleString('es-MX')}</strong></span>}
                          {ev.price_sub    && <span className="ev-pill-price">Sub <strong>${Number(ev.price_sub).toLocaleString('es-MX')}</strong></span>}
                          {ev.price_pickup && <span className="ev-pill-price">Pick Up <strong>${Number(ev.price_pickup).toLocaleString('es-MX')}</strong></span>}
                          {ev.price_moto   && <span className="ev-pill-price">Moto <strong>${Number(ev.price_moto).toLocaleString('es-MX')}</strong></span>}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>Sin precios por categoría — se usa precio base</div>
                      )}
                    </div>
                    <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openModal(ev)}>
                      Editar precios
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-overlay">
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">Precios — {modal.name}</div>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
              Precio base del evento: <strong style={{ color: '#1a1a1a' }}>${Number(modal.price).toLocaleString('es-MX')}</strong>
            </p>
            <p style={{ fontSize: 11, color: '#bbb', marginBottom: 16 }}>
              Deja en blanco para usar el precio base en esa categoría.
            </p>
            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>{error}</div>}
            {saved && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534', marginBottom: 16 }}>✓ Precios guardados</div>}
            <div className="ev-price-grid">
              {CATEGORIES.map(({ key, label }) => (
                <div key={key} className="adm-field">
                  <label className="adm-label">{label}</label>
                  <input
                    className="adm-input"
                    type="number"
                    min="0"
                    placeholder={`$${Number(modal.price).toLocaleString('es-MX')} (base)`}
                    value={prices[key]}
                    onChange={e => setPrices(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              <button className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar precios'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
