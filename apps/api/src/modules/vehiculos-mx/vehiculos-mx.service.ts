/**
 * VEHICULOS MX SERVICE — Park Center Plataforma Digital
 * ======================================================
 * Puerto TypeScript de validador_v2.js
 * Clasificación por LARGO DEL VEHÍCULO en metros.
 * El precio lo determina el panel de admin — nunca este servicio.
 *
 * 4 categorías de facturación:
 *   moto | auto | suv_camioneta | pickup
 */
import { Injectable } from '@nestjs/common';
import * as path from 'path';

// El JSON se carga una sola vez al iniciar el proceso
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DB = require(path.join(__dirname, '../../data/vehiculos_mexico_v4.json'));

// ── Umbrales de largo (metros) ────────────────────────────────────────
const UMBRALES = {
  MOTO_MAX: 2.50,   // ≤ 2.50m → Moto
  AUTO_MAX: 4.79,   // 2.51m – 4.79m → Automóvil
  // ≥ 4.80m → SUV / Camioneta (no-pickup, no-moto)
};

// Tipos del JSON que SIEMPRE son Pickup (independiente del largo)
const TIPOS_PICKUP = new Set(['pickup', 'pickup-s', 'pickup-d']);
const TIPOS_MOTO   = new Set(['moto']);

export type VehiculoCategoria = 'moto' | 'auto' | 'suv_camioneta' | 'pickup';

interface ModeloData {
  tipo: string;
  largo_m?: number | null;
  ancho_m?: number | null;
  dim_versiones?: Record<string, { largo: number; ancho: number }> | null;
  versiones?: string[] | null;
}

export interface ResolucionVehiculo {
  ok: boolean;
  categoria?: VehiculoCategoria;
  largo_m?: number;
  ancho_m?: number;
  error?: string;
}

@Injectable()
export class VehiculosMxService {
  // Índice en memoria: { "nissan": { "versa": ModeloData } }
  private readonly indice: Record<string, Record<string, ModeloData>> = {};

  constructor() {
    for (const marca of DB.marcas) {
      const mk: string = (marca.nombre as string).toLowerCase().trim();
      this.indice[mk] = {};
      for (const modelo of marca.modelos) {
        const moKey: string = (modelo.nombre as string).toLowerCase().trim();
        this.indice[mk][moKey] = {
          tipo:          modelo.tipo,
          largo_m:       modelo.largo_m       ?? null,
          ancho_m:       modelo.ancho_m       ?? null,
          dim_versiones: modelo.dim_versiones ?? null,
          versiones:     modelo.versiones     ?? null,
        };
      }
    }
  }

  // ─── Catálogo (para dropdowns del frontend) ───────────────────────────────

  listarMarcas(): string[] {
    return DB.marcas.map((m: any) => m.nombre as string).sort(
      (a: string, b: string) => a.localeCompare(b),
    );
  }

  listarModelos(marca: string): Array<{ nombre: string; tieneVersion: boolean }> {
    const mKey = (marca ?? '').toLowerCase().trim();
    const marcaObj = DB.marcas.find((m: any) => m.nombre.toLowerCase() === mKey);
    if (!marcaObj) return [];
    return marcaObj.modelos.map((mo: any) => ({
      nombre:       mo.nombre as string,
      tieneVersion: !!(mo.versiones && (mo.versiones as any[]).length > 0),
    }));
  }

  listarVersiones(marca: string, modelo: string): string[] {
    const mKey  = (marca  ?? '').toLowerCase().trim();
    const moKey = (modelo ?? '').toLowerCase().trim();
    const marcaObj = DB.marcas.find((m: any) => m.nombre.toLowerCase() === mKey);
    if (!marcaObj) return [];
    const modeloObj = marcaObj.modelos.find((mo: any) => mo.nombre.toLowerCase() === moKey);
    if (!modeloObj || !modeloObj.versiones) return [];
    return modeloObj.versiones as string[];
  }

  // ─── Resolución servidor (NUNCA exponer resultado al cliente) ────────────

  resolverVehiculo(
    marca:   string,
    modelo:  string,
    version?: string,
  ): ResolucionVehiculo {
    const mKey  = (marca   ?? '').toLowerCase().trim();
    const moKey = (modelo  ?? '').toLowerCase().trim();
    const vKey  = (version ?? '').trim();

    if (!mKey)  return { ok: false, error: 'Marca requerida' };
    if (!moKey) return { ok: false, error: 'Modelo requerido' };

    const marcaData = this.indice[mKey];
    if (!marcaData) return { ok: false, error: 'Marca no reconocida' };

    const moData = marcaData[moKey];
    if (!moData) return { ok: false, error: 'Modelo no reconocido para esta marca' };

    let largo_m: number;
    let ancho_m: number;

    if (moData.dim_versiones) {
      // Modelo con versiones (pickups con cabina sencilla / doble, etc.)
      if (!vKey) return { ok: false, error: 'Este modelo requiere que selecciones una versión' };

      const dimVer = moData.dim_versiones[vKey];
      if (!dimVer) {
        // Versión no reconocida → usar dimensiones máximas (conservador)
        const maxDim = Object.values(moData.dim_versiones).reduce(
          (max, d) => (d.largo > (max?.largo ?? 0) ? d : max),
          null as { largo: number; ancho: number } | null,
        );
        if (maxDim) {
          largo_m = maxDim.largo;
          ancho_m = maxDim.ancho;
        } else {
          return { ok: false, error: 'Versión no reconocida y sin dimensiones de respaldo' };
        }
      } else {
        largo_m = dimVer.largo;
        ancho_m = dimVer.ancho;
      }
    } else if (moData.largo_m) {
      largo_m = moData.largo_m;
      ancho_m = moData.ancho_m ?? 0;
    } else {
      return { ok: false, error: 'Dimensiones del vehículo no disponibles' };
    }

    const categoria = this.clasificarPorLargo(moData.tipo, largo_m);
    return { ok: true, categoria, largo_m, ancho_m };
  }

  // ─── Clasificador interno ─────────────────────────────────────────────────

  private clasificarPorLargo(tipo_base: string, largo_m: number): VehiculoCategoria {
    if (TIPOS_MOTO.has(tipo_base))   return 'moto';
    if (TIPOS_PICKUP.has(tipo_base)) return 'pickup';
    if (largo_m <= UMBRALES.MOTO_MAX) return 'moto';   // fallback
    if (largo_m <= UMBRALES.AUTO_MAX) return 'auto';
    return 'suv_camioneta';
  }
}
