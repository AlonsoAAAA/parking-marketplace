import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../auth/guards/guards';

class CreateIntentDto {
  @IsUUID('all')
  reservationId: string;
}

class SyncPaymentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}

class ApplyPromoDto {
  @IsUUID('all')
  reservationId: string;
  @IsString()
  @IsNotEmpty()
  code: string;
}

class VehicleChangeDto {
  @IsUUID('all') reservationId: string;
  @IsString() @IsNotEmpty() plate: string;
  @IsString() @IsNotEmpty() make: string;
  @IsString() @IsNotEmpty() model: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1990) @Max(new Date().getFullYear() + 2) year?: number;
  @IsOptional() @IsString() color?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtGuard)
  createIntent(@Body() dto: CreateIntentDto, @Req() req: any) {
    return this.paymentsService.createPaymentIntent(dto.reservationId, req.user.id);
  }

  @Post('sync')
  @UseGuards(JwtGuard)
  sync(@Body() dto: SyncPaymentDto, @Req() req: any) {
    return this.paymentsService.syncPaymentIntent(dto.paymentIntentId, req.user.id);
  }

  @Post('apply-promo')
  @UseGuards(JwtGuard)
  applyPromo(@Body() dto: ApplyPromoDto, @Req() req: any) {
    return this.paymentsService.applyPromoCode(dto.reservationId, req.user.id, dto.code);
  }

  @Get('vehicle-change/current')
  @UseGuards(JwtGuard)
  getCurrentVehicle(@Query('reservationId') reservationId: string, @Req() req: any) {
    return this.paymentsService.getCurrentVehicle(reservationId, req.user.id);
  }

  @Post('vehicle-change/quote')
  @UseGuards(JwtGuard)
  quoteVehicleChange(@Body() dto: VehicleChangeDto, @Req() req: any) {
    const { reservationId, ...vehicle } = dto;
    return this.paymentsService.quoteVehicleChange(reservationId, req.user.id, vehicle);
  }

  @Post('vehicle-change/intent')
  @UseGuards(JwtGuard)
  createVehicleChangeIntent(@Body() dto: VehicleChangeDto, @Req() req: any) {
    const { reservationId, ...vehicle } = dto;
    return this.paymentsService.createVehicleChangeIntent(reservationId, req.user.id, vehicle);
  }

  @Post('vehicle-change/apply-free')
  @UseGuards(JwtGuard)
  applyVehicleChangeFree(@Body() dto: VehicleChangeDto, @Req() req: any) {
    const { reservationId, ...vehicle } = dto;
    return this.paymentsService.applyVehicleChangeFree(reservationId, req.user.id, vehicle);
  }
}
