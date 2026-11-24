import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUserLoader } from '../services/auth-user-loader.service';
import type { JwtPayload } from '../types/user.types';

const extractRefreshToken = (req: Request): string | null => {
  const fromBody = (req.body as any)?.refreshToken;
  if (typeof fromBody === 'string' && fromBody) return fromBody;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly loader: AuthUserLoader,
  ) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const user = await this.loader.load(payload, 'refresh');
    return { ...user, refreshToken: extractRefreshToken(req) };
  }
}
