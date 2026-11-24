import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityLevel } from '@prisma/client';

export const SECURITY_LEVELS_KEY = 'securityLevels';

@Injectable()
export class SecurityLevelGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredLevels = this.reflector.getAllAndOverride<SecurityLevel[]>(
      SECURITY_LEVELS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredLevels || requiredLevels.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Mapear níveis de segurança para valores numéricos
    const securityLevelValues: Record<SecurityLevel, number> = {
      [SecurityLevel.BASICO]: 1,
      [SecurityLevel.INTERMEDIO]: 2,
      [SecurityLevel.ALTO]: 3,
      [SecurityLevel.MAXIMO]: 4,
      [SecurityLevel.ADMINISTRATIVO]: 5,
    };

    const userLevelValue = securityLevelValues[user.securityLevel as SecurityLevel] || 1;
    
    // Verificar se o usuário tem pelo menos um dos níveis requeridos
    const hasRequiredLevel = requiredLevels.some(requiredLevel => {
      const requiredLevelValue = securityLevelValues[requiredLevel];
      return userLevelValue >= requiredLevelValue;
    });

    if (!hasRequiredLevel) {
      const levelsText = requiredLevels.join(' ou ');
      throw new ForbiddenException(
        `Nível de segurança insuficiente. Requerido: ${levelsText}`,
      );
    }

    return true;
  }
}

// Decorator para nível de segurança
export const RequiresSecurityLevel = (...levels: SecurityLevel[]) =>
  SetMetadata(SECURITY_LEVELS_KEY, levels);