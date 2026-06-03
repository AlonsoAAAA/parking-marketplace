/**
 * VEHICULOS MX CONTROLLER
 * ========================
 * Endpoints públicos para poblar dropdowns del frontend.
 * NUNCA expone tipo, largo, ni categoría de tarifa.
 */
import { Controller, Get, Query } from '@nestjs/common';
import { VehiculosMxService } from './vehiculos-mx.service';

@Controller('vehiculos')
export class VehiculosMxController {
  constructor(private readonly svc: VehiculosMxService) {}

  /**
   * GET /api/v1/vehiculos/marcas
   * Lista de todas las marcas disponibles (ordenadas A-Z).
   */
  @Get('marcas')
  marcas() {
    return { marcas: this.svc.listarMarcas() };
  }

  /**
   * GET /api/v1/vehiculos/modelos?marca=Nissan
   * Modelos de una marca con flag `tieneVersion` para mostrar el dropdown de versión.
   * NO incluye tipo, largo ni precio.
   */
  @Get('modelos')
  modelos(@Query('marca') marca = '') {
    return { modelos: this.svc.listarModelos(marca) };
  }

  /**
   * GET /api/v1/vehiculos/versiones?marca=Nissan&modelo=NP300+Frontier
   * Versiones disponibles para pickups y vans con variantes de cabina.
   */
  @Get('versiones')
  versiones(
    @Query('marca') marca = '',
    @Query('modelo') modelo = '',
  ) {
    return { versiones: this.svc.listarVersiones(marca, modelo) };
  }
}
