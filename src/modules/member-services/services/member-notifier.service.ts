import { Injectable, Logger } from '@nestjs/common';
import { NotificationCategory, UrgencyLevel } from '@prisma/client';
import { PrismaService } from '@/modules/prisma/prisma.service';

/** Notificação individual ao efetivo sobre o resultado de um pedido. */
@Injectable()
export class MemberNotifier {
  private readonly logger = new Logger(MemberNotifier.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(params: {
    senderId: string;
    userId: string;
    title: string;
    message: string;
    urgency?: UrgencyLevel;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          title: params.title.slice(0, 200),
          message: params.message,
          category: NotificationCategory.ADMINISTRATIVO,
          urgency: params.urgency ?? UrgencyLevel.MEDIA,
          senderId: params.senderId,
          recipients: { create: [{ userId: params.userId }] },
        },
      });
    } catch (e) {
      // A decisão já foi gravada; a notificação é um extra
      this.logger.error('Falha ao notificar efetivo', e as Error);
    }
  }
}
