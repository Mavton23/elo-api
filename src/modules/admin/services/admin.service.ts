import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AdminActivityDto, AdminStatsDto } from '../dto/admin-stats.dto';
import { CreateMemberDto } from '../dto/user-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
  ) {}

  /**
   * Método para administradores adicionarem membros pré-cadastrados
   */
  async addMinistryMember(memberData: CreateMemberDto) {
    // Verificar se já existe
    const existing = await this.prisma.member.findFirst({
      where: {
        OR: [
          { nip: memberData.nip },
          { biNumber: memberData.biNumber },
          { nuit: memberData.nuit },
          ...(memberData.institutionalEmail ? [{ institutionalEmail: memberData.institutionalEmail }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Membro já está na base de dados pré-cadastrados');
    }

    // Criar membro pré-cadastrado
    return this.prisma.member.create({
      data: {
        nip: memberData.nip,
        biNumber: memberData.biNumber,
        nuit: memberData.nuit,
        fullName: memberData.fullName,
        dateOfBirth: new Date(memberData.dateOfBirth),
        placeOfBirth: memberData.placeOfBirth,
        nationality: memberData.nationality || 'Moçambicana',
        maritalStatus: memberData.maritalStatus,
        memberRank: memberData.memberRank,
        currentPosition: memberData.currentPosition || 'Não informada',
        department: memberData.department,
        unit: memberData.unit,
        unitType: memberData.unitType,
        province: memberData.province,
        trainingCourse: memberData.trainingCourse,
        trainingSchool: memberData.trainingSchool,
        graduationYear: memberData.graduationYear,
        entryDate: new Date(memberData.entryDate),
        institutionalEmail: memberData.institutionalEmail,
        officialPhone: memberData.officialPhone,
      },
    });
  }

  async getDashboardStats(): Promise<AdminStatsDto> {
    const [
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalHierarchyNodes,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.member.count({ where: { isVerified: false } }),
      this.prisma.hierarchyNode.count(),
      this.prisma.activityLog.findMany({
        take: 10,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    const recentActivityDto: AdminActivityDto[] = recentActivity.map(log => {
      // Verificar se temos dados do usuário
      const adminId = log.userId || (log.user?.id || 'system');
      const adminName = log.user?.fullName || 'Sistema';
      
      return {
        id: log.id,
        adminId: adminId === 'system' ? undefined : adminId, // Não incluir se for 'system'
        adminName,
        action: log.action,
        targetType: log.targetType || undefined, // Pode ser undefined se for null
        targetId: log.targetId || undefined, // Pode ser undefined se for null
        targetName: log.targetName || undefined,
        timestamp: log.timestamp.toISOString(),
        ipAddress: log.ipAddress || undefined,
        details: log.metadata as Record<string, any>,
      };
    }).filter(activity => activity !== null) as AdminActivityDto[];

    return {
      totalUsers,
      activeUsers,
      pendingApprovals,
      totalHierarchyNodes,
      recentActivity: recentActivityDto,
    };
  }

  async getAdminProfile(userId: string) {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            institutionalEmail: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        permissions: true,
      },
    });

    if (!adminProfile) {
      throw new NotFoundException('Perfil admin não encontrado');
    }

    return adminProfile;
  }

  async promoteToAdmin(userId: string, createAdminDto: CreateAdminDto) {
    // Verificar se usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se já é admin
    const existingAdmin = await this.prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (existingAdmin) {
      throw new ConflictException('Usuário já é administrador');
    }

    // Criar perfil admin
    return this.prisma.adminProfile.create({
      data: {
        userId,
        adminLevel: createAdminDto.adminLevel,
        permissions: {
          create: createAdminDto.permissions || [],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            institutionalEmail: true,
          },
        },
        permissions: true,
      },
    });
  }

  async updateAdminProfile(userId: string, updateAdminDto: UpdateAdminDto) {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!adminProfile) {
      throw new NotFoundException('Perfil admin não encontrado');
    }

    // Atualizar perfil
    return this.prisma.adminProfile.update({
      where: { userId },
      data: {
        adminLevel: updateAdminDto.adminLevel,
        permissions: {
          deleteMany: {},
          create: updateAdminDto.permissions || [],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            institutionalEmail: true,
          },
        },
        permissions: true,
      },
    });
  }

  async removeAdmin(userId: string) {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId },
    });

    if (!adminProfile) {
      throw new NotFoundException('Perfil admin não encontrado');
    }

    await this.prisma.adminProfile.delete({
      where: { userId },
    });

    return { message: 'Privilégios admin removidos com sucesso' };
  }

  async listAdmins(filter: any) {
    const { page = 1, limit = 20, ...where } = filter;
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      this.prisma.adminProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              institutionalEmail: true,
              memberRank: true,
              department: true,
              isActive: true,
            },
          },
          permissions: true,
        },
        orderBy: { adminLevel: 'desc' },
      }),
      this.prisma.adminProfile.count({ where }),
    ]);

    return {
      data: admins,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}