import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsString, IsNotEmpty, IsOptional, IsArray,
  IsInt, Min, Max, MaxLength, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationsService } from './reservations.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

// Máximo 5 fotos, ~3.5MB en base64 c/u (imagen comprimida ~2.5MB antes de codificar)
const MAX_EVIDENCE_PHOTOS = 5;
const MAX_EVIDENCE_PHOTO_LENGTH = 3_500_000;

class CreateRefundRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_EVIDENCE_PHOTOS)
  @IsString({ each: true })
  @MaxLength(MAX_EVIDENCE_PHOTO_LENGTH, { each: true })
  evidencePhotos?: string[];
}

class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  parkingId?: string;
}

/**
 * DTO de vehículo v2 — sin campo `type` (lo detecta el servidor).
 * El frontend envía: plate, make, model, version (opcional), year, color.
 */
class VehicleDto {
  @IsString() @IsNotEmpty() plate: string;
  @IsString() @IsNotEmpty() make: string;
  @IsString() @IsNotEmpty() model: string;
  @IsOptional() @IsString() version?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 2)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() dto: CreateReservationDto, @Req() req: any) {
    return this.reservationsService.create(req.user.id, dto.eventId, dto.parkingId);
  }

  @Get('my')
  @UseGuards(JwtGuard)
  findMine(@Req() req: any) {
    return this.reservationsService.findByUser(req.user.id);
  }

  @Get('event/:eventId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('operator', 'sub_operator', 'sub_admin', 'admin')
  findByEvent(@Param('eventId') eventId: string, @Req() req: any) {
    return this.reservationsService.findByEvent(eventId, req.user.id);
  }

  /**
   * PATCH /api/v1/reservations/:id/vehicle
   * Guarda datos del vehículo. La categoría se determina en el servidor.
   */
  @Patch(':id/vehicle')
  @UseGuards(JwtGuard)
  saveVehicle(@Param('id') id: string, @Body() dto: VehicleDto, @Req() req: any) {
    return this.reservationsService.saveVehicle(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.cancel(id, req.user.id);
  }

  /**
   * GET /api/v1/reservations/:id/pricing
   * Sin parámetros → devuelve tabla completa de precios (para el admin / fallback).
   * Con ?marca=X&modelo=Y[&version=Z] → devuelve el precio específico para ese vehículo.
   * La categoría NUNCA se incluye en la respuesta al cliente.
   */
  @Get(':id/pricing')
  @UseGuards(JwtGuard)
  async getPricing(
    @Param('id') id: string,
    @Req() req: any,
    @Query('marca')   marca?:   string,
    @Query('modelo')  modelo?:  string,
    @Query('version') version?: string,
  ) {
    if (marca && modelo) {
      return this.reservationsService.getPrecioVehiculo(id, req.user.id, marca, modelo, version);
    }
    return this.reservationsService.getPricing(id, req.user.id);
  }

  @Get(':id/ticket')
  @UseGuards(JwtGuard)
  async getTicket(@Param('id') id: string, @Req() req: any) {
    const data = await this.reservationsService.getTicket(id, req.user.id);
    return { data };
  }

  @Post(':id/refund-request')
  @UseGuards(JwtGuard)
  async requestRefund(@Param('id') id: string, @Body() dto: CreateRefundRequestDto, @Req() req: any) {
    return this.reservationsService.createRefundRequest(id, req.user.id, dto.reason, dto.evidencePhotos ?? []);
  }
}
