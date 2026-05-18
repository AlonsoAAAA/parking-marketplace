import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { ScanController } from './scan.controller';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [FraudModule],
  providers: [QrService],
  controllers: [ScanController],
  exports: [QrService],
})
export class QrModule {}
