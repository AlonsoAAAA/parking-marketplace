import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
