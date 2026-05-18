import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

class CreateReservationDto {
  @IsUUID('all')
  eventId: string;
}

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() dto: CreateReservationDto, @Req() req: any) {
    return this.reservationsService.create(req.user.id, dto.eventId);
  }

  @Get('my')
  @UseGuards(JwtGuard)
  findMine(@Req() req: any) {
    return this.reservationsService.findByUser(req.user.id);
  }

  @Get('event/:eventId')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('operator', 'admin')
  findByEvent(@Param('eventId') eventId: string, @Req() req: any) {
    return this.reservationsService.findByEvent(eventId, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.cancel(id, req.user.id);
  }

  @Get(':id/ticket')
  @UseGuards(JwtGuard)
  async getTicket(@Param('id') id: string, @Req() req: any) {
    const data = await this.reservationsService.getTicket(id, req.user.id);
    return { data };
  }
}
