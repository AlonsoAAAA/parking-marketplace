/**
 * PRICING SERVICE — Motor de precios dinámicos
 * =============================================
 * Calcula el precio público a partir del precio de contrato y tres señales
 * de mercado: distancia, anticipación y demanda (ocupación).
 *
 * IVA México = 16%
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface PricingConfig {
  mode:                'fixed' | 'dynamic'; // fijo (margen único) o dinámico (motor de multiplicadores)
  fixedMarginPct:      number;   // %  margen único usado cuando mode === 'fixed'
  marginMin:          number;   // %  ej. 15  (solo aplica en modo dinámico)
  marginMax:          number;   // %  ej. 60  (solo aplica en modo dinámico)
  weightDistance:     number;   // 0-1
  weightAnticipation: number;   // 0-1
  weightDemand:       number;   // 0-1
}

export interface CalculatePriceParams {
  contractPrice:     number;           // precio contrato con el estacionamiento
  distanceKm:        number;           // distancia estacionamiento → venue
  anticipationHours: number;           // horas antes del evento
  occupancyPercent:  number;           // % ocupación actual 0-100
  vehicleType:       'auto' | 'suv_camioneta' | 'pickup' | 'moto';
  config:            PricingConfig;
}

export interface PriceBreakdown {
  contractPrice:  number;   // precio pagado al estacionamiento
  basePrice:      number;   // precio sin IVA al cliente
  ivaAmount:      number;   // IVA (16%)
  finalPrice:     number;   // precio final con IVA (redondeado)
  profit:         number;   // ganancia = basePrice - contractPrice
  marginPercent:  number;   // margen real aplicado (%)
  multipliers: {
    distance:    number;
    anticipation:number;
    demand:      number;
    composite:   number;
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const IVA_RATE = 0.16;

// Rangos posibles de cada multiplicador (para normalización)
const MULT_MIN = { distance: 0.8, anticipation: 0.9, demand: 0.85 };
const MULT_MAX = { distance: 1.5, anticipation: 1.6, demand: 1.40 };

// ─── Curvas de multiplicadores ────────────────────────────────────────────────

/** Interpolación lineal entre dos puntos */
function lerp(x: number, x0: number, y0: number, x1: number, y1: number): number {
  if (x <= x0) return y0;
  if (x >= x1) return y1;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}

/**
 * distanceMultiplier(km)
 *  ≤0.5 → 1.5 | 1 → 1.2 | 2 → 1.0 | ≥3 → 0.8
 */
export function distanceMultiplier(km: number): number {
  if (km <= 0.5) return 1.5;
  if (km <= 1.0) return lerp(km, 0.5, 1.5, 1.0, 1.2);
  if (km <= 2.0) return lerp(km, 1.0, 1.2, 2.0, 1.0);
  if (km <= 3.0) return lerp(km, 2.0, 1.0, 3.0, 0.8);
  return 0.8;
}

/**
 * anticipationMultiplier(hours)
 *  0h → 1.6 | 6h → 1.3 | 24h → 1.1 | 72h → 1.0 | ≥168h → 0.9
 */
export function anticipationMultiplier(hours: number): number {
  if (hours <= 0)   return 1.6;
  if (hours <= 6)   return lerp(hours,  0,  1.6,  6,  1.3);
  if (hours <= 24)  return lerp(hours,  6,  1.3, 24,  1.1);
  if (hours <= 72)  return lerp(hours, 24,  1.1, 72,  1.0);
  if (hours <= 168) return lerp(hours, 72,  1.0, 168, 0.9);
  return 0.9;
}

/**
 * demandMultiplier(occupancyPercent)
 *  0% → 0.85 | 50% → 1.0 | 80% → 1.2 | 100% → 1.4
 */
export function demandMultiplier(occupancyPct: number): number {
  const pct = Math.max(0, Math.min(100, occupancyPct));
  if (pct <= 50)  return lerp(pct,  0, 0.85,  50, 1.0);
  if (pct <= 80)  return lerp(pct, 50, 1.0,   80, 1.2);
  return           lerp(pct, 80, 1.2, 100, 1.4);
}

// ─── Motor de precios ─────────────────────────────────────────────────────────

