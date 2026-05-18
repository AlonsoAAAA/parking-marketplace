# Parking Marketplace

Plataforma de reservas de estacionamiento para eventos en CDMX. Los usuarios compran su lugar desde el marketplace, pagan con Stripe y reciben un QR por WhatsApp. El operador escanea el QR en la entrada. El admin gestiona todo desde un panel web.

## Stack

| Capa | Tecnología |
|---|---|
| API | NestJS + TypeScript + TypeORM |
| Base de datos | PostgreSQL 16 |
| Caché | Redis 7 |
| Marketplace | Next.js 14 (App Router) |
| Panel admin | React 18 + Vite |
| Pagos | Stripe (PaymentIntents + Webhooks) |
| Notificaciones | Twilio WhatsApp |
| Auth | JWT + OTP por WhatsApp |
| Infraestructura | Docker Compose |
| Monorepo | pnpm workspaces |

---

## Requisitos

- Node.js 20+
- pnpm — `npm install -g pnpm`
- Docker + Docker Compose

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/AlonsoAAAA/parking-marketplace.git
cd parking-marketplace
pnpm install
```

### 2. Levantar base de datos y Redis

```bash
docker-compose up -d
docker-compose ps   # verificar que estén corriendo
```

### 3. Configurar variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
```

Edita `apps/api/.env`:

```env
NODE_ENV=production

DATABASE_URL=postgresql://parking_user:parking_pass@localhost:5432/parking_db
REDIS_URL=redis://localhost:6379

JWT_SECRET=<genera con: openssl rand -base64 32>
QR_SECRET=<otro secreto diferente>

STRIPE_SECRET_KEY=sk_test_...        # dashboard.stripe.com/test/apikeys
STRIPE_WEBHOOK_SECRET=whsec_...      # ver sección Stripe más abajo

TWILIO_ACCOUNT_SID=AC...             # console.twilio.com
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4. Ejecutar migraciones

```bash
# Migración 1: esquema inicial (usuarios, eventos, reservas, pagos, QR)
docker cp apps/api/src/database/migrations/001_initial.sql parking_db:/tmp/
docker exec parking_db psql -U parking_user -d parking_db -f /tmp/001_initial.sql

# Migración 2: módulo admin (venues, claims, promotions)
docker cp apps/api/src/database/migrations/002_admin.sql parking_db:/tmp/
docker exec parking_db psql -U parking_user -d parking_db -f /tmp/002_admin.sql

# Migración 3: módulo de fraude (fraud_rules, fraud_alerts)
docker cp apps/api/src/database/migrations/003_fraud.sql parking_db:/tmp/
docker exec parking_db psql -U parking_user -d parking_db -f /tmp/003_fraud.sql
```

### 5. Levantar en desarrollo

```bash
pnpm dev            # levanta los 3 servicios en paralelo
```

O por separado:

```bash
pnpm dev:api          # http://localhost:3000/api/v1
pnpm dev:marketplace  # http://localhost:3001
pnpm dev:admin        # http://localhost:3002
```

---

## Configurar Stripe Webhooks

Para recibir eventos de pago en local:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Escuchar y reenviar al API local
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe
```

El CLI imprime el `STRIPE_WEBHOOK_SECRET` (`whsec_...`) — agrégalo al `.env` y reinicia el API.

---

## Configurar Twilio WhatsApp

