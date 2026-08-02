import { Module } from '@nestjs/common';
import { CodigoPostalController } from './codigo-postal.controller';
import { CodigoPostalService } from './codigo-postal.service';

@Module({
  controllers: [CodigoPostalController],
  providers: [CodigoPostalService],
})
export class CodigoPostalModule {}
