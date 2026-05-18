import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FraudService } from './fraud.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

class UpdateAlertDto {
  @IsString()
  status: string;
}

class UpdateRuleDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  threshold?: number;

  @IsOptional() @IsInt() @Min(0) @Type(() => Number)
  windowMinutes?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

@Controller('admin/fraud')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class FraudController {
  constructor(private fraud: FraudService) {}

  @Get('stats')
  async getStats() {
    return { data: await this.fraud.getStats() };
  }

  @Get('alerts')
  async listAlerts(
    @Query('status') status?: string,
    @Query('level') level?: string,
  ) {
    return { data: await this.fraud.listAlerts(status, level) };
  }

  @Patch('alerts/:id')
  async updateAlert(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return { data: await this.fraud.updateAlert(id, dto.status) };
  }

  @Get('rules')
  async listRules() {
    return { data: await this.fraud.listRules() };
  }

  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return { data: await this.fraud.updateRule(id, dto) };
  }
}
