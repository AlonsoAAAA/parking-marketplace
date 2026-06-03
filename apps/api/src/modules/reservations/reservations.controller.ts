import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  parkingId?: string;
}

class VehicleDto {
  @IsString() @IsNotEmpty() plate: string;
  @IsString() @IsNotEmpty() make: string;
  @IsString() @IsNotEmpty() model: string;
  @IsIn(['Auto', 'Sub', 'Pick Up', 'Moto']) type: string;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() dto: CreateReservationDto, @Req() req: any) {
    return this.reservationsService.create(req.user.id, dto.eventId, dto.parkingId);
  }

  @Get('my')
  @UseGuards(JwtGuard)
  findMine(@Req() req: any) {
    return this.reservationsService.findByUser(req.user.id);
  }

  @Get('event/:eventId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('operator', 'sub_operator', 'sub_admin', 'admin')
  findByEvent(@Param('eventId') eventId: string, @Req() req: any) {
    return this.reservationsService.findByEvent(eventId, req.user.id);
  }

  @Patch(':id/vehicle')
  @UseGuards(JwtGuard)
  saveVehicle(@Param('id') id: string, @Body() dto: VehicleDto, @Req() req: any) {
    return this.reservationsService.saveVehicle(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.cancel(id, req.user.id);
  }

  @Get(':id/pricing')
  async getPricing(@Param('id') id: string) {
    return this.reservationsService.getPricing(id);
  }

  @Get(':id/ticket')
  @UseGuards(JwtGuard)
  async getTicket(@Param('id') id: string, @Req() req: any) {
    const data = await this.reservationsService.getTicket(id, req.user.id);
    return { data };
  }
}
