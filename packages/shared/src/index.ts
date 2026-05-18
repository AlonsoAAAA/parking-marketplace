// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'operator' | 'user';

// ─── Enums ───────────────────────────────────────────────────────────────────

export type ReservationStatus =
  | 'pending'
  | 'paid'
  | 'used'
  | 'cancelled'
  | 'expired';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export type EventStatus =
  | 'draft'
  | 'active'
  | 'sold_out'
  | 'finished';

export type UserChannel = 'web' | 'whatsapp' | 'app';

// ─── Entities ────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: UserRole;
  channel: UserChannel;
  createdAt: Date;
}

export interface Parking {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  totalCapacity: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ParkingEvent {
  id: string;
  parkingId: string;
  name: string;
  venueName?: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  totalSlots: number;
  slotsReserved: number;
  status: EventStatus;
  createdAt: Date;
}

export interface Reservation {
  id: string;
  userId: string;
  eventId: string;
  status: ReservationStatus;
  slotLabel?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  reservationId: string;
  provider: 'stripe';
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt: Date;
}

export interface QRToken {
  id: string;
  reservationId: string;
  token: string;
  scannedAt?: Date;
  scannedBy?: string;
  expiresAt: Date;
  createdAt: Date;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ScanResult {
  valid: boolean;
  reason:
    | 'ACCESO_PERMITIDO'
    | 'YA_USADO'
    | 'NO_PAGADO'
    | 'TOKEN_INVÁLIDO'
    | 'NO_ENCONTRADO'
    | 'CONDICIÓN_DE_CARRERA';
  reservation?: Reservation;
  event?: ParkingEvent;
  scannedAt?: Date;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateReservationDto {
  eventId: string;
}

export interface WhatsAppAuthDto {
  phone: string;
  otp: string;
}

export interface CreateEventDto {
  parkingId: string;
  name: string;
  venueName?: string;
  startsAt: string;
  endsAt: string;
  price: number;
  totalSlots: number;
}
