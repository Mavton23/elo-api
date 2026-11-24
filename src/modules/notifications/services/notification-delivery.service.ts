import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  Department, 
  MemberRank, 
  Prisma 
} from '@prisma/client';

interface RecipientCriteria {
  targetDepartments?: Department[];
  targetRanks?: MemberRank[];
  targetProvinces?: string[];
  excludeUserId?: string;
  specificUsers?: string[];
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateAndCreateRecipients(
    notificationId: string,
    criteria: RecipientCriteria
  ): Promise<string[]> {
    // 1. Calcular usuários elegíveis
    // O emissor não é destinatário do próprio comunicado (relatório limpo).
    const eligibleUserIds = (await this.calculateEligibleUsers(criteria)).filter((id) => id !== criteria.excludeUserId);
    
    // 2. Criar registros de destinatários em batch
    await this.createRecipientRecords(notificationId, eligibleUserIds);
    
    this.logger.log(
      `Criados ${eligibleUserIds.length} destinatários para notificação ${notificationId}`
    );
    
    return eligibleUserIds;
  }

  private async calculateEligibleUsers(criteria: RecipientCriteria): Promise<string[]> {
  try {
    // 1. Caso específico: usuários específicos
    if (criteria.specificUsers?.length) {
      return this.validateUserIds(criteria.specificUsers);
    }

    // 2. Construir condições dinamicamente
    const conditions = this.buildUserConditions(criteria);

    // 3. Executar query
    const users = await this.prisma.user.findMany({
      where: conditions,
      select: { id: true },
    });

    return users.map(user => user.id);
  } catch (error) {
    this.logger.error('Erro ao calcular usuários elegíveis', error);
    throw error;
  }
}

private buildUserConditions(criteria: RecipientCriteria): Prisma.UserWhereInput {
  const baseCondition: Prisma.UserWhereInput = { isActive: true };
  const filters: Prisma.UserWhereInput[] = [];

  // Adicionar filtros apenas se existirem
  if (criteria.targetDepartments?.length) {
    filters.push({ department: { in: criteria.targetDepartments } });
  }

  if (criteria.targetRanks?.length) {
    filters.push({ memberRank: { in: criteria.targetRanks } });
  }

  if (criteria.targetProvinces?.length) {
    filters.push({ province: { in: criteria.targetProvinces } });
  }

  // Se não houver filtros específicos, retornar apenas condição base
  if (filters.length === 0) {
    return baseCondition;
  }

  // Se houver filtros, combinar com AND
  return {
    ...baseCondition,
    AND: filters,
  };
}

private async validateUserIds(userIds: string[]): Promise<string[]> {
  // Verificar se os IDs existem (opcional)
  const existingUsers = await this.prisma.user.findMany({
    where: {
      id: { in: userIds },
      isActive: true,
    },
    select: { id: true },
  });

  return existingUsers.map(user => user.id);
}

  private async createRecipientRecords(
    notificationId: string, 
    userIds: string[]
  ): Promise<void> {
    if (userIds.length === 0) return;

    // Criar em batches para não sobrecarregar o banco
    const batchSize = 1000;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      const createData = batch.map(userId => ({
        notificationId,
        userId,
        status: 'NAO_LIDA' as const,
      }));

      await this.prisma.notificationRecipient.createMany({
        data: createData,
        skipDuplicates: true, // Evitar duplicatas
      });
    }
  }

  async getNotificationRecipients(
    notificationId: string,
    filters?: {
      status?: string;
      department?: Department;
    }
  ) {
    const where: Prisma.NotificationRecipientWhereInput = {
      notificationId,
    };

    if (filters?.status) {
      where.status = filters.status as any;
    }

    if (filters?.department) {
      where.user = {
        department: filters.department,
      };
    }

    return this.prisma.notificationRecipient.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          }
        }
      },
    });
  }

  async getRecipientStats(notificationId: string) {
    const stats = await this.prisma.notificationRecipient.groupBy({
      by: ['status'],
      where: { notificationId },
      _count: true,
    });

    const total = await this.prisma.notificationRecipient.count({
      where: { notificationId },
    });

    return {
      total,
      byStatus: stats.reduce((acc, curr) => {
        acc[curr.status] = curr._count;
        return acc;
      }, {}),
    };
  }
}