export function calculatePrice(params: CalculatePriceParams): PriceBreakdown {
  const { contractPrice, distanceKm, anticipationHours, occupancyPercent, config } = params;
  const { mode, fixedMarginPct, marginMin, marginMax, weightDistance, weightAnticipation, weightDemand } = config;

  // Modo FIJO: un solo margen, sin variar por distancia/anticipación/demanda.
  // Los multiplicadores se reportan como 1× (informativos, no afectan el precio).
  if (mode === 'fixed') {
    const marginPercent = fixedMarginPct;
    const basePrice  = +(contractPrice * (1 + marginPercent / 100)).toFixed(2);
    const ivaAmount  = +(basePrice * IVA_RATE).toFixed(2);
    const finalPrice = Math.round(basePrice + ivaAmount);
    const profit     = +(basePrice - contractPrice).toFixed(2);
    return {
      contractPrice, basePrice, ivaAmount, finalPrice, profit,
      marginPercent: +marginPercent.toFixed(2),
      multipliers: { distance: 1, anticipation: 1, demand: 1, composite: 1 },
    };
  }

  // Modo DINÁMICO: motor de multiplicadores (comportamiento original).
  // 1. Calcular multiplicadores individuales
  const mDist = distanceMultiplier(distanceKm);
  const mAnt  = anticipationMultiplier(anticipationHours);
  const mDem  = demandMultiplier(occupancyPercent);

  // 2. Multiplicador compuesto (media ponderada)
  const composite = weightDistance * mDist + weightAnticipation * mAnt + weightDemand * mDem;

  // 3. Normalizar composite a [0,1] en función de los pesos reales
  const compMin = weightDistance * MULT_MIN.distance
                + weightAnticipation * MULT_MIN.anticipation
                + weightDemand * MULT_MIN.demand;
  const compMax = weightDistance * MULT_MAX.distance
                + weightAnticipation * MULT_MAX.anticipation
                + weightDemand * MULT_MAX.demand;
  const score = compMax > compMin
    ? Math.max(0, Math.min(1, (composite - compMin) / (compMax - compMin)))
    : 0.5;

  // 4. Margen real dentro del rango configurado
  const marginPercent = marginMin + score * (marginMax - marginMin);

  // 5. Precio base (sin IVA)
  const basePrice = +(contractPrice * (1 + marginPercent / 100)).toFixed(2);

  // 6. IVA y precio final
  const ivaAmount  = +(basePrice * IVA_RATE).toFixed(2);
  const finalPrice = Math.round(basePrice + ivaAmount); // redondeado al peso más cercano

  // 7. Ganancia = lo que queda después de pagar al estacionamiento (sin IVA)
  const profit = +(basePrice - contractPrice).toFixed(2);

  return {
    contractPrice,
    basePrice,
    ivaAmount,
    finalPrice,
    profit,
    marginPercent: +marginPercent.toFixed(2),
    multipliers: {
      distance:    +mDist.toFixed(4),
      anticipation:+mAnt.toFixed(4),
      demand:      +mDem.toFixed(4),
      composite:   +composite.toFixed(4),
    },
  };
}

// ─── Servicio NestJS ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: PricingConfig = {
  mode:               'fixed',
  fixedMarginPct:     30,
  marginMin:          15,
  marginMax:          60,
  weightDistance:     0.40,
  weightAnticipation: 0.35,
  weightDemand:       0.25,
};

@Injectable()
export class PricingService implements OnModuleInit {
  private cache: PricingConfig = { ...DEFAULT_CONFIG };

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.refreshCache();
    } catch {
      // tabla puede no existir en entorno fresco — usar defaults
    }
  }

  private async refreshCache(): Promise<void> {
    const rows = await this.dataSource.query(
      'SELECT * FROM pricing_config ORDER BY updated_at DESC LIMIT 1',
    );
    if (rows.length) {
      const r = rows[0];
      this.cache = {
        mode:               r.mode === 'dynamic' ? 'dynamic' : 'fixed',
        fixedMarginPct:     r.fixed_margin_pct != null ? +r.fixed_margin_pct : DEFAULT_CONFIG.fixedMarginPct,
        marginMin:          +r.margin_min,
        marginMax:          +r.margin_max,
        weightDistance:     +r.weight_distance,
        weightAnticipation: +r.weight_anticipation,
        weightDemand:       +r.weight_demand,
      };
    }
  }

  /** Devuelve la config activa (desde caché) */
  getConfig(): PricingConfig {
    return { ...this.cache };
  }

  /** Persiste nueva configuración y refresca caché */
  async saveConfig(dto: PricingConfig, updatedBy?: string): Promise<PricingConfig> {
    const existing = await this.dataSource.query(
      'SELECT id FROM pricing_config LIMIT 1',
    );

    if (existing.length) {
      await this.dataSource.query(
        `UPDATE pricing_config
         SET mode                = $1,
             fixed_margin_pct    = $2,
             margin_min          = $3,
             margin_max          = $4,
             weight_distance     = $5,
             weight_anticipation = $6,
             weight_demand       = $7,
             updated_at          = NOW(),
             updated_by          = $8
         WHERE id = $9`,
        [
          dto.mode, dto.fixedMarginPct,
          dto.marginMin, dto.marginMax,
          dto.weightDistance, dto.weightAnticipation, dto.weightDemand,
          updatedBy ?? null,
          existing[0].id,
        ],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO pricing_config
         (mode, fixed_margin_pct, margin_min, margin_max, weight_distance, weight_anticipation, weight_demand, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          dto.mode, dto.fixedMarginPct,
          dto.marginMin, dto.marginMax,
          dto.weightDistance, dto.weightAnticipation, dto.weightDemand,
          updatedBy ?? null,
        ],
      );
    }

    await this.refreshCache();
    return this.getConfig();
  }

  /** Calcula precio usando la config activa */
  calculate(params: Omit<CalculatePriceParams, 'config'>): PriceBreakdown {
    return calculatePrice({ ...params, config: this.cache });
  }
}
