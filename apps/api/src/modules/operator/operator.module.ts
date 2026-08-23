import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorService } from './operator.service';
import { OperatorController } from './operator.controller';
import { RolesGuard } from '../auth/guards/guards';
import { OtpEntity } from '../auth/entities/otp.entity';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [TypeOrmModule.forFeature([OtpEntity]), WhatsAppModule],
  providers: [OperatorService, RolesGuard],
  controllers: [OperatorController],
})
export class OperatorModule {}
