import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { VehicleModelsService } from './vehicle-models.service';
import { JwtGuard } from '../auth/guards/guards';

@Controller('vehicles')
export class VehicleModelsController {
  constructor(private readonly svc: VehicleModelsService) {}

  /**
   * GET /api/v1/vehicles?q=jetta&categories=Auto,Sub
   * Búsqueda en tiempo real para el dropdown del frontend.
   * Público — no requiere auth.
   */
  @Get()
  async search(
    @Query('q') q = '',
    @Query('categories') categories = '',
  ) {
    const cats = categories
      ? categories.split(',').map(c => c.trim()).filter(Boolean)
      : [];
    const models = await this.svc.search(q, cats);
    return { data: models };
  }

  /**
   * GET /api/v1/vehicles/stats
   * Diagnóstico rápido: cuántos modelos hay por categoría.
   */
  @Get('stats')
  async stats() {
    return this.svc.count();
  }

  /**
   * POST /api/v1/vehicles/sync
   * Dispara la sincronización manual desde Car Query API.
   * Requiere JWT (solo admin / uso interno).
   */
  @Post('sync')
  @UseGuards(JwtGuard)
  async sync() {
    const result = await this.svc.syncFromCarQuery();
    return { ok: true, ...result };
  }

  /**
   * POST /api/v1/vehicles/seed-motos
   * Inserta los modelos de moto hardcodeados (idempotente).
   */
  @Post('seed-motos')
  @UseGuards(JwtGuard)
  async seedMotos() {
    const inserted = await this.svc.seedMotos();
    return { ok: true, inserted };
  }
}
