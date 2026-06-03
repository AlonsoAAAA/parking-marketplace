import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { FraudModule } from '../fraud/fraud.module';
import { QrModule } from '../qr/qr.module';

@Module({
  imports: [FraudModule, QrModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
