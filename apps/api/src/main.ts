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
  // 10mb cubre hasta 5 fotos de evidencia de reembolso en base64 (~3.5mb c/u máx).
  app.use(
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3002',
    'https://estacionat.mx',
    'https://www.estacionat.mx',
    // Vercel preview URLs
    /https:\/\/estacionat-marketplace.*\.vercel\.app$/,
    // Env-var overrides (para otros dominios en el futuro)
    ...(process.env.MARKETPLACE_URL  ? [process.env.MARKETPLACE_URL]  : []),
    ...(process.env.ADMIN_URL        ? [process.env.ADMIN_URL]        : []),
    ...(process.env.PRODUCTION_URL   ? [process.env.PRODUCTION_URL]   : []),
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, cb) => {
      // Permitir requests sin origin (SSR de Next.js, Postman, apps móviles)
      if (!origin) return cb(null, true);
      const allowed = allowedOrigins.some(o =>
        typeof o === 'string' ? o === origin : (o as RegExp).test(origin),
      );
      if (allowed) return cb(null, true);
      // En producción logueamos el intento; nunca tiramos 500
      console.warn(`CORS rechazado: ${origin}`);
      cb(null, false);
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
