import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const LAN_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;

/**
 * Configuração HTTP partilhada entre o arranque (main.ts) e os testes e2e,
 * para que os testes exercitem exatamente a mesma pilha de segurança.
 */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService);
  const express = app as NestExpressApplication;
  const isProduction = config.get<boolean>('app.isProduction', false);
  const prefix = config.get<string>('app.prefix', 'api/v1');

  if (config.get<boolean>('app.trustProxy')) {
    // Necessário atrás de Nginx/load balancer para IP real (rate limit, auditoria)
    express.set('trust proxy', 1);
  }
  express.disable('x-powered-by');

  // Cabeçalhos de segurança HTTP
  app.use(helmet());

  // CORS: em produção apenas origens explicitamente autorizadas.
  // (A app móvel nativa não envia Origin, por isso não é afetada.)
  const allowed = config.get<string[]>('cors.origins', []);
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      if (!isProduction && LAN_ORIGIN.test(origin)) return cb(null, true);
      return cb(new Error('Origem não autorizada'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Prefixo e versão: /api/v1/...  (health fica na raiz para orquestradores)
  app.setGlobalPrefix(prefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // Validação global de todos os DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove campos não declarados no DTO (proteção contra mass-assignment)
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      stopAtFirstError: false,
      disableErrorMessages: false,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();

  return app;
}
