import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { RolesGuard } from '../auth/guards/guards';

@Module({
  imports: [ConfigModule],
  providers: [AdminService, RolesGuard],
  controllers: [AdminController],
})
export class AdminModule {}
