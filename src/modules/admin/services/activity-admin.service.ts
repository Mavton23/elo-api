import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ActivityFiltersDto,
  ActivityStatsDto,
  ExportLogsDto,
  ActivityLogDto,
  TopUserDto,
  HourlyDistributionDto
} from '../dto/activity-log.dto';
import { ActivityLogResponseDto } from '../dto/activity-admin-response.dto';
import { ActivityLevel, ActivityModule, TargetType } from '@prisma/client';

interface ActivityLogWithUser {
  id: string;
  level: ActivityLevel;
  module: ActivityModule;
  action: string;
  description: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  targetType: TargetType | null;
  targetId: string | null;
  targetName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  timestamp: Date;
  createdAt: Date;
  user?: {
    id: string;
    fullName: string;
    memberRank: string | null;
    department: string | null;
  } | null;
}

@Injectable()
export class ActivityAdminService {
  constructor(private prisma: PrismaService) {}

  async getActivityLogs(filters: ActivityFiltersDto) {
    const {
      startDate,
      endDate,
      level,
      module,
      userId,
      targetType,
      targetId,
      search,
      page = 1,
      limit = 50,
    } = filters;

    const limitNum = Number(limit) || 50;
    const skip = (page - 1) * limitNum;
    const where: any = {};

    // Aplicar filtros de data
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (level) where.level = level;
    if (module) where.module = module;
    if (userId) where.userId = userId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    // Filtro de busca
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
              department: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    // Formatar resposta
    const formattedLogs: ActivityLogResponseDto[] = logs.map(log => ({
      id: log.id,
      level: log.level,
      module: log.module,
      action: log.action,
      description: log.description,
      userId: log.userId || undefined,
      userName: log.userName || log.user?.fullName || undefined,
      userRole: log.userRole || log.user?.memberRank || undefined,
      targetType: log.targetType || undefined,
      targetId: log.targetId || undefined,
      targetName: log.targetName || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      metadata: log.metadata as Record<string, any>,
      timestamp: log.timestamp,
      createdAt: log.createdAt,
      user: log.user || undefined,
    }));

    return {
      data: formattedLogs,
      meta: {
        total,
        page,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getActivityStats(): Promise<ActivityStatsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      logsToday,
      logsThisWeek,
      logsThisMonth,
      byLevel,
      byModule,
      byTargetType,
      recentActivities,
      topUsers,
      hourlyDistribution,
    ] = await Promise.all([
      // Totais
      this.prisma.activityLog.count(),
      this.prisma.activityLog.count({
        where: { timestamp: { gte: today } },
      }),
      this.prisma.activityLog.count({
        where: { timestamp: { gte: weekAgo } },
      }),
      this.prisma.activityLog.count({
        where: { timestamp: { gte: monthAgo } },
      }),

      // Por nível
      this.prisma.activityLog.groupBy({
        by: ['level'],
        _count: true,
        where: { timestamp: { gte: monthAgo } },
      }),

      // Por módulo
      this.prisma.activityLog.groupBy({
        by: ['module'],
        _count: true,
        where: { timestamp: { gte: monthAgo } },
      }),

      // Por tipo de alvo
      this.prisma.activityLog.groupBy({
        by: ['targetType'],
        _count: true,
        where: {
          targetType: { not: null },
          timestamp: { gte: monthAgo },
        },
      }),

      // Atividades recentes
      this.prisma.activityLog.findMany({
        take: 10,
        where: { timestamp: { gte: monthAgo } },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }) as Promise<ActivityLogWithUser[]>,

      // Top usuários
      this.prisma.activityLog.groupBy({
        by: ['userId'],
        _count: true,
        where: {
          userId: { not: null },
          timestamp: { gte: monthAgo },
        },
        take: 10,
        orderBy: { _count: { userId: 'desc' } },
      }),

      // Distribuição horária
      this.getHourlyDistribution(monthAgo),
    ]);

    // Processar top usuários
    const topUsersWithNames: TopUserDto[] = (await Promise.all(
      topUsers.map(async (group) => {
        if (!group.userId) return null;
        const user = await this.prisma.user.findUnique({
          where: { id: group.userId },
          select: { fullName: true },
        });
        return {
          userId: group.userId,
          userName: user?.fullName || 'Usuário desconhecido',
          count: group._count,
        };
      }),
    )).filter((user): user is TopUserDto => user !== null);

    // Converter atividades recentes para DTO
    const recentActivitiesDto: ActivityLogDto[] = recentActivities.map(log => ({
      id: log.id,
      level: log.level,
      module: log.module,
      action: log.action,
      description: log.description,
      userId: log.userId || undefined,
      userName: log.userName || log.user?.fullName || undefined,
      userRole: log.userRole || undefined,
      targetType: log.targetType || undefined,
      targetId: log.targetId || undefined,
      targetName: log.targetName || undefined,
      ipAddress: log.ipAddress || undefined,
      userAgent: log.userAgent || undefined,
      metadata: log.metadata as Record<string, any>,
      timestamp: log.timestamp,
      createdAt: log.createdAt,
    }));

    // Converter distribuição horária para DTO
    const hourlyDistributionDto: HourlyDistributionDto[] = hourlyDistribution;

    return {
      totalLogs,
      logsToday,
      logsThisWeek,
      logsThisMonth,
      byLevel: byLevel.reduce(
        (acc, curr) => ({ ...acc, [curr.level]: curr._count }),
        {} as Record<string, number>,
      ),
      byModule: byModule.reduce(
        (acc, curr) => ({ ...acc, [curr.module]: curr._count }),
        {} as Record<string, number>,
      ),
      byTargetType: byTargetType.reduce(
        (acc, curr) => {
          if (!curr.targetType) return acc;
          acc[curr.targetType] = curr._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentActivities: recentActivitiesDto,
      topUsers: topUsersWithNames,
      hourlyDistribution: hourlyDistributionDto,
    };
  }

  async getModulesStats() {
    const modules = await this.prisma.activityLog.groupBy({
      by: ['module'],
      _count: true,
      where: { timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { _count: { module: 'desc' } },
    });

    return modules.map(module => ({
      module: module.module,
      count: module._count,
      lastActivity: this.getLastActivityByModule(module.module),
    }));
  }

  async getTopUsers(limit = 10) {
    const topUsers = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      _count: true,
      where: {
        userId: { not: null },
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      take: limit,
      orderBy: { _count: { userId: 'desc' } },
    });

    // Obter detalhes dos usuários
    const usersWithDetails = await Promise.all(
      topUsers.map(async (group) => {
        if (!group.userId) return null;
        const user = await this.prisma.user.findUnique({
          where: { id: group.userId },
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        });

        if (!user) return null;

        // Obter última atividade
        const lastActivity = await this.prisma.activityLog.findFirst({
          where: { userId: group.userId },
          orderBy: { timestamp: 'desc' },
          select: { action: true, timestamp: true },
        });

        return {
          ...user,
          activityCount: group._count,
          lastActivity: lastActivity?.timestamp,
          lastAction: lastActivity?.action,
        };
      }),
    );

    return usersWithDetails.filter(Boolean);
  }

  async getLog(id: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
            institutionalEmail: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Log não encontrado');
    }

    return {
      ...log,
      metadata: log.metadata as Record<string, any>,
      userName: log.userName || log.user?.fullName,
      userRole: log.userRole || log.user?.memberRank,
    };
  }

  async getUserLogs(userId: string, limit = 50) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const logs = await this.prisma.activityLog.findMany({
      where: {
        OR: [
          { userId },
          { targetId: userId, targetType: 'USER' },
        ],
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const stats = await this.prisma.activityLog.groupBy({
      by: ['level'],
      _count: true,
      where: {
        OR: [
          { userId },
          { targetId: userId, targetType: 'USER' },
        ],
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        memberRank: user.memberRank,
        department: user.department,
      },
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata as Record<string, any>,
      })),
      stats: stats.reduce(
        (acc, curr) => ({ ...acc, [curr.level]: curr._count }),
        {},
      ),
      total: logs.length,
    };
  }

  async searchLogs(searchCriteria: any) {
    const { query, fields = ['action', 'description', 'userName', 'targetName'] } = searchCriteria;
    
    if (!query || query.length < 3) {
      throw new BadRequestException('Consulta deve ter pelo menos 3 caracteres');
    }

    const whereConditions = fields.map(field => ({
      [field]: { contains: query, mode: 'insensitive' },
    }));

    const logs = await this.prisma.activityLog.findMany({
      where: {
        OR: whereConditions,
      },
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      query,
      fields,
      count: logs.length,
      results: logs.map(log => ({
        ...log,
        metadata: log.metadata as Record<string, any>,
      })),
    };
  }

  async exportLogs(exportDto: ExportLogsDto) {
    const { format, ...filters } = exportDto;
    const where = this.buildWhereClause(filters);

    const logs = await this.prisma.activityLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
          },
        },
      },
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level,
      module: log.module,
      action: log.action,
      description: log.description,
      userId: log.userId,
      userName: log.userName || log.user?.fullName,
      userRole: log.userRole || log.user?.memberRank,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      ipAddress: log.ipAddress,
      metadata: log.metadata,
    }));

    // Log da exportação
    await this.logActivity({
      level: 'INFO',
      module: 'LOGS',
      action: 'LOGS_EXPORTED',
      description: `Exportação de ${logs.length} logs em formato ${format}`,
      metadata: { format, filter: filters, count: logs.length },
    });

    if (format === 'csv') {
      return this.convertToCSV(formattedLogs);
    }

    return {
      format: 'json',
      count: formattedLogs.length,
      data: formattedLogs,
    };
  }

  async cleanupOldLogs(days: number) {
    if (days < 30) {
      throw new BadRequestException('Apenas logs com mais de 30 dias podem ser limpos');
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const count = await this.prisma.activityLog.count({
      where: { timestamp: { lt: cutoffDate } },
    });

    if (count === 0) {
      return { message: 'Nenhum log antigo encontrado para limpeza' };
    }

    await this.prisma.activityLog.deleteMany({
      where: { timestamp: { lt: cutoffDate } },
    });

    // Log da limpeza
    await this.logActivity({
      level: 'INFO',
      module: 'LOGS',
      action: 'LOGS_CLEANED',
      description: `${count} logs antigos removidos (mais de ${days} dias)`,
      metadata: { count, days, cutoffDate: cutoffDate.toISOString() },
    });

    return {
      message: `${count} logs antigos removidos com sucesso`,
      count,
      cutoffDate: cutoffDate.toISOString(),
    };
  }

  async getDashboardOverview() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      todayLogs,
      yesterdayLogs,
      recentErrors,
      recentSecurity,
      topModulesToday,
    ] = await Promise.all([
      this.prisma.activityLog.count({
        where: { timestamp: { gte: today } },
      }),
      this.prisma.activityLog.count({
        where: { 
          timestamp: { 
            gte: yesterday,
            lt: today 
          } 
        },
      }),
      this.prisma.activityLog.findMany({
        where: { 
          level: { in: ['ERROR', 'SECURITY'] },
          timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        },
        take: 5,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          level: true,
          module: true,
          action: true,
          description: true,
          timestamp: true,
        },
      }),
      this.prisma.activityLog.findMany({
        where: { 
          level: 'SECURITY',
          timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        take: 10,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          action: true,
          description: true,
          metadata: true,
          userName: true,
          timestamp: true,
        },
      }),
      this.prisma.activityLog.groupBy({
        by: ['module'],
        _count: true,
        where: { timestamp: { gte: today } },
        take: 5,
        orderBy: { _count: { module: 'desc' } },
      }),
    ]);

    const changePercent = yesterdayLogs > 0 
      ? ((todayLogs - yesterdayLogs) / yesterdayLogs * 100).toFixed(1)
      : '100';

    return {
      today: todayLogs,
      yesterday: yesterdayLogs,
      changePercent: parseFloat(changePercent),
      recentErrors: recentErrors.map(log => ({
        ...log,
        // metadata: log.metadata as Record<string, any>,
      })),
      recentSecurity: recentSecurity.map(log => ({
        ...log,
        metadata: log.metadata as Record<string, any>,
      })),
      topModulesToday: topModulesToday.map(module => ({
        module: module.module,
        count: module._count,
        percentage: (module._count / todayLogs * 100).toFixed(1),
      })),
    };
  }

  async getDailyTimeline(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await this.prisma.activityLog.findMany({
      where: { timestamp: { gte: cutoffDate } },
      select: {
        timestamp: true,
        level: true,
        module: true,
      },
    });

    const timeline: Record<string, {
      total: number;
      byLevel: Record<ActivityLevel, number>;
      byModule: Partial<Record<ActivityModule, number>>;
    }> = {};

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];

      if (!timeline[date]) {
        timeline[date] = {
          total: 0,
          byLevel: {
            INFO: 0,
            WARNING: 0,
            ERROR: 0,
            SECURITY: 0,
          },
          byModule: {},
        };
      }

      timeline[date].total++;

      timeline[date].byLevel[log.level] =
        (timeline[date].byLevel[log.level] ?? 0) + 1;

      timeline[date].byModule[log.module] =
        (timeline[date].byModule[log.module] ?? 0) + 1;
    });

    return Object.entries(timeline)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRecentAlerts(limit = 20) {
    const alerts = await this.prisma.activityLog.findMany({
      where: {
        level: { in: ['WARNING', 'ERROR', 'SECURITY'] },
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return alerts.map(alert => ({
      ...alert,
      metadata: alert.metadata as Record<string, any>,
      userName: alert.userName || alert.user?.fullName,
      isNew: alert.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
    }));
  }

  async simulateLog(logData: any) {
    // Apenas para desenvolvimento/testes
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Simulação não permitida em produção');
    }

    const log = await this.prisma.activityLog.create({
      data: {
        level: logData.level || 'INFO',
        module: logData.module || 'SYSTEM',
        action: logData.action || 'TEST_ACTION',
        description: logData.description || 'Log de teste simulado',
        userId: logData.userId,
        userName: logData.userName,
        userRole: logData.userRole,
        targetType: logData.targetType,
        targetId: logData.targetId,
        targetName: logData.targetName,
        ipAddress: logData.ipAddress || '127.0.0.1',
        userAgent: logData.userAgent || 'Simulator/1.0',
        metadata: logData.metadata,
        timestamp: new Date(),
      },
    });

    return {
      message: 'Log simulado criado com sucesso',
      log: {
        ...log,
        metadata: log.metadata as Record<string, any>,
      },
    };
  }

  // Método auxiliar para o ActivityService
  async logActivity(params: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          level: params.level,
          module: params.module,
          action: params.action,
          description: params.description,
          userId: params.userId,
          userName: params.userName,
          userRole: params.userRole,
          targetType: params.targetType,
          targetId: params.targetId,
          targetName: params.targetName,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: params.metadata,
          timestamp: params.timestamp || new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  private async getLastActivityByModule(module: ActivityModule) {
    const lastActivity = await this.prisma.activityLog.findFirst({
      where: { module },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, action: true },
    });

    return lastActivity ? {
      timestamp: lastActivity.timestamp,
      action: lastActivity.action,
    } : null;
  }

  private async getHourlyDistribution(startDate: Date) {
    const logs = await this.prisma.activityLog.findMany({
      where: { timestamp: { gte: startDate } },
      select: { timestamp: true },
    });

    const distribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
    }));

    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      distribution[hour].count++;
    });

    return distribution;
  }

  private buildWhereClause(filters: ActivityFiltersDto): any {
    const { startDate, endDate, level, module, userId, targetType, targetId, search } = filters;
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (level) where.level = level;
    if (module) where.module = module;
    if (userId) where.userId = userId;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { targetName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      ),
    ];

    return csvRows.join('\n');
  }
}