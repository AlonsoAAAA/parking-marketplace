import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhooksController } from './webhooks.controller';
import { QrModule } from '../qr/qr.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FraudModule } from '../fraud/fraud.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [QrModule, NotificationsModule, FraudModule, PricingModule],
  providers: [PaymentsService],
  controllers: [PaymentsController, WebhooksController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
