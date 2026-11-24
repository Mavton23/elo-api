import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { AuthUser, JwtPayload } from '../types/user.types';

/**
 * Converte um payload JWT válido no utilizador atual, verificando que:
 *  - a conta existe e está ativa;
 *  - o token não foi revogado (tokenVersion);
 *  - a conta não está bloqueada.
 */
@Injectable()
export class AuthUserLoader {
  constructor(private readonly prisma: PrismaService) {}

  async load(payload: JwtPayload, expectedType: JwtPayload['typ']): Promise<AuthUser> {
    if (!payload?.sub || payload.typ !== expectedType) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        mustChangePassword: true,
        nip: true,
        fullName: true,
        memberRank: true,
        department: true,
        unit: true,
        province: true,
        currentPosition: true,
        securityLevel: true,
        isActive: true,
        lockedUntil: true,
        tokenVersion: true,
        adminProfile: {
          select: {
            adminLevel: true,
            adminStatus: true,
            permissions: { select: { module: true, actions: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessão inválida');
    }
    if ((payload.tv ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Sessão expirada. Inicie sessão novamente.');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Conta temporariamente bloqueada');
    }

    const admin = user.adminProfile?.adminStatus === 'ACTIVE' ? user.adminProfile : null;

    return {
      id: user.id,
      nip: user.nip,
      fullName: user.fullName,
      memberRank: user.memberRank,
      rank: user.memberRank,
      department: user.department,
      unit: user.unit,
      province: user.province,
      currentPosition: user.currentPosition,
      securityLevel: user.securityLevel,
      mustChangePassword: user.mustChangePassword,
      isAdmin: !!admin,
      adminLevel: admin?.adminLevel,
      admin: admin
        ? {
            isAdmin: true,
            adminLevel: admin.adminLevel,
            permissions: admin.permissions.map((p) => ({ module: p.module, actions: p.actions })),
          }
        : { isAdmin: false },
    };
  }
}
