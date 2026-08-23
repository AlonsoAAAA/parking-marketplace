import { Controller, Get, Param } from '@nestjs/common';
import { CodigoPostalService } from './codigo-postal.service';

@Controller('codigo-postal')
export class CodigoPostalController {
  constructor(private readonly svc: CodigoPostalService) {}

  /** GET /api/v1/codigo-postal/:cp */
  @Get(':cp')
  async lookup(@Param('cp') cp: string) {
    const data = await this.svc.lookup(cp);
    return { data };
  }
}
