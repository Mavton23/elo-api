import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRank } from '@prisma/client';
import { isRankAtLeast } from '@/common/constants/ranks';

export const RANKS_KEY = 'ranks';

/**
 * Exige que o utilizador tenha pelo menos UMA das patentes indicadas
 * (ou superior). Ex.: @RequiresRank(MemberRank.INSPECTOR)
 */
@Injectable()
export class RankGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRanks = this.reflector.getAllAndOverride<MemberRank[]>(RANKS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRanks?.length) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Utilizador não autenticado');

    const ok = requiredRanks.some((min) => isRankAtLeast(user.memberRank ?? user.rank, min));
    if (!ok) {
      throw new ForbiddenException(
        `Acesso restrito. Patente mínima requerida: ${requiredRanks.join(' ou ')}`,
      );
    }
    return true;
  }
}

export const RequiresRank = (...ranks: MemberRank[]) => SetMetadata(RANKS_KEY, ranks);
