import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ParkingsModule } from './modules/parkings/parkings.module';
import { EventsModule } from './modules/events/events.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QrModule } from './modules/qr/qr.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { OperatorModule } from './modules/operator/operator.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { VenuesModule } from './modules/venues/venues.module';
import { VehicleModelsModule } from './modules/vehicle-models/vehicle-models.module';
import { VehiculosMxModule } from './modules/vehiculos-mx/vehiculos-mx.module';
import { PricingModule }    from './modules/pricing/pricing.module';
import { WhatsAppModule }   from './modules/whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ── Rate limiting global ──────────────────────────────────────────────────
    // Default: 60 req / 60s por IP. Los endpoints de auth tienen su propio límite.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    ParkingsModule,
    EventsModule,
    ReservationsModule,
    PaymentsModule,
    QrModule,
    NotificationsModule,
    AdminModule,
    OperatorModule,
    FraudModule,
    CheckinModule,
    VenuesModule,
    VehicleModelsModule,
    VehiculosMxModule,
    PricingModule,
    WhatsAppModule,
  ],
  providers: [
    // Aplica ThrottlerGuard globalmente a todos los endpoints
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
