import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.eventsService.findAll(status, search);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.eventsService.findById(id);
    if (!data) throw new NotFoundException('Evento no encontrado');
    return { data };
  }

  // GET /api/v1/events/:id/parkings
  @Get(':id/parkings')
  async findParkings(@Param('id') id: string) {
    const data = await this.eventsService.findParkings(id);
    return { data };
  }
}
