# 🅿️ Parking Marketplace — Fase 1

Marketplace de boletos de estacionamiento para eventos en CDMX.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | NestJS + TypeScript |
| Base de datos | PostgreSQL 16 |
| Caché | Redis 7 |
| Marketplace | Next.js 14 |
| Admin Panel | React + Vite |
| Pagos | Stripe |
| Notificaciones | Twilio WhatsApp |
| Auth | JWT + OTP por WhatsApp |

---

## Requisitos previos

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose

---

## Setup inicial

### 1. Clonar e instalar dependencias

```bash
git clone <repo>
cd parking-marketplace
pnpm install
```

### 2. Levantar base de datos y Redis

```bash
docker-compose up -d
```

Verifica que estén corriendo:
```bash
docker-compose ps
```

### 3. Configurar variables de entorno del API

```bash
cp apps/api/.env.example apps/api/.env
```

Edita `apps/api/.env` y llena:
- `JWT_SECRET` — genera uno con `openssl rand -base64 32`
- `QR_SECRET` — otro secreto diferente
- `STRIPE_SECRET_KEY` — desde dashboard.stripe.com
- `TWILIO_*` — desde console.twilio.com

### 4. Ejecutar migración de base de datos

```bash
# Conéctate a PostgreSQL
docker exec -it parking_db psql -U parking_user -d parking_db

# Dentro de psql, ejecuta:
\i /path/to/apps/api/src/database/migrations/001_initial.sql

# O desde fuera:
docker exec -i parking_db psql -U parking_user -d parking_db \
  < apps/api/src/database/migrations/001_initial.sql
```

### 5. Levantar en desarrollo

```bash
# Todo junto
pnpm dev

# O por separado:
pnpm dev:api         # http://localhost:3000
pnpm dev:marketplace # http://localhost:3001
pnpm dev:admin       # http://localhost:3002
```

---

## Configurar Stripe Webhooks (desarrollo local)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escuchar webhooks y redirigir al API local
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# El CLI te dará el STRIPE_WEBHOOK_SECRET, agrégalo al .env
```

---

## Configurar Twilio WhatsApp Sandbox

1. Ir a console.twilio.com → Messaging → Try it out → Send a WhatsApp message
2. El número sandbox es: **+1 415 523 8886**
3. El usuario debe enviar el código de activación al número
4. Agregar al `.env`:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886`

---

## Estructura de carpetas

```
parking-marketplace/
├── apps/
│   ├── api/              ← NestJS Backend
│   ├── marketplace/      ← Next.js (usuario final)
│   └── admin/            ← React + Vite (operador)
├── packages/
│   └── shared/           ← Tipos TypeScript compartidos
└── docker-compose.yml
```

---

## Endpoints principales del API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/send-otp` | Enviar OTP por WhatsApp |
| POST | `/api/v1/auth/verify-otp` | Verificar OTP y obtener JWT |
| GET | `/api/v1/events` | Lista de eventos activos |
| POST | `/api/v1/reservations` | Crear reserva (requiere auth) |
| POST | `/api/v1/payments/create-intent` | Iniciar pago con Stripe |
| POST | `/api/v1/webhooks/stripe` | Webhook de Stripe (sin auth) |
| POST | `/api/v1/scan` | Escanear QR (solo operadores) |

---

## Flujo completo de una compra

```
1. Usuario entra al marketplace
2. Selecciona evento → POST /reservations → reserva 'pending' (15 min)
3. Checkout → POST /payments/create-intent → clientSecret de Stripe
4. Usuario paga en frontend con Stripe Elements
5. Stripe llama al webhook → POST /webhooks/stripe
6. Backend: marca reserva 'paid' → genera QR → envía WhatsApp
7. Día del evento: operador abre admin → escanea QR → POST /scan
8. QR válido: acceso permitido → reserva marcada 'used'
```

---

## Fase 2 (roadmap)

- [ ] Bot conversacional de WhatsApp para compra sin abrir app
- [ ] NFTs en Polygon como boletos (ERC-1155)
- [ ] Stripe Terminal para pagos presenciales en taquilla
- [ ] Facturación automática con Facturapi (CFDI)
- [ ] App React Native
