export type AdminPage = 'dashboard' | 'venues' | 'events' | 'parkings' | 'customers' | 'claims' | 'promotions' | 'payments' | 'fraud' | 'pricing';
export type OperatorPage    = 'dashboard' | 'reservations' | 'scanner' | 'profile' | 'settings';
export type SubOperatorPage = 'reservations' | 'scanner';
export type SubAdminPage    = 'dashboard' | 'reservations' | 'scanner';
export type UserRole        = 'admin' | 'operator' | 'sub_admin' | 'sub_operator';

export interface SubOperator {
  id: string;
  name: string;
  phone: string;
  role: 'sub_operator' | 'sub_admin';
  is_active: boolean;
  created_at: string;
}

export interface AuthUser {
  sub: string;
  role: UserRole;
  phone: string;
}

export interface Reservation {
  id: string;
  user_id?: string;
  event_id?: string;
  user_name: string;
  phone: string;
  event_name?: string;
  status: 'pending' | 'paid' | 'used' | 'cancelled' | 'expired';
  created_at: string;
  expires_at?: string;
  amount?: number;
  has_ticket?: boolean;
  scanned_at?: string;
  // Vehicle check-in data (from vehicle_checkins join)
  plates?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  assigned_spot?: string;
}

export interface Event {
  id: string;
  name: string;
  venueName?: string;
  venue_name?: string;
  startsAt?: string;
  starts_at?: string;
  endsAt?: string;
  ends_at?: string;
  price: number | string;
  totalSlots?: number;
  total_slots?: number;
  slotsReserved?: number;
  slots_reserved?: number;
  status: 'draft' | 'active' | 'sold_out' | 'finished';
  parkingName?: string;
  parkingAddress?: string;
  parkingId?: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity?: number;
  lat?: number;
  lng?: number;
}

export interface Parking {
  id: string;
  name: string;
  address: string;
  totalSlots?: number;
  operatorName?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  created_at?: string;
}

export interface Claim {
  id: string;
  userName: string;
  userPhone?: string;
  eventName?: string;
  subject?: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  type?: 'complaint' | 'refund_request';
  evidence_photos?: string[];
  admin_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Promotion {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  eventName?: string;
  uses_count: number;
  max_uses?: number;
  expires_at?: string;
  is_active: boolean;
}

export interface Payment {
  id: string;
  reservationId?: string;
  userName?: string;
  userPhone?: string;
  eventName?: string;
  amount: number | string;
  currency?: string;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  provider_payment_id?: string;
  paid_at?: string;
  created_at?: string;
}

export interface FraudRule {
  id: string;
  name: string;
  description: string;
  rule_key: string;
  threshold: number;
  window_minutes: number;
  level: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FraudAlert {
  id: string;
  user_id?: string;
  rule_id?: string;
  rule_key: string;
  level: 'low' | 'medium' | 'high';
  detail: Record<string, any>;
  status: 'pending' | 'reviewed' | 'dismissed';
  created_at: string;
  userName?: string;
  userPhone?: string;
  ruleName?: string;
}

export interface FraudStats {
  today: {
    highToday: number;
    mediumToday: number;
    lowToday: number;
    pendingTotal: number;
    totalAlerts: number;
  };
  daily: Array<{ day: string; count: number; high: number; medium: number; low: number }>;
}

export interface ScanResult {
  valid: boolean;
  reason: string;
  userName?: string;
  eventName?: string;
  slotLabel?: string;
  scannedAt?: string;
}
