import { Module } from '@nestjs/common';
import { ParkingsService } from './parkings.service';

@Module({
  providers: [ParkingsService],
  exports: [ParkingsService],
})
export class ParkingsModule {}
