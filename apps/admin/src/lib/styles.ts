// Nota: el CSS-in-JS (antes exportado aquí como `ADMIN_CSS`) fue reemplazado por
// clases Tailwind/CSS globales en src/index.css como parte de la migración a
// Tailwind v4 (ver plan de migración admin-redesign). Estas dos tablas de datos
// se conservan porque las pantallas de estado (reservas, eventos, reclamos,
// pagos) siguen usándolas para mapear status → color/etiqueta.

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending:     { bg: '#FEF3C7', color: '#92400E' },
  // "paid" (reserva pagada, boleto válido aún no escaneado) se muestra al
  // operador como "Pendiente" (de escanear) — mismo color que pending.
  paid:        { bg: '#FEF3C7', color: '#92400E' },
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
  pending: 'Pendiente', paid: 'Pendiente', used: 'Usado',
  cancelled: 'Cancelado', expired: 'Expirado', active: 'Activo',
  draft: 'Borrador', sold_out: 'Agotado', finished: 'Finalizado',
  open: 'Abierto', in_progress: 'En proceso', resolved: 'Resuelto',
  completed: 'Completado', failed: 'Fallido', refunded: 'Reembolsado',
};
