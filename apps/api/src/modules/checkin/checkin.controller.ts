import { Controller, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { JwtGuard, RolesGuard } from '../auth/guards/guards';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('checkin')
@UseGuards(JwtGuard, RolesGuard)
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  @Post(':reservationId')
  @Roles('operator', 'admin')
  create(
    @Param('reservationId') reservationId: string,
    @Body() dto: CreateCheckinDto,
    @Request() req: any,
  ) {
    return this.checkinService.createCheckin(reservationId, dto, req.user.sub);
  }
}
