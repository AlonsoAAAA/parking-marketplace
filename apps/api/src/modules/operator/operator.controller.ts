import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsIn, MinLength, MaxLength, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { OperatorService } from './operator.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateSubOperatorDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsString() @MinLength(10) phone: string;
  @IsOptional() @IsIn(['sub_operator', 'sub_admin']) role?: string;
  @IsString() @IsNotEmpty() @Length(6, 6) otp: string;
}

class UpdateSubOperatorDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsBoolean() @Type(() => Boolean) isActive?: boolean;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('operator')
@UseGuards(JwtGuard, RolesGuard)
@Roles('operator')
export class OperatorController {
  constructor(private operatorService: OperatorService) {}

  @Get('team')
  async listTeam(@Req() req: any) {
    return { data: await this.operatorService.listTeam(req.user.id) };
  }

  @Post('team')
  async createSubOperator(@Req() req: any, @Body() dto: CreateSubOperatorDto) {
    return { data: await this.operatorService.createSubOperator(req.user.id, dto) };
  }

  @Patch('team/:id')
  async updateSubOperator(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSubOperatorDto,
  ) {
    return { data: await this.operatorService.updateSubOperator(req.user.id, id, dto) };
  }

  @Delete('team/:id')
  deleteSubOperator(@Req() req: any, @Param('id') id: string) {
    return this.operatorService.deleteSubOperator(req.user.id, id);
  }
}
