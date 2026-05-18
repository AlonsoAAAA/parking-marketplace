const BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api/v1';

async function req<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(Array.isArray(err.message) ? err.message[0] : err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  auth: {
    sendOtp: (phone: string) =>
      req('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
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
    customers:        (token: string)                    => req<any>('/admin/users', {}, token),
    claims:           (token: string)                    => req<any>('/admin/claims', {}, token),
    createClaim:      (token: string, data: object)      => req<any>('/admin/claims', { method: 'POST', body: JSON.stringify(data) }, token),
    updateClaim:      (token: string, id: string, data: object) => req<any>(`/admin/claims/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deleteClaim:      (token: string, id: string)        => req<void>(`/admin/claims/${id}`, { method: 'DELETE' }, token),
    promotions:       (token: string)                    => req<any>('/admin/promotions', {}, token),
    createPromotion:  (token: string, data: object)      => req<any>('/admin/promotions', { method: 'POST', body: JSON.stringify(data) }, token),
    updatePromotion:  (token: string, id: string, data: object) => req<any>(`/admin/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
    deletePromotion:  (token: string, id: string)        => req<void>(`/admin/promotions/${id}`, { method: 'DELETE' }, token),
    payments:         (token: string)                    => req<any>('/admin/payments', {}, token),
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
  },
  scan: (token: string, qrToken: string) =>
    req<any>('/scan', { method: 'POST', body: JSON.stringify({ token: qrToken }) }, token),
  checkin: (token: string, reservationId: string, data: object) =>
    req<any>(`/checkin/${reservationId}`, { method: 'POST', body: JSON.stringify(data) }, token),
};
