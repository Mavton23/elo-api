import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Rotas permitidas enquanto a senha temporária não for trocada. */
const ALLOWED_WITH_TEMP_PASSWORD = [/\/auth\/password$/, /\/auth\/me$/, /\/auth\/logout$/, /\/auth\/session\/status$/];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Não autorizado');
    }
    if (user.mustChangePassword) {
      const path: string = context.switchToHttp().getRequest().path ?? '';
      if (!ALLOWED_WITH_TEMP_PASSWORD.some((r) => r.test(path))) {
        throw new ForbiddenException({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Defina uma nova senha antes de continuar.' });
      }
    }
    return user;
  }
}
