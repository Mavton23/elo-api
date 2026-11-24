import { isRankAtLeast, rankValue } from '@/common/constants/ranks';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRank, Department, SecurityLevel } from '@prisma/client';

export interface HierarchyAccess {
  minRank?: MemberRank;
  departments?: Department[];
  securityLevels?: SecurityLevel[];
  units?: string[];
  provinces?: string[];
}

export const HIERARCHY_ACCESS_KEY = 'hierarchyAccess';

@Injectable()
export class HierarchyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const access = this.reflector.getAllAndOverride<HierarchyAccess>(
      HIERARCHY_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!access) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // 1. Verificar patente mínima
    if (access.minRank) {
      if (!isRankAtLeast(user.memberRank ?? user.rank, access.minRank)) {
        throw new ForbiddenException(
          `Patente insuficiente. Mínima requerida: ${access.minRank}`,
        );
      }
    }

    // 2. Verificar departamento
    if (access.departments && access.departments.length > 0) {
      if (!access.departments.includes(user.department as Department)) {
        throw new ForbiddenException(
          `Departamento não autorizado. Seu departamento: ${user.department}`,
        );
      }
    }

    // 3. Verificar nível de segurança
    if (access.securityLevels && access.securityLevels.length > 0) {
      const securityLevelValues: Record<SecurityLevel, number> = {
        [SecurityLevel.BASICO]: 1,
        [SecurityLevel.INTERMEDIO]: 2,
        [SecurityLevel.ALTO]: 3,
        [SecurityLevel.MAXIMO]: 4,
        [SecurityLevel.ADMINISTRATIVO]: 4,
      };

      const userLevelValue = securityLevelValues[user.securityLevel as SecurityLevel] || 1;
      const hasRequiredLevel = access.securityLevels.some(level => {
        const requiredLevelValue = securityLevelValues[level];
        return userLevelValue >= requiredLevelValue;
      });

      if (!hasRequiredLevel) {
        throw new ForbiddenException('Nível de segurança insuficiente');
      }
    }

    // 4. Verificar unidade
    if (access.units && access.units.length > 0) {
      if (!access.units.includes(user.unit)) {
        throw new ForbiddenException(
          `Unidade não autorizada. Sua unidade: ${user.unit}`,
        );
      }
    }

    // 5. Verificar província
    if (access.provinces && access.provinces.length > 0) {
      if (!access.provinces.includes(user.province)) {
        throw new ForbiddenException(
          `Província não autorizada. Sua província: ${user.province}`,
        );
      }
    }

    return true;
  }
}

// Decorator para acesso hierárquico
export const RequiresHierarchyAccess = (access: HierarchyAccess) =>
  SetMetadata(HIERARCHY_ACCESS_KEY, access);