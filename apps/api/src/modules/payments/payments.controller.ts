import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { PaymentsService } from './payments.service';
import { JwtGuard } from '../auth/guards/guards';

class CreateIntentDto {
  @IsUUID('all')
  reservationId: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtGuard)
  createIntent(@Body() dto: CreateIntentDto, @Req() req: any) {
    return this.paymentsService.createPaymentIntent(dto.reservationId, req.user.id);
  }
}
