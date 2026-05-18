import { Module } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { RolesGuard } from '../auth/guards/guards';

@Module({
  controllers: [CheckinController],
  providers: [CheckinService, RolesGuard],
})
export class CheckinModule {}
