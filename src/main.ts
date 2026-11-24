import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prefix = config.get<string>('app.prefix', 'api/v1');
  const port = config.get<number>('app.port', 3000);

  configureApp(app);

  if (config.get<boolean>('app.enableDocs')) {
    const doc = new DocumentBuilder()
      .setTitle('ELO API')
      .setDescription('Plataforma interna de comunicação e gestão do Ministério do Interior')
      .setVersion(process.env.npm_package_version ?? '1.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${prefix}/docs`, app, SwaggerModule.createDocument(app, doc), {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Documentação: http://localhost:${port}/${prefix}/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`ELO API a correr na porta ${port} (${config.get('app.env')}) — prefixo /${prefix}`);
}

bootstrap();
