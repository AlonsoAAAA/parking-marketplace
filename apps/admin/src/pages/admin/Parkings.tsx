import { useState, useEffect } from 'react';
import { ADMIN_CSS } from '../../lib/styles';
import { api } from '../../lib/api';

interface Props { token: string; }

const VEHICLE_TYPES = [
  { key: 'auto',          label: 'Auto',           icon: '🚗' },
  { key: 'suv_camioneta', label: 'SUV / Camioneta', icon: '🚙' },
  { key: 'pickup',        label: 'Pick Up',         icon: '🛻' },
  { key: 'moto',          label: 'Moto',            icon: '🏍️' },
] as const;

type VehicleKey = typeof VEHICLE_TYPES[number]['key'];

interface PricingRow { vehicleType: VehicleKey; slots: string; price: string; }

const EMPTY_PRICING = (): PricingRow[] =>
  VEHICLE_TYPES.map(v => ({ vehicleType: v.key, slots: '', price: '' }));

function buildPricing(raw: any[]): PricingRow[] {
  return VEHICLE_TYPES.map(v => {
    const found = (raw || []).find((r: any) => r.vehicleType === v.key);
    return {
      vehicleType: v.key,
      slots: found ? String(found.slots || '') : '',
      price: found ? String(found.price || '') : '',
    };
  });
}

interface VenueLink { venueId: string; distanceMeters: string; }

