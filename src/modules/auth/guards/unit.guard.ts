import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface UnitAccess {
  units?: string[];
  provinces?: string[];
}

export const UNIT_ACCESS_KEY = 'unitAccess';

@Injectable()
export class UnitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const unitAccess = this.reflector.getAllAndOverride<UnitAccess>(
      UNIT_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!unitAccess || (!unitAccess.units && !unitAccess.provinces)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar acesso por unidade
    if (unitAccess.units && unitAccess.units.length > 0) {
      if (!unitAccess.units.includes(user.unit)) {
        throw new ForbiddenException(
          `Acesso restrito à unidade. Sua unidade: ${user.unit}`,
        );
      }
    }

    // Verificar acesso por província
    if (unitAccess.provinces && unitAccess.provinces.length > 0) {
      if (!unitAccess.provinces.includes(user.province)) {
        throw new ForbiddenException(
          `Acesso restrito à província. Sua província: ${user.province}`,
        );
      }
    }

    return true;
  }
}

// Decorator para acesso por unidade/província
export const RequiresUnitAccess = (unitAccess: UnitAccess) =>
  SetMetadata(UNIT_ACCESS_KEY, unitAccess);