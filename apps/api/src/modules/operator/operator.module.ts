import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperatorService } from './operator.service';
import { OperatorController } from './operator.controller';
import { RolesGuard } from '../auth/guards/guards';
import { OtpEntity } from '../auth/entities/otp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OtpEntity])],
  providers: [OperatorService, RolesGuard],
  controllers: [OperatorController],
})
export class OperatorModule {}
