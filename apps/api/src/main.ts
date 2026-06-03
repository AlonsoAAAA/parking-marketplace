import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Necesario para verificar firma de webhooks de Stripe
  });

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Permite embeds de Stripe
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://js.stripe.com'],
          frameSrc: ["'self'", 'https://js.stripe.com'],
          connectSrc: ["'self'", 'https://api.stripe.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  // ── Body parser con límite y rawBody para Stripe webhooks ───────────────────
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // ── CORS — sólo orígenes explícitos ─────────────────────────────────────────
  const allowedOrigins = [
    process.env.MARKETPLACE_URL || 'http://localhost:3001',
    process.env.ADMIN_URL       || 'http://localhost:3002',
    // Dominio de producción se agrega via env vars al desplegar
    ...(process.env.PRODUCTION_URL ? [process.env.PRODUCTION_URL] : []),
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // Permitir requests sin origin (mobile apps, Postman, cURL interno)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origen no permitido → ${origin}`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Validación global de DTOs ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Elimina campos no declarados en el DTO
      transform: true,
      forbidNonWhitelisted: true, // Lanza error si llegan campos extra
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  if (process.env.NODE_ENV !== 'production') {
    console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
  }
}

bootstrap();
