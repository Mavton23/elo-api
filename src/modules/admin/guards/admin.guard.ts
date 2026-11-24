import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Garante que o utilizador autenticado tem um perfil de administrador ATIVO. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Utilizador não autenticado');

    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId: user.id },
      include: { permissions: true },
    });

    if (!adminProfile || adminProfile.adminStatus !== 'ACTIVE') {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    // Atualiza a última atividade sem bloquear o pedido
    this.prisma.adminProfile
      .update({ where: { id: adminProfile.id }, data: { lastAdminActivity: new Date() } })
      .catch(() => undefined);

    request.adminProfile = adminProfile;
    return true;
  }
}
