import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { MemberRank } from '@prisma/client';
import { isRankAtLeast } from '@/common/constants/ranks';

/**
 * Quem pode emitir comunicados/notificações:
 *  - administradores ativos com permissão NOTIFICATIONS.CREATE (ou SUPER_ADMIN);
 *  - oficiais a partir de INSPECTOR (comandantes de unidade).
 *
 * O patamar de patente pode ser ajustado por variável de ambiente
 * NOTIFICATION_MIN_RANK (ex.: SUBINSPECTOR).
 */
export const notificationMinRank = (): MemberRank =>
  (process.env.NOTIFICATION_MIN_RANK as MemberRank) || MemberRank.INSPECTOR;

/** Regra única, usada pelo guard e pelo endpoint de capacidades. */
export function canSendNotifications(user: any): boolean {
  if (!user) return false;
  const isSuperAdmin = user.admin?.adminLevel === 'SUPER_ADMIN';
  const adminCanSend = user.admin?.permissions?.some(
    (p: { module: string; actions: string[] }) => p.module === 'NOTIFICATIONS' && p.actions.includes('CREATE'),
  );
  return !!(isSuperAdmin || adminCanSend || isRankAtLeast(user.memberRank, notificationMinRank()));
}

@Injectable()
export class NotificationSenderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Utilizador não autenticado');
    if (canSendNotifications(user)) return true;
    throw new ForbiddenException('Sem permissão para emitir comunicados');
  }
}
