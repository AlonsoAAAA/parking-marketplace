/**
 * PRICING CONTROLLER
 * ==================
 * GET  /api/v1/pricing-config              → config activa (público)
 * PUT  /api/v1/pricing-config              → actualizar config (admin)
 * GET  /api/v1/pricing-config/calculate    → precio calculado (público)
 */
import { Controller, Get, Put, Body, Query, Req, UseGuards } from '@nestjs/common';
import {
  IsNumber, IsInt, IsIn, Min, Max, ValidatorConstraint,
  ValidatorConstraintInterface, Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingService } from './pricing.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── Validación: pesos deben sumar 1.0 (±0.01) ──────────────────────────────
@ValidatorConstraint({ name: 'WeightsSumToOne', async: false })
class WeightsSumToOne implements ValidatorConstraintInterface {
  validate(_: any, args: any) {
    const obj = args.object as SaveConfigDto;
    const sum  = obj.weightDistance + obj.weightAnticipation + obj.weightDemand;
    return Math.abs(sum - 1) <= 0.01;
  }
  defaultMessage() { return 'Los pesos deben sumar exactamente 100%'; }
}

class SaveConfigDto {
  @IsIn(['fixed', 'dynamic']) mode: 'fixed' | 'dynamic';
  @Type(() => Number) @IsNumber() @Min(0)   @Max(200) fixedMarginPct:     number;
  @Type(() => Number) @IsNumber() @Min(0)   @Max(100) marginMin:          number;
  @Type(() => Number) @IsNumber() @Min(0)   @Max(200) marginMax:          number;
  @Type(() => Number) @IsNumber() @Min(0)   @Max(1)   weightDistance:     number;
  @Type(() => Number) @IsNumber() @Min(0)   @Max(1)   weightAnticipation: number;
  @Type(() => Number) @IsNumber() @Min(0)   @Max(1)   @Validate(WeightsSumToOne) weightDemand: number;
}

@Controller('pricing-config')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  /** GET /api/v1/pricing-config — config activa */
  @Get()
  getConfig() {
    return { data: this.pricing.getConfig() };
  }

  /** PUT /api/v1/pricing-config — actualizar config (admin only) */
  @Put()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  async saveConfig(@Body() dto: SaveConfigDto, @Req() req: any) {
    const saved = await this.pricing.saveConfig(dto, req.user?.id);
    return { data: saved };
  }

  /**
   * GET /api/v1/pricing-config/calculate
   * ?contractPrice=100&distanceKm=1.5&anticipationHours=48&occupancyPercent=70
   */
  @Get('calculate')
  calculate(
    @Query('contractPrice')     contractPrice:     string,
    @Query('distanceKm')        distanceKm:        string,
    @Query('anticipationHours') anticipationHours: string,
    @Query('occupancyPercent')  occupancyPercent:  string,
    @Query('vehicleType')       vehicleType:       string,
  ) {
    const breakdown = this.pricing.calculate({
      contractPrice:     parseFloat(contractPrice)     || 0,
      distanceKm:        parseFloat(distanceKm)        || 0,
      anticipationHours: parseFloat(anticipationHours) || 0,
      occupancyPercent:  parseFloat(occupancyPercent)  || 0,
      vehicleType:       (vehicleType as any) || 'auto',
    });
    return { data: breakdown };
  }
}
