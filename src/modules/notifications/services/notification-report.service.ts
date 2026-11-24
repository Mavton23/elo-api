import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

const isConfirmation = (r: { status: NotificationStatus; response: string | null }) =>
  r.status === 'RESPONDIDA' && (r.response ?? '').toUpperCase() !== 'NEGADO';

/**
 * Visão do emissor: o que enviou e quem leu/confirmou. É o que dá valor
 * à "confirmação de leitura" — o comando sabe exatamente quem tomou conhecimento.
 */
@Injectable()
export class NotificationReportService {
  constructor(private readonly prisma: PrismaService) {}

  async sent(userId: string, page = 1, limit = 20) {
    const where = { senderId: userId, NOT: { category: 'SEGURANCA' as const, recipients: { every: { userId } } } };
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, category: true, urgency: true, sentAt: true,
          requiresConfirmation: true, confirmationDeadline: true,
          recipients: { select: { status: true, response: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      items: rows.map(({ recipients, ...n }) => ({ ...n, stats: this.stats(recipients) })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async report(notificationId: string, viewer: { id: string; isAdmin?: boolean }) {
    const n = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true, title: true, message: true, category: true, urgency: true, sentAt: true, senderId: true,
        requiresConfirmation: true, confirmationDeadline: true,
        targetDepartments: true, targetRanks: true, targetProvinces: true,
        recipients: {
          select: {
            status: true, readAt: true, respondedAt: true, response: true,
            user: { select: { id: true, fullName: true, memberRank: true, department: true, unit: true, province: true } },
          },
        },
      },
    });
    if (!n) throw new NotFoundException('Comunicado não encontrado');
    if (n.senderId !== viewer.id && !viewer.isAdmin) throw new ForbiddenException('Só o emissor pode ver o relatório de leitura');

    const order = (r: (typeof n.recipients)[number]) => (r.status === 'NAO_LIDA' ? 0 : isConfirmation(r) ? 3 : r.status === 'RESPONDIDA' ? 1 : 2);
    const { recipients, senderId, ...rest } = n;
    return {
      ...rest,
      stats: this.stats(recipients),
      recipients: [...recipients]
        .sort((a, b) => order(a) - order(b) || a.user.fullName.localeCompare(b.user.fullName))
        .map((r) => ({ ...r, confirmed: isConfirmation(r) })),
    };
  }

  private stats(rs: { status: NotificationStatus; response: string | null }[]) {
    const total = rs.length;
    const unread = rs.filter((r) => r.status === 'NAO_LIDA').length;
    const confirmed = rs.filter(isConfirmation).length;
    const declined = rs.filter((r) => r.status === 'RESPONDIDA' && !isConfirmation(r)).length;
    return { total, read: total - unread, unread, confirmed, declined };
  }
}
