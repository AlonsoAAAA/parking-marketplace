import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IsUUID, IsString, IsNotEmpty } from 'class-validator';
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
}
