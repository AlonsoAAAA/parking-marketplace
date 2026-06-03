# ParkMX — Estado del proyecto (Mayo 2026)

## Arquitectura
| App | Puerto | Ruta |
|---|---|---|
| API (NestJS) | 3000 | `apps/api` |
| Marketplace (Next.js 14) | 3001 | `apps/marketplace` |
| Admin/Operador (Vite+React) | 3002 | `apps/admin` |

- **DB**: PostgreSQL 16 — contenedor Docker `parking_db`, usuario `parking_user`, base `parking_db`
- **Redis**: contenedor Docker `parking_redis`
- **Ngrok**: túnel activo `https://powdering-woven-unmovable.ngrok-free.dev` → puerto 3002  
  Si el túnel muere: `pkill -f "ngrok http" && ngrok http 3002 &`

---

## Credenciales de prueba
| Cuenta | Teléfono | OTP |
|---|---|---|
| Admin | `5511111111` | `111222` |
| Operador (Carlos) | `5512345678` | `111222` |
| Operador (Demo) | `5512345679` | `111222` |

OTP **siempre es `111222`** en desarrollo — fijado en `auth.service.ts`:
```ts
const otp = isDev ? '111222' : Math.floor(100000 + Math.random() * 900000).toString();
```

---

## Design system
- Fondo global: `#EDEDED` · Texto: `#1a1a1a` · Blanco: `#fff`
- **Marketplace**: clases `pm-page`, `pm-header`, `pm-back`, `pm-logo`, `pm-btn-primary`
  - `CARD_COLORS` y `SHARED_CSS` en `apps/marketplace/src/lib/design.ts`
- **Admin**: tokens inline `T = { bg:'#EDEDED', text:'#1a1a1a', white:'#fff', ... }` en cada página

---

## Módulo de modelos de autos (`vehicle_models`)

### Tabla
```sql
CREATE TABLE vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('Auto','Sub','Pick Up','Moto')),
  source VARCHAR(50) DEFAULT 'manual',
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (make, model)
);
CREATE INDEX idx_vm_trgm ON vehicle_models
  USING GIN ((LOWER(make) || ' ' || LOWER(model)) gin_trgm_ops);
```

### Archivos
- `apps/api/src/modules/vehicle-models/vehicle-models.service.ts` — lógica
- `apps/api/src/modules/vehicle-models/vehicle-models.controller.ts` — endpoints
- `apps/api/src/modules/vehicle-models/vehicle-models.module.ts` — OnModuleInit + cron

### Endpoints
- `GET /api/v1/vehicles?q=jetta&categories=Auto,Sub` — búsqueda fuzzy (pg_trgm, umbral 0.24)
- `GET /api/v1/vehicles/stats` — conteo por categoría
- `POST /api/v1/vehicles/sync` — sync manual NHTSA (requiere JWT admin)

### Lógica de actualización
1. **Seed México** (~160 modelos, idempotente) corre en cada startup via `onModuleInit`
2. **NHTSA vPIC sync** mensual via `@Cron('0 2 1 * *')` — 37 marcas × 4 tipos × año 2024
3. `ON CONFLICT DO NOTHING` — nunca duplica

---

## Marketplace — páginas modificadas

### `/eventos/[id]/parking/[parkingId]/page.tsx`
- Reemplazó los 4 botones de tipo (Auto/SUV/Pick Up/Moto) por `ModelDropdown`
- `ModelDropdown`: input con debounce 300ms → `GET /api/v1/vehicles?q=...`
- Al seleccionar, guarda en `localStorage`: `pendingVehicleType` y `pendingVehicleModel`
- El CTA de pago queda deshabilitado hasta que se selecciona modelo

### `/checkout/[reservationId]/page.tsx`
- Checkbox de Términos y Condiciones requerido antes de habilitar el botón de pago
- `TermsModal`: bottom sheet con animación `slideUp`, 8 secciones en español
- Botón deshabilitado + `opacity: 0.4` si `!termsAccepted`

---

## Admin — app de operador

### Scanner (`apps/admin/src/pages/operator/Scanner.tsx`)
**4 pasos**: QR → Placas → Fotos → Confirmar

**Paso 1 — QR** (3 modos):
1. **Foto del QR** (principal, funciona en HTTP): `<input type="file" accept="image/*" capture="environment">` → jsQR procesa la imagen
2. **Cámara en vivo** (solo si `window.isSecureContext` = HTTPS): `getUserMedia` + jsQR frame-by-frame
3. **Token manual**: pega el JWT del QR directamente

**Paso 3 — Fotos**:
- 4 capturas: Frente, Atrás, Lado izquierdo, Lado derecho
- Cada una usa `<input type="file" capture="environment">` → compresión JPEG 75% en canvas
- Funciona sin HTTPS en cualquier móvil

### Fixes de pantalla negra en iOS
- `apps/admin/index.html`: `<meta name="color-scheme" content="light">`
- `apps/admin/src/index.css`: `color-scheme: light` en `html, body`

### Fix de roles (`apps/admin/src/App.tsx`)
- `decodeRole()` ahora distingue `'user'` | `'operator'` | `'admin'`
- Si el JWT tiene `role: 'user'`, muestra pantalla "Sin acceso" con instrucciones
- Evita el error silencioso 403 cuando alguien entra con su número personal

---

## Flujo QR completo
```
1. Usuario paga → POST /api/v1/qr/:reservationId → genera JWT firmado (QR_SECRET, 7d)
2. QR contiene: JSON.stringify({ t: "<jwt>" })
3. Operador escanea foto → jsQR extrae { t } → POST /api/v1/scan
   Body: { token: qrToken }
   Header: Authorization: Bearer <operator_jwt>
4. Backend: valida firma JWT, busca en qr_tokens, checa scanned_at y reservation_status
5. UPDATE atómico: SET scanned_at = NOW(), scanned_by = operatorId WHERE scanned_at IS NULL
6. UPDATE reservations SET status = 'used'
7. Operador registra placa + 4 fotos → POST /api/v1/checkin/:reservationId
```

---

## Auth
- Tabla `otp_codes`: `phone, otp, expires_at, verified`
- JWT payload: `{ sub, phone, role }` firmado con `JWT_SECRET`
- Guard: `import { JwtGuard, RolesGuard } from '../auth/guards/guards'`
- Roles disponibles: `admin`, `operator`, `user`

---

## Comandos útiles

### Ver logs API
```bash
# La API corre en modo --watch, los logs van a la terminal donde se inició
```

### Reiniciar túnel ngrok
```bash
pkill -f "ngrok http"
ngrok http 3002 &
sleep 4 && curl -s http://localhost:4040/api/tunnels | python3 -c \
  "import sys,json; [print(t['public_url']) for t in json.load(sys.stdin)['tunnels'] if 'https' in t['public_url']]"
```

### Consultas DB útiles
```bash
# Ver modelos de autos
docker exec parking_db psql -U parking_user -d parking_db -c \
  "SELECT category, COUNT(*) FROM vehicle_models GROUP BY category;"

# Ver usuarios
docker exec parking_db psql -U parking_user -d parking_db -c \
  "SELECT phone, role, name FROM users;"

# Renovar OTP manual
docker exec parking_db psql -U parking_user -d parking_db -c \
  "INSERT INTO otp_codes (phone, otp, expires_at)
   VALUES ('5512345678','111222', NOW() + INTERVAL '60 min')
   ON CONFLICT (phone) DO UPDATE SET otp='111222', expires_at=NOW()+INTERVAL '60 min', verified=false;"
```

### Build admin
```bash
cd apps/admin && npx tsc --noEmit  # type check
npx vite build                      # production build
```