export default function AdminParkings({ token }: Props) {
  const [parkings,     setParkings]     = useState<any[]>([]);
  const [allVenues,    setAllVenues]    = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState<any | null>(null);
  const [pricing,      setPricing]      = useState<PricingRow[]>(EMPTY_PRICING());
  const [venueLinks,   setVenueLinks]   = useState<VenueLink[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  const load = () => {
    setLoading(true);
    api.admin.parkings(token)
      .then(data => setParkings((data as any)?.data || data || []))
      .catch(() => setParkings([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);
  useEffect(() => {
    api.admin.venues(token)
      .then(d => setAllVenues((d as any)?.data || d || []))
      .catch(() => {});
  }, [token]);

  const openCreate = () => {
    setModal({ id: '', name: '', address: '' });
    setPricing(EMPTY_PRICING());
    setVenueLinks([]);
    setError('');
  };

  const openEdit = (p: any) => {
    setModal({ id: p.id, name: p.name, address: p.address });
    setPricing(buildPricing(p.pricing || []));
    setError('');
    // Load existing venue associations
    if (p.id) {
      api.admin.parkingVenues(token, p.id)
        .then((d: any) => {
          const links: VenueLink[] = (d?.data || []).map((v: any) => ({
            venueId: v.id,
            distanceMeters: String(v.distanceMeters ?? 0),
          }));
          setVenueLinks(links);
        })
        .catch(() => setVenueLinks([]));
    }
  };

  const toggleVenue = (venueId: string) => {
    setVenueLinks(prev => {
      const exists = prev.find(l => l.venueId === venueId);
      if (exists) return prev.filter(l => l.venueId !== venueId);
      return [...prev, { venueId, distanceMeters: '' }];
    });
  };

  const setVenueDistance = (venueId: string, val: string) => {
    setVenueLinks(prev => prev.map(l => l.venueId === venueId ? { ...l, distanceMeters: val } : l));
  };

  const totalSlots = pricing.reduce((s, r) => s + (parseInt(r.slots) || 0), 0);

  const save = async () => {
    if (!modal?.name?.trim())    { setError('El nombre es requerido'); return; }
    if (!modal?.address?.trim()) { setError('La dirección es requerida'); return; }
    setSaving(true); setError('');
    try {
      const pricingPayload = pricing
        .filter(r => r.slots !== '' || r.price !== '')
        .map(r => ({
          vehicleType: r.vehicleType,
          slots: parseInt(r.slots) || 0,
          price: parseFloat(r.price) || 0,
        }));
      const data = { name: modal.name, address: modal.address, pricing: pricingPayload };
      let savedId = modal.id;
      if (modal.id) {
        await api.admin.updateParking(token, modal.id, data);
      } else {
        const res = await api.admin.createParking(token, data);
        savedId = (res as any)?.data?.id || (res as any)?.id;
      }
      // Save venue associations
      if (savedId) {
        const venuesPayload = venueLinks.map(l => ({
          venueId: l.venueId,
          distanceMeters: parseInt(l.distanceMeters) || 0,
        }));
        await api.admin.setParkingVenues(token, savedId, venuesPayload);
      }
      setModal(null);
      load();
    } catch (e: any) { setError(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar este estacionamiento?')) return;
    try { await api.admin.deleteParking(token, id); load(); }
    catch (e: any) { alert(e.message || 'Error al eliminar'); }
  };

  const setPricingField = (idx: number, field: 'slots' | 'price', val: string) => {
    setPricing(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  };

  return (
    <>
      <style>{ADMIN_CSS}</style>
      <div className="adm-page" style={{ maxWidth: 900 }}>
        <div className="adm-ph">
          <div><h1 className="adm-pt">Estacionamientos</h1><p className="adm-ps">{parkings.length} registros encontrados</p></div>
          <button className="adm-btn" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Nuevo
          </button>
        </div>

        {loading ? (
          <div className="adm-empty"><div className="adm-empty-text">Cargando...</div></div>
        ) : parkings.length === 0 ? (
          <div className="adm-tw"><div className="adm-empty"><div className="adm-empty-icon">🅿️</div><div className="adm-empty-text">Sin estacionamientos</div></div></div>
        ) : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Dirección</th>
                  <th>Capacidad</th>
                  <th>Venues</th>
                  <th>Tipos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parkings.map((p: any) => {
                  const prList: any[] = p.pricing || [];
                  const vLinks: any[] = p.venues || [];
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontSize: 12, color: '#555', maxWidth: 200 }}>{p.address || '—'}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {p.total_capacity > 0 ? p.total_capacity : '—'}
                        <span style={{ color: '#bbb', fontWeight: 400, fontSize: 11 }}> lugares</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {vLinks.length > 0
                            ? vLinks.map((vl: any) => (
                                <span key={vl.venueId || vl.id} style={{ fontSize: 10, background: '#f0f9f0', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', color: '#166534' }}>
                                  🏟️ {vl.venueName || vl.name}
                                </span>
                              ))
                            : <span style={{ fontSize: 11, color: '#bbb' }}>—</span>
                          }
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {prList.length > 0
                            ? prList.map((pr: any) => {
                                const vt = VEHICLE_TYPES.find(v => v.key === pr.vehicleType);
                                return (
                                  <span key={pr.vehicleType} style={{ fontSize: 10, background: '#f5f5f5', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
                                    {vt?.icon} {pr.slots} · ${parseFloat(pr.price).toLocaleString('es-MX')}
                                  </span>
                                );
                              })
                            : <span style={{ fontSize: 11, color: '#bbb' }}>Sin configurar</span>
                          }
                        </div>
                      </td>
                      <td style={{ display: 'flex', gap: 8 }}>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => openEdit(p)}>Editar</button>
                        <button className="adm-btn adm-btn-sm" style={{ background: '#fef2f2', color: '#991b1b' }} onClick={() => del(p.id)}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="adm-overlay">
          <div className="adm-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="adm-modal-title">{modal.id ? 'Editar estacionamiento' : 'Nuevo estacionamiento'}</div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#991b1b', marginBottom: 16 }}>
                {error}
              </div>
            )}

            {/* Nombre */}
            <div className="adm-field">
              <label className="adm-label">Nombre</label>
              <input className="adm-input" value={modal.name || ''} onChange={e => setModal((m: any) => ({ ...m, name: e.target.value }))} placeholder="Estacionamiento Central" autoFocus />
            </div>

            {/* Dirección */}
            <div className="adm-field">
              <label className="adm-label">Dirección</label>
              <input className="adm-input" value={modal.address || ''} onChange={e => setModal((m: any) => ({ ...m, address: e.target.value }))} placeholder="Av. Insurgentes Sur 123, CDMX" />
            </div>

            {/* Lugares y precios por tipo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <label className="adm-label" style={{ margin: 0 }}>Lugares y precios por tipo de vehículo</label>
                {totalSlots > 0 && (
                  <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>
                    Total: {totalSlots} lugares
                  </span>
                )}
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: '6px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#bbb', paddingLeft: 4 }}>Tipo</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#bbb', textAlign: 'center' }}>Lugares</div>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#bbb', textAlign: 'center' }}>Precio (MXN)</div>
              </div>

              {/* Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pricing.map((row, idx) => {
                  const vt = VEHICLE_TYPES[idx];
                  const filled = row.slots !== '' || row.price !== '';
                  return (
                    <div
                      key={vt.key}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr 90px 100px', gap: '0 10px',
                        alignItems: 'center', background: filled ? '#f9f9f9' : '#fafafa',
                        borderRadius: 10, padding: '10px 12px',
                        border: `1.5px solid ${filled ? 'rgba(0,0,0,0.08)' : 'transparent'}`,
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{vt.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{vt.label}</span>
                      </div>

                      {/* Slots */}
                      <input
                        type="number"
                        value={row.slots}
                        onChange={e => setPricingField(idx, 'slots', e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0"
                        min="0"
                        style={{
                          width: '100%', padding: '8px 10px', background: '#fff',
                          border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8,
                          fontSize: 14, fontWeight: 600, textAlign: 'center',
                          fontFamily: 'Inter, sans-serif', color: '#1a1a1a',
                          outline: 'none',
                        }}
                      />

                      {/* Price */}
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#bbb', pointerEvents: 'none' }}>$</span>
                        <input
                          type="number"
                          value={row.price}
                          onChange={e => setPricingField(idx, 'price', e.target.value)}
                          placeholder="0"
                          min="0"
                          style={{
                            width: '100%', padding: '8px 10px 8px 22px', background: '#fff',
                            border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: 8,
                            fontSize: 14, fontWeight: 600,
                            fontFamily: 'Inter, sans-serif', color: '#1a1a1a',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 8, lineHeight: 1.6 }}>
                La capacidad total del estacionamiento se calcula automáticamente sumando los lugares de cada tipo.
              </p>
            </div>

            {/* Venues asociados */}
            <div style={{ marginBottom: 16 }}>
              <label className="adm-label" style={{ display: 'block', marginBottom: 10 }}>
                Venues que sirve este estacionamiento
              </label>
              {allVenues.length === 0 ? (
                <p style={{ fontSize: 12, color: '#bbb' }}>Sin venues registrados</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allVenues.map((v: any) => {
                    const link = venueLinks.find(l => l.venueId === v.id);
                    const checked = !!link;
                    return (
                      <div key={v.id} style={{
                        background: checked ? '#f0f9f0' : '#fafafa',
                        border: `1.5px solid ${checked ? 'rgba(34,197,94,.3)' : 'rgba(0,0,0,.08)'}`,
                        borderRadius: 10, padding: '10px 12px',
                        transition: 'all .15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="checkbox"
                            id={`venue-${v.id}`}
                            checked={checked}
                            onChange={() => toggleVenue(v.id)}
                            style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                          />
                          <label htmlFor={`venue-${v.id}`} style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', cursor: 'pointer', flex: 1 }}>
                            {v.name}
                            {v.city && <span style={{ fontWeight: 400, color: '#999', marginLeft: 6 }}>{v.city}</span>}
                          </label>
                        </div>
                        {checked && (
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>Distancia (m)</span>
                            <input
                              type="number"
                              value={link!.distanceMeters}
                              onChange={e => setVenueDistance(v.id, e.target.value)}
                              placeholder="ej. 350"
                              min="0"
                              style={{
                                width: 100, padding: '6px 10px', background: '#fff',
                                border: '1.5px solid rgba(0,0,0,.12)', borderRadius: 8,
                                fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif',
                                color: '#1a1a1a', outline: 'none',
                              }}
                            />
                            {link!.distanceMeters && parseInt(link!.distanceMeters) > 0 && (
                              <span style={{ fontSize: 11, color: '#aaa' }}>
                                ≈ {Math.round(parseInt(link!.distanceMeters) / 80)} min caminando
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="adm-btn" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
