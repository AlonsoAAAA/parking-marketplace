import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { QrModule } from '../qr/qr.module';

@Module({
  imports: [QrModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