1. Entra a [console.twilio.com](https://console.twilio.com) → **Messaging → Try it out → Send a WhatsApp message**
2. El número sandbox es `+1 415 523 8886`
3. Cada número destino debe unirse al sandbox enviando `join <código>` al número de Twilio desde WhatsApp
4. Para producción, solicita un número de WhatsApp dedicado en Twilio

---

## Estructura del proyecto

```
parking-marketplace/
├── apps/
│   ├── api/                          ← NestJS Backend (puerto 3000)
│   │   └── src/modules/
│   │       ├── auth/                 ← OTP + JWT
│   │       ├── reservations/         ← Reservas con bloqueo atómico
│   │       ├── payments/             ← Stripe PaymentIntents + webhook
│   │       ├── qr/                   ← Generación y validación de QR
│   │       ├── events/               ← Catálogo de eventos
│   │       ├── admin/                ← Endpoints de gestión (role: admin)
│   │       └── fraud/                ← Detección automática de fraude
│   ├── marketplace/                  ← Next.js 14 (puerto 3001)
│   │   └── src/app/
│   │       ├── page.tsx              ← Listado de eventos
│   │       ├── eventos/[id]/         ← Detalle de evento
│   │       ├── checkout/[id]/        ← Pago con Stripe Elements
│   │       └── confirmacion/[id]/    ← Ticket QR
│   └── admin/                        ← React + Vite (puerto 3002)
│       └── src/pages/admin/
│           ├── Dashboard.tsx         ← Métricas en tiempo real
│           ├── Events.tsx            ← CRUD de eventos
│           ├── Venues.tsx            ← CRUD de venues
│           ├── Parkings.tsx          ← CRUD de estacionamientos
│           ├── Customers.tsx         ← Lista de usuarios
│           ├── Claims.tsx            ← Gestión de reclamos
│           ├── Promotions.tsx        ← Códigos de descuento
│           ├── Payments.tsx          ← Historial de pagos
│           └── Fraud.tsx             ← Prevención de fraude
├── packages/shared/                  ← Tipos TypeScript compartidos
├── docker-compose.yml
└── .env.example
```

---

## API — Endpoints principales

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/send-otp` | Enviar OTP por WhatsApp |
| POST | `/api/v1/auth/verify-otp` | Verificar OTP → JWT |

### Marketplace (requieren JWT)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/events` | Lista de eventos activos |
| POST | `/api/v1/reservations` | Crear reserva (bloqueo atómico) |
| DELETE | `/api/v1/reservations/:id` | Cancelar reserva |
| GET | `/api/v1/reservations/:id/ticket` | Obtener ticket + QR |
| POST | `/api/v1/payments/create-intent` | Crear PaymentIntent en Stripe |

### Operador (role: operator o admin)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/scan` | Validar y escanear QR |
| GET | `/api/v1/reservations/event/:id` | Reservas de un evento |

### Admin (role: admin)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/admin/metrics` | KPIs del dashboard |
| CRUD | `/api/v1/admin/venues` | Venues |
| CRUD | `/api/v1/admin/events` | Eventos |
| CRUD | `/api/v1/admin/parkings` | Estacionamientos |
| GET | `/api/v1/admin/users` | Clientes |
| CRUD | `/api/v1/admin/claims` | Reclamos |
| CRUD | `/api/v1/admin/promotions` | Promociones |
| GET | `/api/v1/admin/payments` | Historial de pagos |
| GET | `/api/v1/admin/fraud/stats` | Estadísticas de fraude |
| GET/PATCH | `/api/v1/admin/fraud/alerts` | Alertas de fraude |
| GET/PATCH | `/api/v1/admin/fraud/rules` | Reglas configurables |

---

## Módulo de prevención de fraude

Detecta automáticamente patrones sospechosos en cada transacción:

| Regla | Trigger | Nivel |
|---|---|---|
| Reservas rápidas | >3 reservas del mismo usuario en <10 min | Alto |
| Pagos fallidos | >2 pagos fallidos en <1 hora | Medio |
| QR duplicado | Intento de escanear un QR ya utilizado | Alto |
| Cancelaciones repetidas | >3 cancelaciones en el mismo evento | Medio |

Las reglas son configurables desde el panel admin (umbral, ventana de tiempo, activar/desactivar).

---

## Flujo completo de una compra

```
1. Usuario abre el marketplace → ve eventos activos
2. Selecciona evento → POST /reservations
   └─ Slot bloqueado atómicamente en BD (expira en 15 min)
3. Checkout → POST /payments/create-intent → clientSecret de Stripe
4. Usuario completa el pago con Stripe Elements
5. Stripe dispara webhook → POST /webhooks/stripe
   └─ Firma verificada → payment: completed → reserva: paid → QR generado
6. Usuario recibe QR por WhatsApp (Twilio)
7. Día del evento: operador escanea QR → POST /scan
   └─ JWT verificado → UPDATE atómico → reserva: used
```

---

## Roles

| Rol | Acceso |
|---|---|
| `user` | Marketplace — reservas, pagos, ticket |
| `operator` | Panel admin — escáner QR, reservaciones de sus eventos |
| `admin` | Panel admin — acceso completo + gestión de fraude |

---

## Desarrollo

```bash
# Type check completo
cd apps/api && npx tsc --noEmit
cd apps/admin && npx tsc --noEmit

# Probar endpoints admin
python3 /tmp/test_panel.py

# Demo end-to-end
python3 /tmp/demo_webhook.py
```
