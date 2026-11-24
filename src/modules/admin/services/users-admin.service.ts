import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  UserFilterDto,
  UserCreateDataDto,
  UserUpdateDataDto,
} from '../dto/user-admin.dto';
import { ActivityAdminService } from './activity-admin.service';
import { SecurityLevel } from '@prisma/client';

@Injectable()
export class UsersAdminService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityAdminService,
  ) {}

  async getUsers(filter: UserFilterDto) {
    const {
      search,
      department,
      rank,
      unit,
      province,
      isActive,
      adminLevel,
      page = 1,
      limit = 20,
    } = filter;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const skip = (pageNum - 1) * limitNum;
    const where: any = {};

    // Aplicar filtros
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
        { biNumber: { contains: search, mode: 'insensitive' } },
        { institutionalEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) where.department = department;
    if (rank) where.memberRank = rank;
    if (unit) where.unit = { contains: unit, mode: 'insensitive' };
    if (province) where.province = { contains: province, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive;

    // Filtro por admin level
    if (adminLevel) {
      where.adminProfile = { adminLevel };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          nip: true,
          biNumber: true,
          fullName: true,
          memberRank: true,
          department: true,
          unit: true,
          province: true,
          institutionalEmail: true,
          isActive: true,
          securityLevel: true,
          lastAccess: true,
          createdAt: true,
          adminProfile: {
            select: {
              adminLevel: true,
              adminSince: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Enriquecer dados com informações de admin
    const enrichedUsers = users.map(user => ({
      ...user,
      adminLevel: user.adminProfile?.adminLevel || null,
      adminSince: user.adminProfile?.adminSince || null,
    }));

    // console.log("USUARIOS OBTIDOS: ", enrichedUsers);

    return {
      data: enrichedUsers,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  async getUserStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByDepartment,
      usersByRank,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: false } }),
      this.prisma.user.groupBy({
        by: ['department'],
        _count: true,
      }),
      this.prisma.user.groupBy({
        by: ['memberRank'],
        _count: true,
      }),
      this.prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          memberRank: true,
          department: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      byDepartment: usersByDepartment.reduce(
        (acc, curr) => ({ ...acc, [curr.department]: curr._count }),
        {},
      ),
      byRank: usersByRank.reduce(
        (acc, curr) => ({ ...acc, [curr.memberRank]: curr._count }),
        {},
      ),
      recentRegistrations,
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        adminProfile: {
          include: {
            permissions: true,
          },
        },
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            category: true,
            createdAt: true,
          },
        },
        memberships: {
          include: {
            node: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remover dados sensíveis
    const { passwordHash, refreshToken, twoFactorSecret, otpCode, otpExpiresAt, ...safeUser } = user;

    return safeUser;
  }

  async createUser(userData: UserCreateDataDto) {
    // Verificar unicidade
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { nip: userData.nip },
          { biNumber: userData.biNumber },
          { nuit: userData.nuit },
          ...(userData.institutionalEmail
            ? [{ institutionalEmail: userData.institutionalEmail }]
            : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Já existe um usuário com esses dados');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Converter datas
    const dateOfBirth = new Date(userData.dateOfBirth);
    const entryDate = new Date(userData.entryDate);

    // Criar usuário
    const user = await this.prisma.user.create({
      data: {
        nip: userData.nip,
        biNumber: userData.biNumber,
        nuit: userData.nuit,
        institutionalEmail: userData.institutionalEmail,
        passwordHash: hashedPassword,
        fullName: userData.fullName,
        memberRank: userData.memberRank,
        department: userData.department,
        unit: userData.unit,
        unitType: userData.unitType,
        province: userData.province,
        currentPosition: userData.currentPosition,
        dateOfBirth,
        placeOfBirth: userData.placeOfBirth,
        nationality: userData.nationality || 'Moçambicana',
        maritalStatus: userData.maritalStatus as any,
        entryDate,
        securityLevel: userData.securityLevel,
      },
    });

    // Criar perfil admin se necessário
    if (userData.adminLevel) {
      await this.prisma.adminProfile.create({
        data: {
          userId: user.id,
          adminLevel: userData.adminLevel,
          permissions: {
            create: userData.adminPermissions || [],
          },
        },
      });
    }

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'USERS',
      action: 'USER_CREATED',
      description: `Usuário ${user.fullName} criado`,
      userId: user.id,
      targetType: 'USER',
      targetId: user.id,
      targetName: user.fullName,
    });

    return this.getUser(user.id);
  }

  async updateUser(id: string, userData: UserUpdateDataDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { adminProfile: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Preparar dados para atualização
    const updateData: any = {
      fullName: userData.fullName,
      memberRank: userData.memberRank,
      department: userData.department,
      unit: userData.unit,
      unitType: userData.unitType,
      province: userData.province,
      currentPosition: userData.currentPosition,
      placeOfBirth: userData.placeOfBirth,
      nationality: userData.nationality,
      maritalStatus: userData.maritalStatus as any,
      securityLevel: userData.securityLevel,
    };

    // Atualizar datas se fornecidas
    if (userData.dateOfBirth) {
      updateData.dateOfBirth = new Date(userData.dateOfBirth);
    }
    if (userData.entryDate) {
      updateData.entryDate = new Date(userData.entryDate);
    }

    // Atualizar senha se fornecida
    if (userData.password) {
      updateData.passwordHash = await bcrypt.hash(userData.password, 12);
      updateData.passwordChangedAt = new Date();
      updateData.refreshToken = null;
      updateData.tokenVersion = { increment: 1 }; // termina sessões ativas
    }

    // Atualizar usuário
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Gerenciar perfil admin
    if (userData.adminLevel) {
      if (user.adminProfile) {
        // Atualizar perfil existente
        await this.prisma.adminProfile.update({
          where: { userId: id },
          data: {
            adminLevel: userData.adminLevel,
            permissions: {
              deleteMany: {},
              create: userData.adminPermissions || [],
            },
          },
        });
      } else {
        // Criar novo perfil
        await this.prisma.adminProfile.create({
          data: {
            userId: id,
            adminLevel: userData.adminLevel,
            permissions: {
              create: userData.adminPermissions || [],
            },
          },
        });
      }
    } else if (user.adminProfile) {
      // Remover perfil admin
      await this.prisma.adminProfile.delete({
        where: { userId: id },
      });
    }

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'USERS',
      action: 'USER_UPDATED',
      description: `Usuário ${updatedUser.fullName} atualizado`,
      userId: id,
      targetType: 'USER',
      targetId: id,
      targetName: updatedUser.fullName,
    });

    return this.getUser(id);
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se pode ser excluído (não tem relacionamentos importantes)
    const hasRelations = await this.checkUserRelations(id);
    if (hasRelations) {
      throw new BadRequestException(
        'Não é possível excluir usuário com dados relacionados',
      );
    }

    // Excluir usuário
    await this.prisma.user.delete({
      where: { id },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'WARNING',
      module: 'USERS',
      action: 'USER_DELETED',
      description: `Usuário ${user.fullName} excluído`,
      userId: id,
      targetType: 'USER',
      targetId: id,
      targetName: user.fullName,
    });

    return { message: 'Usuário excluído com sucesso' };
  }

  async toggleUserStatus(id: string, active: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      // Ao desativar, revoga imediatamente todas as sessões do utilizador
      data: active
        ? { isActive: true }
        : { isActive: false, refreshToken: null, tokenVersion: { increment: 1 } },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'USERS',
      action: active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      description: `Usuário ${updatedUser.fullName} ${active ? 'ativado' : 'desativado'}`,
      userId: id,
      targetType: 'USER',
      targetId: id,
      targetName: updatedUser.fullName,
    });

    return {
      id: updatedUser.id,
      isActive: updatedUser.isActive,
      message: `Usuário ${active ? 'ativado' : 'desativado'} com sucesso`,
    };
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: true,
        loginAttempts: 0,
        lockedUntil: null,
        refreshToken: null,
        tokenVersion: { increment: 1 },
      },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'SECURITY',
      module: 'USERS',
      action: 'PASSWORD_RESET',
      description: `Senha do usuário ${user.fullName} redefinida`,
      userId: id,
      targetType: 'USER',
      targetId: id,
      targetName: user.fullName,
    });

    return { message: 'Senha redefinida com sucesso' };
  }

  async updateSecurityLevel(id: string, securityLevel: SecurityLevel) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { securityLevel },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'SECURITY',
      module: 'USERS',
      action: 'SECURITY_LEVEL_UPDATED',
      description: `Nível de segurança do usuário ${updatedUser.fullName} atualizado para ${securityLevel}`,
      userId: id,
      targetType: 'USER',
      targetId: id,
      targetName: updatedUser.fullName,
    });

    return {
      id: updatedUser.id,
      securityLevel: updatedUser.securityLevel,
      message: 'Nível de segurança atualizado com sucesso',
    };
  }

  async getUserActivity(id: string, limit = 20) {
    const activities = await this.prisma.activityLog.findMany({
      where: {
        OR: [{ userId: id }, { targetId: id, targetType: 'USER' }],
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

    return activities;
  }

  async exportUsers(filter: UserFilterDto) {
    const users = await this.prisma.user.findMany({
      where: this.buildWhereClause(filter),
      select: {
        nip: true,
        biNumber: true,
        nuit: true,
        fullName: true,
        memberRank: true,
        department: true,
        unit: true,
        province: true,
        institutionalEmail: true,
        isActive: true,
        securityLevel: true,
        createdAt: true,
        lastAccess: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'USERS',
      action: 'USERS_EXPORTED',
      description: `Exportação de ${users.length} usuários`,
      metadata: { filter, count: users.length },
    });

    return users;
  }

  private buildWhereClause(filter: UserFilterDto): any {
    const { search, department, rank, unit, province, isActive, adminLevel } = filter;
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) where.department = department;
    if (rank) where.memberRank = rank;
    if (unit) where.unit = { contains: unit, mode: 'insensitive' };
    if (province) where.province = { contains: province, mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive;
    if (adminLevel) {
      where.adminProfile = { adminLevel };
    }

    return where;
  }

  private async checkUserRelations(userId: string): Promise<boolean> {
    const [
      postsCount,
      notificationsCount,
      hierarchyNodesCount,
      activityLogsCount,
    ] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.notification.count({ where: { senderId: userId } }),
      this.prisma.hierarchyNode.count({
        where: { OR: [{ commanderId: userId }, { createdById: userId }] },
      }),
      this.prisma.activityLog.count({ where: { userId } }),
    ]);

    return postsCount > 0 || notificationsCount > 0 || 
           hierarchyNodesCount > 0 || activityLogsCount > 0;
  }
}