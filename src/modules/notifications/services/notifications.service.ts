import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationFiltersDto } from '../dto/notification-filters.dto';
import { MarkNotificationDto } from '../dto/mark-notification.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { NotificationStatsDto } from '../dto/notification-stats.dto';
import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationStatus,
  Prisma 
} from '@prisma/client';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationStatsService } from './notification-stats.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import type { User } from '@/modules/auth/types/user.types';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryService: NotificationDeliveryService,
    private readonly statsService: NotificationStatsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(
    createNotificationDto: CreateNotificationDto, 
    senderId: string
  ): Promise<NotificationResponseDto> {
    // 1. Buscar dados do remetente
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        fullName: true,
        memberRank: true,
        department: true,
        unit: true,
      },
    });

    if (!sender) {
      throw new NotFoundException('Remetente não encontrado');
    }

    // 2. Criar notificação
    const notification = await this.prisma.notification.create({
      data: {
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        category: createNotificationDto.category,
        urgency: createNotificationDto.urgency,
        senderId: sender.id,
        requiresConfirmation: createNotificationDto.requiresConfirmation || false,
        confirmationDeadline: createNotificationDto.confirmationDeadline 
          ? new Date(createNotificationDto.confirmationDeadline) 
          : null,
        expiresAt: createNotificationDto.expiresAt 
          ? new Date(createNotificationDto.expiresAt) 
          : null,
        availableActions: createNotificationDto.availableActions || ['VER_DETALHES'],
        targetDepartments: createNotificationDto.targetDepartments || [],
        targetRanks: createNotificationDto.targetRanks || [],
        targetProvinces: createNotificationDto.targetProvinces || [],
        attachments: createNotificationDto.attachments 
          ? {
              create: createNotificationDto.attachments.map(att => ({
                type: att.type,
                url: att.url,
                name: att.name || 'Anexo',
                size: att.size,
              }))
            }
          : undefined,
      },
      include: {
        attachments: true,
        sender: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          }
        }
      }
    });

    // 3. Processar destinatários
    const recipients = await this.deliveryService.calculateAndCreateRecipients(
      notification.id,
      {
        targetDepartments: createNotificationDto.targetDepartments,
        targetRanks: createNotificationDto.targetRanks,
        targetProvinces: createNotificationDto.targetProvinces,
        specificUsers: createNotificationDto.specificUsers,
        excludeUserId: senderId,
      }
    );

    // 4. Enviar notificações em tempo real
    await this.notificationsGateway.sendToRecipients(notification, recipients);

    // 5. Retornar notificação formatada
    return this.formatNotificationResponse(notification, recipients.length);
  }

  async getUserNotifications(
    userId: string,
    filters: NotificationFiltersDto
  ): Promise<{ notifications: NotificationResponseDto[]; total: number }> {
    const page = parseInt(filters.page?.toString() || '1', 10);
    const limit = parseInt(filters.limit?.toString() || '20', 10);

    const where = this.buildUserNotificationsWhere(userId, filters);
    
    const [notifications, total] = await Promise.all([
      this.prisma.notificationRecipient.findMany({
        where,
        include: {
          notification: {
            include: {
              sender: {
                select: {
                  id: true,
                  fullName: true,
                  memberRank: true,
                  department: true,
                  unit: true,
                }
              },
              attachments: true,
            }
          }
        },
        orderBy: this.getOrderBy(filters.orderBy),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationRecipient.count({ where }),
    ]);

    const formattedNotifications = notifications.map(recipient => 
      this.formatNotificationResponse(recipient.notification, undefined, recipient)
    );

    return {
      notifications: formattedNotifications,
      total,
    };
  }

  async getNotificationById(
    notificationId: string, 
    userId: string
  ): Promise<NotificationResponseDto> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId,
        userId,
      },
      include: {
        notification: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
                department: true,
                unit: true,
              }
            },
            attachments: true,
          }
        }
      }
    });

    if (!recipient) {
      throw new NotFoundException('Notificação não encontrada');
    }

    // Marcar como lida se ainda não estiver
    if (recipient.status === 'NAO_LIDA') {
      await this.markAsReadInternal(notificationId, userId);
    }

    return this.formatNotificationResponse(
      recipient.notification, 
      undefined, 
      recipient
    );
  }

  async markNotification(
    notificationId: string,
    userId: string,
    markDto: MarkNotificationDto
  ): Promise<NotificationResponseDto> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId,
        userId,
      },
    });

    if (!recipient) {
      throw new NotFoundException('Notificação não encontrada');
    }

    // Validar transições de status
    this.validateStatusTransition(recipient.status, markDto.status);

    const updatedRecipient = await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: {
        status: markDto.status,
        readAt: markDto.status === 'LIDA' ? new Date() : recipient.readAt,
        respondedAt: markDto.status === 'RESPONDIDA' ? new Date() : recipient.respondedAt,
        response: markDto.response,
      },
      include: {
        notification: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
                department: true,
                unit: true,
              }
            },
            attachments: true,
          }
        }
      }
    });

    // Emitir evento WebSocket
    this.notificationsGateway.emitNotificationUpdate(
      userId, 
      updatedRecipient.notificationId, 
      markDto.status
    );

    return this.formatNotificationResponse(
      updatedRecipient.notification, 
      undefined, 
      updatedRecipient
    );
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notificationRecipient.updateMany({
      where: {
        userId,
        status: 'NAO_LIDA',
      },
      data: {
        status: 'LIDA',
        readAt: new Date(),
      },
    });

    // Emitir evento para atualizar frontend
    this.notificationsGateway.emitAllRead(userId);

    return { count: result.count };
  }

  async getNotificationStats(userId: string): Promise<NotificationStatsDto> {
    return this.statsService.getUserNotificationStats(userId);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    // Verificar se o usuário é o remetente
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { senderId: true },
    });

    if (!notification) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (notification.senderId !== userId) {
      throw new ForbiddenException('Apenas o remetente pode excluir esta notificação');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  private async markAsReadInternal(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notificationRecipient.updateMany({
      where: {
        notificationId,
        userId,
        status: 'NAO_LIDA',
      },
      data: {
        status: 'LIDA',
        readAt: new Date(),
      },
    });
  }

  private buildUserNotificationsWhere(
    userId: string,
    filters: NotificationFiltersDto
  ): Prisma.NotificationRecipientWhereInput {
    const where: Prisma.NotificationRecipientWhereInput = {
      userId,
      ...(filters.status && { status: filters.status }),
      ...(filters.unreadOnly && { status: 'NAO_LIDA' }),
    };

    // Adicionar filtros da notificação relacionada
    if (filters.category || filters.urgency || filters.requiresAction) {
      where.notification = {};
      
      if (filters.category) {
        where.notification.category = filters.category;
      }
      
      if (filters.urgency) {
        where.notification.urgency = filters.urgency;
      }
      
      if (filters.requiresAction) {
        where.notification.requiresConfirmation = true;
        where.notification.confirmationDeadline = {
          gt: new Date(),
        };
      }
    }

    // Filtro por data
    if (filters.startDate || filters.endDate) {
      where.notification = where.notification || {};
      where.notification.createdAt = {};
      
      if (filters.startDate) {
        where.notification.createdAt.gte = new Date(filters.startDate);
      }
      
      if (filters.endDate) {
        where.notification.createdAt.lte = new Date(filters.endDate);
      }
    }

    return where;
  }

  private getOrderBy(orderBy?: string) {
    if (orderBy === 'createdAt:asc') {
      return { notification: { createdAt: 'asc' as const } };
    }
    // Padrão: mais recentes primeiro
    return { notification: { createdAt: 'desc' as const } };
  }

  private validateStatusTransition(current: NotificationStatus, next: NotificationStatus): void {
    const allowedTransitions: Record<NotificationStatus, NotificationStatus[]> = {
      NAO_LIDA: ['LIDA', 'ARQUIVADA', 'RESPONDIDA'],
      LIDA: ['ARQUIVADA', 'RESPONDIDA'],
      ARQUIVADA: ['LIDA'],
      RESPONDIDA: ['ARQUIVADA', 'LIDA'],
    };

    if (!allowedTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Transição de status inválida: ${current} -> ${next}`
      );
    }
  }

  private formatNotificationResponse(
    notification: any,
    recipientCount?: number,
    recipient?: any
  ): NotificationResponseDto {
    const isBroadcast = 
      notification.targetDepartments.length === 0 &&
      notification.targetRanks.length === 0 &&
      notification.targetProvinces.length === 0;

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      urgency: notification.urgency,
      status: recipient?.status || 'NAO_LIDA',
      sender:
        recipient && notification.senderId === recipient.userId && notification.category === 'SEGURANCA'
          ? { id: 'sistema', name: 'ELO · Segurança', rank: null as any, department: null as any, unit: undefined }
          : {
              id: notification.sender.id,
              name: notification.sender.fullName,
              rank: notification.sender.memberRank,
              department: notification.sender.department,
              unit: notification.sender.unit,
            },
      recipients: {
        departments: notification.targetDepartments,
        ranks: notification.targetRanks,
        provinces: notification.targetProvinces,
        specificUsers: [], // Seria carregado se necessário
        isBroadcast,
      },
      metadata: {
        requiresConfirmation: notification.requiresConfirmation,
        confirmationDeadline: notification.confirmationDeadline?.toISOString(),
        hasAttachment: notification.attachments.length > 0,
        attachmentCount: notification.attachments.length,
        isBroadcast,
      },
      availableActions: notification.availableActions,
      attachments: notification.attachments.map(att => ({
        id: att.id,
        type: att.type,
        url: att.url,
        name: att.name,
        size: att.size,
      })),
      createdAt: notification.createdAt.toISOString(),
      sentAt: notification.sentAt.toISOString(),
      readAt: recipient?.readAt?.toISOString(),
      respondedAt: recipient?.respondedAt?.toISOString(),
      response: recipient?.response,
      expiresAt: notification.expiresAt?.toISOString(),
      // relatedTo seria carregado de um campo JSON se existir
    };
  }
}