export const ADMIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

  .adm-page { padding: 28px; animation: fadeIn 0.3s ease both; font-family: 'Inter', -apple-system, sans-serif; }
  @media(max-width:767px){ .adm-page { padding: 20px 16px 32px; } }

  .adm-ph { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .adm-pt { font-size: 22px; font-weight: 700; letter-spacing: -0.4px; color: #1a1a1a; margin-bottom: 4px; }
  @media(max-width:480px){ .adm-pt { font-size: 18px; } }
  .adm-ps { font-size: 12px; color: #bbb; }

  .adm-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
  @media(min-width:640px){ .adm-metrics { grid-template-columns: repeat(4, 1fr); } }
  .adm-metric { background: #fff; border-radius: 14px; padding: 20px 18px; }
  .adm-metric-dot { width: 24px; height: 3px; border-radius: 3px; margin-bottom: 14px; }
  .adm-metric-val { font-size: 28px; font-weight: 700; letter-spacing: -1px; line-height: 1; margin-bottom: 6px; }
  @media(max-width:480px){ .adm-metric-val { font-size: 22px; } }
  .adm-metric-lbl { font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #bbb; }

  .adm-section-lbl { font-size: 10px; font-weight: 600; letter-spacing: 2.5px; text-transform: uppercase; color: #bbb; margin-bottom: 12px; }

  .adm-tw { background: #fff; border-radius: 14px; overflow: hidden; }
  .adm-t { width: 100%; border-collapse: collapse; }
  .adm-t th { text-align: left; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #bbb; padding: 14px 16px 10px; border-bottom: 1px solid rgba(0,0,0,0.07); white-space: nowrap; }
  .adm-t td { font-size: 13px; color: #1a1a1a; padding: 13px 16px; border-bottom: 1px solid rgba(0,0,0,0.04); vertical-align: middle; }
  .adm-t tr:last-child td { border-bottom: none; }
  .adm-t tbody tr:hover td { background: rgba(0,0,0,0.015); }

  .adm-pill { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; }

  .adm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; background: #1a1a1a; color: #fff; border: none; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; white-space: nowrap; }
  .adm-btn:hover:not(:disabled) { background: #333; }
  .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .adm-btn-ghost { background: transparent; color: #1a1a1a; border: 1.5px solid rgba(0,0,0,0.12); }
  .adm-btn-ghost:hover:not(:disabled) { background: rgba(0,0,0,0.04); }
  .adm-btn-sm { padding: 6px 12px; font-size: 11px; }

  .adm-input { width: 100%; padding: 11px 14px; background: #F7F7F7; border: 1.5px solid transparent; border-radius: 9px; font-size: 14px; font-family: 'Inter', sans-serif; color: #1a1a1a; transition: border-color 0.15s; }
  .adm-input:focus { border-color: #1a1a1a; background: #fff; outline: none; }
  .adm-input::placeholder { color: #ccc; }
  .adm-input-sm { padding: 8px 12px; font-size: 13px; }
  .adm-label { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #999; display: block; margin-bottom: 7px; }
  .adm-field { margin-bottom: 16px; }

  .adm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .adm-modal { background: #fff; border-radius: 18px; padding: 28px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; animation: fadeIn 0.2s ease; }
  .adm-modal-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 22px; }
  .adm-modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px; }

  .adm-filter-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
  .adm-filter { padding: 6px 12px; border: 1.5px solid rgba(0,0,0,0.1); border-radius: 7px; background: none; font-size: 11px; font-weight: 500; color: #999; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.15s; }
  .adm-filter:hover { color: #1a1a1a; border-color: rgba(0,0,0,0.25); }
  .adm-filter.on { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

  .adm-search-bar { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 10px; padding: 10px 14px; border: 1px solid rgba(0,0,0,0.07); margin-bottom: 14px; }
  .adm-search-bar:focus-within { border-color: rgba(0,0,0,0.2); }
  .adm-search-bar input { background: none; border: none; outline: none; font-size: 13px; font-family: 'Inter', sans-serif; color: #1a1a1a; width: 100%; }
  .adm-search-bar input::placeholder { color: #ccc; }

  .adm-empty { padding: 64px 24px; text-align: center; }
  .adm-empty-icon { font-size: 32px; margin-bottom: 12px; }
  .adm-empty-text { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #ccc; }
  .adm-empty-sub { font-size: 12px; color: #bbb; margin-top: 8px; line-height: 1.6; }
`;

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#FEF3C7', color: '#92400E' },
  paid:        { bg: '#D1FAE5', color: '#065F46' },
  used:        { bg: '#DBEAFE', color: '#1E40AF' },
  cancelled:   { bg: '#FEE2E2', color: '#991B1B' },
  expired:     { bg: '#F3F4F6', color: '#6B7280' },
  active:      { bg: '#D1FAE5', color: '#065F46' },
  draft:       { bg: '#FEF3C7', color: '#92400E' },
  sold_out:    { bg: '#FEE2E2', color: '#991B1B' },
  finished:    { bg: '#F3F4F6', color: '#6B7280' },
  open:        { bg: '#FEF3C7', color: '#92400E' },
  in_progress: { bg: '#DBEAFE', color: '#1E40AF' },
  resolved:    { bg: '#D1FAE5', color: '#065F46' },
  completed:   { bg: '#D1FAE5', color: '#065F46' },
  failed:      { bg: '#FEE2E2', color: '#991B1B' },
  refunded:    { bg: '#EDE9FE', color: '#5B21B6' },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', used: 'Usado',
  cancelled: 'Cancelado', expired: 'Expirado', active: 'Activo',
  draft: 'Borrador', sold_out: 'Agotado', finished: 'Finalizado',
  open: 'Abierto', in_progress: 'En proceso', resolved: 'Resuelto',
  completed: 'Completado', failed: 'Fallido', refunded: 'Reembolsado',
};
