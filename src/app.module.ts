import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { PolicyModule } from './common/policy/policy.module';
import { MaintenanceInterceptor } from './common/policy/maintenance.interceptor';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { PrismaModule } from './modules/prisma/prisma.module';
import { MediaCloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AuthModule } from './modules/auth/auth.module';
import { MembersModule } from './modules/members/members.module';
import { SocialModule } from './modules/social/social.module';
import { HierarchyModule } from './modules/hierarchy/hierarchy.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AdminModule } from './modules/admin/admin.module';
import { HelpModule } from './modules/help/help.module';
import { AboutModule } from './modules/about/about.module';
import { MemberServicesModule } from './modules/member-services/member-services.module';
import { TestModule } from './modules/test/test.module';

// Módulo de testes/seed só existe fora de produção
const devOnlyModules = process.env.NODE_ENV === 'production' ? [] : [TestModule];

@Module({
  imports: [
    PolicyModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),

    // Limite de pedidos por IP (proteção contra força bruta e abuso)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('throttle.ttlMs', 60_000),
            limit: config.get<number>('throttle.limit', 120),
          },
        ],
        // Só os testes automáticos podem desligar o limite
        skipIf: () =>
          process.env.NODE_ENV === 'test' && process.env.THROTTLE_DISABLED === 'true',
      }),
    }),

    PrismaModule,
    MediaCloudinaryModule,
    CommunicationModule,
    AuthModule,
    MembersModule,
    SocialModule,
    HierarchyModule,
    NotificationsModule,
    SettingsModule,
    AdminModule,
    HelpModule,
    AboutModule,
    MemberServicesModule,
    ...devOnlyModules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MaintenanceInterceptor },
  ],
})
export class AppModule {}
