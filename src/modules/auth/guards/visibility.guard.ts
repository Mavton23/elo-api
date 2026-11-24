import { rankValue } from '@/common/constants/ranks';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VisibilityLevel, MemberRank } from '@prisma/client';

export const VISIBILITY_KEY = 'visibility';

@Injectable()
export class VisibilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredVisibility = this.reflector.getAllAndOverride<VisibilityLevel>(
      VISIBILITY_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredVisibility) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const post = request.body || request.params || request.query;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Verificar se o usuário pode acessar conteúdo com esta visibilidade
    const canAccess = this.canUserAccessVisibility(user, requiredVisibility, post);

    if (!canAccess) {
      throw new ForbiddenException(
        `Acesso não autorizado para conteúdo com visibilidade: ${requiredVisibility}`,
      );
    }

    return true;
  }

  private canUserAccessVisibility(
    user: any,
    visibility: VisibilityLevel,
    post?: any,
  ): boolean {
    switch (visibility) {
      case VisibilityLevel.PUBLICO:
        return true;

      case VisibilityLevel.DEPARTAMENTO:
        return user.department === (post?.author?.department || post?.department);

      case VisibilityLevel.PATENTE_OU_MAIOR:
      {
        const authorRank = post?.author?.memberRank ?? post?.author?.rank;
        if (!authorRank) return false;
        return rankValue(user.memberRank ?? user.rank) >= rankValue(authorRank);
      }

      case VisibilityLevel.UNIDADE:
        return user.unit === (post?.author?.unit || post?.unit);

      case VisibilityLevel.RESTRITO:
        return user.securityLevel === 'ALTO' || user.securityLevel === 'MAXIMO';

      default:
        return false;
    }
  }
}

// Decorator para visibilidade
export const RequiresVisibility = (visibility: VisibilityLevel) =>
  SetMetadata(VISIBILITY_KEY, visibility);