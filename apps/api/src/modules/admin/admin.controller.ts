import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsBoolean,
  IsIn, IsDateString, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdminService } from './admin.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class CreateVenueDto {
  @IsString() @MaxLength(200) name: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() @Type(() => Number) capacity?: number;
}

class UpdateVenueDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() @Type(() => Number) capacity?: number;
}

class CreateParkingDto {
  @IsString() @MaxLength(150) name: string;
  @IsString() address: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsNumber() @Type(() => Number) lat?: number;
  @IsOptional() @IsNumber() @Type(() => Number) lng?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) totalCapacity?: number;
}

class UpdateParkingDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) totalCapacity?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() ownerId?: string;
}

class CreateEventDto {
  @IsString() parkingId: string;
  @IsString() @MaxLength(200) name: string;
  @IsString() venueName: string;
  @IsDateString() startsAt: string;
  @IsDateString() endsAt: string;
  @IsNumber() @Type(() => Number) price: number;
  @IsNumber() @Min(1) @Type(() => Number) totalSlots: number;
  @IsOptional() @IsIn(['draft', 'active', 'sold_out', 'finished']) status?: string;
}

class UpdateEventDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() venueName?: string;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsNumber() @Type(() => Number) price?: number;
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) totalSlots?: number;
  @IsOptional() @IsIn(['draft', 'active', 'sold_out', 'finished']) status?: string;
  @IsOptional() @IsString() parkingId?: string;
}

class CreateClaimDto {
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() reservationId?: string;
  @IsString() @MaxLength(300) subject: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateClaimDto {
  @IsOptional() @IsIn(['open', 'in_progress', 'resolved']) status?: string;
  @IsOptional() @IsString() adminNotes?: string;
}

class CreatePromotionDto {
  @IsString() @MaxLength(50) code: string;
  @IsIn(['percent', 'fixed']) type: string;
  @IsNumber() @Min(0) @Type(() => Number) value: number;
  @IsOptional() @IsString() eventId?: string;
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
}

class UpdatePromotionDto {
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsIn(['percent', 'fixed']) type?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) value?: number;
  @IsOptional() @IsString() eventId?: string;
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number) maxUses?: number;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Metrics
  @Get('metrics')
  async getMetrics() {
    return { data: await this.adminService.getMetrics() };
  }

  // Venues
  @Get('venues')
  async listVenues() {
    return { data: await this.adminService.listVenues() };
  }

  @Post('venues')
  async createVenue(@Body() dto: CreateVenueDto) {
    return { data: await this.adminService.createVenue(dto as any) };
  }

  @Patch('venues/:id')
  async updateVenue(@Param('id') id: string, @Body() dto: UpdateVenueDto) {
    return { data: await this.adminService.updateVenue(id, dto) };
  }

  @Delete('venues/:id')
  deleteVenue(@Param('id') id: string) {
    return this.adminService.deleteVenue(id);
  }

  // Parkings
  @Get('parkings')
  async listParkings() {
    return { data: await this.adminService.listParkings() };
  }

  @Post('parkings')
  async createParking(@Body() dto: CreateParkingDto) {
    return { data: await this.adminService.createParking(dto as any) };
  }

  @Patch('parkings/:id')
  async updateParking(@Param('id') id: string, @Body() dto: UpdateParkingDto) {
    return { data: await this.adminService.updateParking(id, dto) };
  }

  @Delete('parkings/:id')
  deleteParking(@Param('id') id: string) {
    return this.adminService.deleteParking(id);
  }

  // Events
  @Get('events')
  async listEvents(@Query('status') status?: string) {
    return { data: await this.adminService.listEvents(status) };
  }

  @Post('events')
  async createEvent(@Body() dto: CreateEventDto) {
    return { data: await this.adminService.createEvent(dto as any) };
  }

  @Patch('events/:id')
  async updateEvent(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return { data: await this.adminService.updateEvent(id, dto) };
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }

  // Users
  @Get('users')
  async listUsers(@Query('search') search?: string) {
    return { data: await this.adminService.listUsers(search) };
  }

  // Claims
  @Get('claims')
  async listClaims(@Query('status') status?: string) {
    return { data: await this.adminService.listClaims(status) };
  }

  @Get('claims/:id')
  async getClaim(@Param('id') id: string) {
    return { data: await this.adminService.getClaim(id) };
  }

  @Post('claims')
  async createClaim(@Body() dto: CreateClaimDto) {
    return { data: await this.adminService.createClaim(dto as any) };
  }

  @Patch('claims/:id')
  async updateClaim(@Param('id') id: string, @Body() dto: UpdateClaimDto) {
    return { data: await this.adminService.updateClaim(id, dto) };
  }

  @Delete('claims/:id')
  deleteClaim(@Param('id') id: string) {
    return this.adminService.deleteClaim(id);
  }

  // Promotions
  @Get('promotions')
  async listPromotions() {
    return { data: await this.adminService.listPromotions() };
  }

  @Post('promotions')
  async createPromotion(@Body() dto: CreatePromotionDto) {
    return { data: await this.adminService.createPromotion(dto as any) };
  }

  @Patch('promotions/:id')
  async updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return { data: await this.adminService.updatePromotion(id, dto) };
  }

  @Delete('promotions/:id')
  deletePromotion(@Param('id') id: string) {
    return this.adminService.deletePromotion(id);
  }

  // Payments (read-only)
  @Get('payments')
  async listPayments(@Query('status') status?: string) {
    return { data: await this.adminService.listPayments(status) };
  }
}
