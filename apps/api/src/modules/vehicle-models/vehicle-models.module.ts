import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { VehicleModelsService } from './vehicle-models.service';
import { VehicleModelsController } from './vehicle-models.controller';

@Module({
  controllers: [VehicleModelsController],
  providers: [VehicleModelsService],
  exports: [VehicleModelsService],
})
export class VehicleModelsModule implements OnModuleInit {
  private readonly logger = new Logger(VehicleModelsModule.name);

  constructor(private readonly svc: VehicleModelsService) {}

  async onModuleInit() {
    try {
      // 1. Seed de modelos México (idempotente — siempre corre)
      const seeded = await this.svc.seedMexico();
      if (seeded > 0) this.logger.log(`Seed México: +${seeded} modelos insertados`);

      // 2. Si no hay modelos de NHTSA, lanzar sync en background
      const { byCategory } = await this.svc.count();
      const hasNhtsa = Object.values(byCategory).reduce((a, b) => a + b, 0) > 200;

      if (!hasNhtsa) {
        this.logger.log('Lanzando sync inicial desde NHTSA vPIC API...');
        this.svc.syncFromNhtsa()
          .then(r => this.logger.log(`Sync NHTSA completado → +${r.added} modelos nuevos`))
          .catch(e => this.logger.error('Sync NHTSA falló:', e?.message));
      } else {
        const { total, byCategory: bc } = await this.svc.count();
        this.logger.log(
          `vehicle_models: ${total} modelos (Auto:${bc['Auto'] ?? 0} Sub:${bc['Sub'] ?? 0} PickUp:${bc['Pick Up'] ?? 0} Moto:${bc['Moto'] ?? 0})`,
        );
      }
    } catch (e) {
      this.logger.error('Error en VehicleModelsModule.onModuleInit:', (e as Error).message);
    }
  }
}
