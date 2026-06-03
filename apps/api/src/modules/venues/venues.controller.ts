import { Controller, Get, Param, Query } from '@nestjs/common';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private venuesService: VenuesService) {}

  // GET /api/v1/venues?category=conciertos
  @Get()
  async findAll(@Query('category') category?: string) {
    const data = await this.venuesService.findAll(category);
    return { data };
  }

  // GET /api/v1/venues/:id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.venuesService.findById(id);
    return { data };
  }

  // GET /api/v1/venues/:id/events
  @Get(':id/events')
  async findEvents(@Param('id') id: string) {
    const data = await this.venuesService.findEvents(id);
    return { data };
  }
}
