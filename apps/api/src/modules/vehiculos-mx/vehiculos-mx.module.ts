import { Module } from '@nestjs/common';
import { VehiculosMxService } from './vehiculos-mx.service';
import { VehiculosMxController } from './vehiculos-mx.controller';

@Module({
  controllers: [VehiculosMxController],
  providers:   [VehiculosMxService],
  exports:     [VehiculosMxService],   // exportado para que ReservationsModule lo use
})
export class VehiculosMxModule {}
