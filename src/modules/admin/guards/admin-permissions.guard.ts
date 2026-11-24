import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminModule, AdminAction } from '@prisma/client';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const adminProfile = request.adminProfile;
    
    if (!adminProfile) {
      throw new ForbiddenException('Perfil admin não encontrado');
    }

    // Obter permissões requeridas do decorator
    const requiredPermissions = this.reflector.get<[AdminModule, AdminAction]>(
      'admin-permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true; // Se não há permissões específicas requeridas
    }

    const [requiredModule, requiredAction] = requiredPermissions;

    // Verificar se SUPER_ADMIN tem acesso total
    if (adminProfile.adminLevel === 'SUPER_ADMIN') {
      return true;
    }

    // Verificar permissões específicas
    const hasPermission = await this.checkPermission(
      adminProfile.id,
      requiredModule,
      requiredAction,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permissão necessária: ${requiredModule}.${requiredAction}`,
      );
    }

    return true;
  }

  private async checkPermission(
    adminProfileId: string,
    module: AdminModule,
    action: AdminAction,
  ): Promise<boolean> {
    const permission = await this.prisma.adminPermission.findFirst({
      where: {
        adminProfileId,
        module,
        actions: {
          has: action,
        },
      },
    });

    return !!permission;
  }
}