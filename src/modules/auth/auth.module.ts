import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './services/auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { CommunicationModule } from '../communication/communication.module';
import { SettingsModule } from '../settings/settings.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { AuthUserLoader } from './services/auth-user-loader.service';
import { MfaService } from './services/mfa.service';

@Module({
  imports: [
    PrismaModule,
    CommunicationModule,
    forwardRef(() => SettingsModule),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: configService.get<string>('jwt.expiration', '15m') as any,
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    JwtStrategy,
    RefreshTokenStrategy,
    AuthUserLoader,
    MfaService,
    WsJwtGuard,
  ],
  exports: [AuthService, TwoFactorService, AuthUserLoader, MfaService, JwtModule, WsJwtGuard, PassportModule],
})
export class AuthModule {}