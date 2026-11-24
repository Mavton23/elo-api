import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationStatsDto } from '../dto/notification-stats.dto';
import { 
  NotificationCategory, 
  UrgencyLevel 
} from '@prisma/client';

@Injectable()
export class NotificationStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotificationStats(userId: string): Promise<NotificationStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Buscar todas as notificações do usuário
    const notifications = await this.prisma.notificationRecipient.findMany({
      where: { userId },
      include: {
        notification: {
          select: {
            category: true,
            urgency: true,
            requiresConfirmation: true,
            confirmationDeadline: true,
            createdAt: true,
          }
        }
      }
    });

    // Inicializar estatísticas
    const stats: NotificationStatsDto = {
      total: notifications.length,
      unread: 0,
      byCategory: this.initializeCategoryStats(),
      byUrgency: this.initializeUrgencyStats(),
      requiresAction: 0,
      today: 0,
      read: 0,
      archived: 0,
      responded: 0,
    };

    // Calcular estatísticas
    notifications.forEach(({ status, notification }) => {
      // Status
      if (status === 'NAO_LIDA') stats.unread++;
      if (status === 'LIDA') stats.read++;
      if (status === 'ARQUIVADA') stats.archived++;
      if (status === 'RESPONDIDA') stats.responded++;

      // Categoria
      stats.byCategory[notification.category]++;

      // Urgência
      stats.byUrgency[notification.urgency]++;

      // Requer ação
      if (
        notification.requiresConfirmation &&
        status === 'NAO_LIDA' &&
        (!notification.confirmationDeadline || notification.confirmationDeadline > new Date())
      ) {
        stats.requiresAction++;
      }

      // Hoje
      const notificationDate = new Date(notification.createdAt);
      notificationDate.setHours(0, 0, 0, 0);
      if (notificationDate.getTime() === today.getTime()) {
        stats.today++;
      }
    });

    return stats;
  }

  async getSystemNotificationStats() {
    const [
      totalNotifications,
      totalRecipients,
      avgRecipientsPerNotification,
      categoryStats,
      urgencyStats,
    ] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notificationRecipient.count(),
      this.prisma.notification.aggregate({
        // _avg: {
        //   // Contar destinatários por notificação
        //   // Nota: Precisaríamos de uma subquery ou view para isso
        // }
      }),
      this.prisma.notification.groupBy({
        by: ['category'],
        _count: true,
      }),
      this.prisma.notification.groupBy({
        by: ['urgency'],
        _count: true,
      }),
    ]);

    return {
      totalNotifications,
      totalRecipients,
      avgRecipientsPerNotification,
      byCategory: categoryStats.reduce((acc, curr) => {
        acc[curr.category] = curr._count;
        return acc;
      }, {}),
      byUrgency: urgencyStats.reduce((acc, curr) => {
        acc[curr.urgency] = curr._count;
        return acc;
      }, {}),
    };
  }

  private initializeCategoryStats(): Record<NotificationCategory, number> {
    const categories = Object.values(NotificationCategory);
    return categories.reduce((acc, category) => {
      acc[category] = 0;
      return acc;
    }, {} as Record<NotificationCategory, number>);
  }

  private initializeUrgencyStats(): Record<UrgencyLevel, number> {
    const urgencies = Object.values(UrgencyLevel);
    return urgencies.reduce((acc, urgency) => {
      acc[urgency] = 0;
      return acc;
    }, {} as Record<UrgencyLevel, number>);
  }
}