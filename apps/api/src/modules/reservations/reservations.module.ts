import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { FraudModule } from '../fraud/fraud.module';
import { QrModule } from '../qr/qr.module';
import { VehiculosMxModule } from '../vehiculos-mx/vehiculos-mx.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [FraudModule, QrModule, VehiculosMxModule, WhatsAppModule],
  providers: [ReservationsService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
