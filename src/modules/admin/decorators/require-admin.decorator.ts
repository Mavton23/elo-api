import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
import { AdminAction, AdminModule } from '@prisma/client';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import { AdminPermissions } from './admin-permissions.decorator';

/**
 * Protege uma rota para administradores ativos com a permissão indicada.
 * SUPER_ADMIN tem acesso a tudo.
 *
 * @example @RequireAdmin('HIERARCHY', 'EDIT')
 */
export const RequireAdmin = (module: AdminModule, action: AdminAction) =>
  applyDecorators(
    AdminPermissions([module, action]),
    UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionsGuard),
    ApiBearerAuth(),
    ApiForbiddenResponse({ description: `Requer permissão ${module}.${action}` }),
  );
