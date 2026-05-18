import { Module } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { FraudController } from './fraud.controller';
import { RolesGuard } from '../auth/guards/guards';

@Module({
  providers: [FraudService, RolesGuard],
  controllers: [FraudController],
  exports: [FraudService],
})
export class FraudModule {}
