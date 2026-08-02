/**
 * CÓDIGO POSTAL — lookup público de CP mexicano.
 * Usa zippopotam.us (gratuito, sin API key). Solo da un lugar/estado por CP
 * — no expone la lista completa de colonias que sí tendría un servicio como
 * Copomex (de paga). Cache en memoria porque un CP nunca cambia de estado/ciudad.
 */
import { Injectable } from '@nestjs/common';

export interface CodigoPostalInfo {
  cp: string;
  ciudad: string;
  municipio: string;
  estado: string;
}

@Injectable()
export class CodigoPostalService {
  private cache = new Map<string, CodigoPostalInfo | null>();

  async lookup(cp: string): Promise<CodigoPostalInfo | null> {
    const clean = cp.replace(/\D/g, '').slice(0, 5);
    if (clean.length !== 5) return null;

    if (this.cache.has(clean)) return this.cache.get(clean) ?? null;

    try {
      const res = await fetch(`http://api.zippopotam.us/mx/${clean}`, { signal: AbortSignal.timeout(6_000) });
      if (!res.ok) { this.cache.set(clean, null); return null; }
      const data = await res.json() as {
        places?: Array<{ 'place name'?: string; state?: string }>;
      };
      const place = data.places?.[0];
      if (!place) { this.cache.set(clean, null); return null; }

      const info: CodigoPostalInfo = {
        cp: clean,
        ciudad: place['place name'] ?? '',
        municipio: place['place name'] ?? '',
        estado: place.state ?? '',
      };
      this.cache.set(clean, info);
      return info;
    } catch {
      return null;
    }
  }
}
