const BASE = (import.meta as any).env?.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'pm_admin_token';

function storedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  // Usar token explícito o caer a localStorage automáticamente
  const authToken = token ?? storedToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    // Solo redirigir al login si el 401 vino de un endpoint protegido
    // (es decir, se envió un token de sesión). Si no había token, el 401
    // es de credenciales incorrectas y debe manejarlo el componente.
    if (res.status === 401 && authToken) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/';
      throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    sendOtp: (phone: string) =>
      req<{ message: string; devOtp?: string }>('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
    verifyOtp: (phone: string, otp: string) =>
      req<{ token: string; access_token: string; isNewUser: boolean }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }),
  },
  events: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return req<{ data: any[] }>(`/events${qs}`);
    },
  },
  reservations: {
    byEvent: (token: string, eventId: string) =>
      req<any[]>(`/reservations/event/${eventId}`, {}, token),
  },
  admin: {
    metrics:         (token: string)                    => req<any>('/admin/metrics', {}, token),
    venues:          (token: string)                    => req<any[]>('/admin/venues', {}, token),
    createVenue:     (token: string, data: object)      => req<any>('/admin/venues', { method: 'POST', body: JSON.stringify(data) }, token),
    updateVenue:     (token: string, id: string, data: object) => req<any>(`/admin/venues/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteVenue:     (token: string, id: string)        => req<void>(`/admin/venues/${id}`, { method: 'DELETE' }, token),
    events:           (token: string)                    => req<any>('/admin/events', {}, token),
    createEvent:      (token: string, data: object)      => req<any>('/admin/events', { method: 'POST', body: JSON.stringify(data) }, token),
    updateEvent:      (token: string, id: string, data: object) => req<any>(`/admin/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteEvent:      (token: string, id: string)        => req<void>(`/admin/events/${id}`, { method: 'DELETE' }, token),
    parkings:         (token: string)                    => req<any>('/admin/parkings', {}, token),
    createParking:    (token: string, data: object)      => req<any>('/admin/parkings', { method: 'POST', body: JSON.stringify(data) }, token),
    updateParking:    (token: string, id: string, data: object) => req<any>(`/admin/parkings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteParking:    (token: string, id: string)        => req<void>(`/admin/parkings/${id}`, { method: 'DELETE' }, token),
    parkingVenues:    (token: string, id: string)        => req<any>(`/admin/parkings/${id}/venues`, {}, token),
    setParkingVenues: (token: string, id: string, venues: object[]) => req<any>(`/admin/parkings/${id}/venues`, { method: 'PUT', body: JSON.stringify({ venues }) }, token),
    customers:        (token: string)                    => req<any>('/admin/users', {}, token),
    createUser:       (token: string, data: object)      => req<any>('/admin/users', { method: 'POST', body: JSON.stringify(data) }, token),
    updateUserRole:   (token: string, id: string, role: string) => req<any>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }, token),
    claims:           (token: string)                    => req<any>('/admin/claims', {}, token),
    createClaim:      (token: string, data: object)      => req<any>('/admin/claims', { method: 'POST', body: JSON.stringify(data) }, token),
    updateClaim:      (token: string, id: string, data: object) => req<any>(`/admin/claims/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteClaim:      (token: string, id: string)        => req<void>(`/admin/claims/${id}`, { method: 'DELETE' }, token),
    approveRefund:    (token: string, claimId: string)   => req<any>(`/admin/claims/${claimId}/approve-refund`, { method: 'POST' }, token),
    promotions:       (token: string)                    => req<any>('/admin/promotions', {}, token),
    createPromotion:  (token: string, data: object)      => req<any>('/admin/promotions', { method: 'POST', body: JSON.stringify(data) }, token),
    updatePromotion:  (token: string, id: string, data: object) => req<any>(`/admin/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deletePromotion:  (token: string, id: string)        => req<void>(`/admin/promotions/${id}`, { method: 'DELETE' }, token),
    payments:         (token: string)                    => req<any>('/admin/payments', {}, token),
    reservations:     (token: string)                    => req<any>('/admin/reservations', {}, token),
    fraudStats:       (token: string)                    => req<any>('/admin/fraud/stats', {}, token),
    fraudAlerts:      (token: string, status?: string, level?: string) => {
      const qs = new URLSearchParams();
      if (status && status !== 'all') qs.set('status', status);
      if (level  && level  !== 'all') qs.set('level',  level);
      const q = qs.toString();
      return req<any>(`/admin/fraud/alerts${q ? '?' + q : ''}`, {}, token);
    },
    updateFraudAlert: (token: string, id: string, status: string)    => req<any>(`/admin/fraud/alerts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
    fraudRules:       (token: string)                    => req<any>('/admin/fraud/rules', {}, token),
    updateFraudRule:  (token: string, id: string, data: object)      => req<any>(`/admin/fraud/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  },
  operator: {
    updateProfile: (token: string, data: object) =>
      req<any>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }, token),
    events: (token: string, status?: string) =>
      req<any>(`/admin/operator/events${status ? `?status=${status}` : ''}`, {}, token),
    updateEventPrices: (token: string, id: string, data: object) =>
      req<any>(`/admin/operator/events/${id}/prices`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    setEventClosedToday: (token: string, id: string, closed: boolean) =>
      req<any>(`/admin/operator/events/${id}/closed-today`, { method: 'PATCH', body: JSON.stringify({ closed }) }, token),
    // Sub-operator team management
    listTeam: (token: string) =>
      req<{ data: any[] }>('/operator/team', {}, token),
    createSubOperator: (token: string, data: { name: string; phone: string; role: string; otp: string }) =>
      req<{ data: any }>('/operator/team', { method: 'POST', body: JSON.stringify(data) }, token),
    updateSubOperator: (token: string, id: string, data: { name?: string; isActive?: boolean }) =>
      req<{ data: any }>(`/operator/team/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteSubOperator: (token: string, id: string) =>
      req<any>(`/operator/team/${id}`, { method: 'DELETE' }, token),
  },
  codigoPostal: (cp: string) =>
    req<{ data: { cp: string; ciudad: string; municipio: string; estado: string } | null }>(`/codigo-postal/${cp}`),
  scan: (token: string, qrToken: string) =>
    req<any>('/scan', { method: 'POST', body: JSON.stringify({ token: qrToken }) }, token),
  checkin: (token: string, reservationId: string, data: object) =>
    req<any>(`/checkin/${reservationId}`, { method: 'POST', body: JSON.stringify(data) }, token),
};
