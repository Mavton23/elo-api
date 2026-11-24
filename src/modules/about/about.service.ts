import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AboutResponseDto, AboutModuleDto, AboutStatsDto } from './dto/about.dto';
import { AboutModuleStatus, AboutModuleCategory } from '@prisma/client';

@Injectable()
export class AboutService {
  constructor(private prisma: PrismaService) {}

  async getAboutInfo(): Promise<AboutResponseDto> {
    const stats = await this.getStats();
    const modules = await this.getModulesInfo();
    
    return {
      name: 'ELO API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'API do Sistema de Gestão do Ministério do Interior',
      author: '@Nordino Mavie Dev',
      environment: process.env.NODE_ENV || 'development',
      status: AboutModuleStatus.ACTIVE,
      lastUpdated: new Date(),
      documentationUrl: 'https://api.elo.gov.mz/api/v1/docs',
      repositoryUrl: 'https://github.com/ministerio-interior/elo-api',
      supportContact: 'suporte.elo@mint.gov.mz',
      modules,
      stats,
      dependencies: this.getDependencies(),
    };
  }

  private async getStats(): Promise<AboutStatsDto> {
    try {
      const [
        totalUsers,
        totalMembers,
        totalHierarchyNodes,
        totalPosts,
        totalNotifications,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.member.count(),
        this.prisma.hierarchyNode.count(),
        this.prisma.post.count(),
        this.prisma.notification.count(),
      ]);

      // Para uptime e estatísticas de requisições, você pode implementar
      // um sistema mais sofisticado com métricas em tempo real
      return {
        totalUsers,
        totalMembers,
        totalHierarchyNodes,
        totalPosts,
        totalNotifications,
        uptime: process.uptime(),
        requestsPerMinute: 0, // Implementar tracking se necessário
      };
    } catch (error) {
      // Retorna valores padrão em caso de erro
      return {
        totalUsers: 0,
        totalMembers: 0,
        totalHierarchyNodes: 0,
        totalPosts: 0,
        totalNotifications: 0,
        uptime: process.uptime(),
        requestsPerMinute: 0,
      };
    }
  }

  private async getModulesInfo(): Promise<AboutModuleDto[]> {
    const modules: AboutModuleDto[] = [
      {
        name: 'Autenticação',
        category: AboutModuleCategory.CORE,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Sistema de autenticação e autorização de usuários',
        enabled: true,
        basePath: '/auth',
      },
      {
        name: 'Usuários',
        category: AboutModuleCategory.CORE,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Gestão de usuários e perfis',
        enabled: true,
        basePath: '/users',
      },
      {
        name: 'Hierarquia',
        category: AboutModuleCategory.HIERARCHY,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Estrutura organizacional e unidades',
        enabled: true,
        basePath: '/hierarchy',
      },
      {
        name: 'Admin',
        category: AboutModuleCategory.ADMIN,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Administração do sistema',
        enabled: true,
        basePath: '/admin',
      },
      {
        name: 'Social',
        category: AboutModuleCategory.SOCIAL,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Feed social e interações',
        enabled: true,
        basePath: '/social',
      },
      {
        name: 'Notificações',
        category: AboutModuleCategory.SYSTEM,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Sistema de notificações',
        enabled: true,
        basePath: '/notifications',
      },
      {
        name: 'Ajuda',
        category: AboutModuleCategory.HELP,
        status: AboutModuleStatus.ACTIVE,
        version: '1.0.0',
        description: 'Centro de ajuda e suporte',
        enabled: true,
        basePath: '/help',
      },
    ];

    return modules;
  }

  private getDependencies(): Record<string, string> {
    return {
      node: process.version,
      nestjs: '10.0.0', // Atualize conforme sua versão
      prisma: '5.7.0',  // Atualize conforme sua versão
      postgresql: '15', // Ou a versão que você está usando
      'class-validator': '0.14.0',
      'class-transformer': '0.5.1',
      // Adicione outras dependências importantes
    };
  }

  async getHealth(): Promise<{ status: string; timestamp: Date; uptime: number }> {
    // Verifica a conectividade com o banco de dados
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    return {
      status: dbStatus,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  async getVersion(): Promise<{ version: string; build: string; environment: string }> {
    return {
      version: process.env.npm_package_version || '1.0.0',
      build: process.env.BUILD_NUMBER || process.env.BUILD_ID || 'local',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}