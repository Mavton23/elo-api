import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { rankValue, RANK_ORDER } from '@/common/constants/ranks';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService 
  extends PrismaClient 
  implements OnModuleInit, OnModuleDestroy 
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
      }),
      // Nunca registar queries em produção: podem conter dados pessoais.
      log:
        process.env.DB_LOG_QUERIES === 'true' && process.env.NODE_ENV !== 'production'
          ? ['query', 'warn', 'error']
          : ['warn', 'error'],
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Ligação à base de dados estabelecida');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Verificação de saúde (health check). */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Método auxiliar para limpar dados de teste
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Obter os nomes dos modelos do Prisma de forma segura
    const modelNames = this.getModelNames();
    
    return Promise.all(
      modelNames.map((modelName) => {
        // Usar type assertion para acessar a propriedade
        const model = (this as any)[modelName];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
        return Promise.resolve();
      }),
    );
  }

  /**
   * Método auxiliar para obter os nomes dos modelos
   * de forma segura e tipada
   */
  private getModelNames(): string[] {
    // Lista de modelos baseada no seu schema.prisma
    // Atualize esta lista conforme seus modelos
    const models = [
      'user',
      'post',
      'mediaattachment',
      'notification',
      'like',
      'comment',
      'bookmark',
      'notificationrecipient',
      'notificationattachment'
    ];

    return models.filter(modelName => 
      modelName in this && typeof (this as any)[modelName].deleteMany === 'function'
    );
  }

  /**
   * Extensão para queries comuns do Ministério
   */
  async findUserByIdentifier(identifier: string) {
    // Tentar por diferentes identificadores
    return await this.user.findFirst({
      where: {
        OR: [
          { nip: identifier },
          { biNumber: identifier },
          { nuit: identifier },
          { institutionalEmail: identifier },
        ],
      },
    });
  }

  /**
   * Buscar usuários por departamento e patente
   */
  async findUsersByDepartmentAndRank(
    department: string,
    minRank?: string,
  ) {
    const where: any = { department };

    if (minRank) {
      const rankOrder = RANK_ORDER as string[];
      const minRankIndex = rankOrder.indexOf(minRank);
      if (minRankIndex !== -1) {
        where.memberRank = {
          in: rankOrder.slice(minRankIndex),
        };
      }
    }

    return await this.user.findMany({
      where,
      select: {
        id: true,
        nip: true,
        fullName: true,
        memberRank: true,
        currentPosition: true,
        unit: true,
        province: true,
        isActive: true,
      },
    });
  }

  /**
   * Contar membros por departamento
   */
  async countMembersByDepartment() {
    return await this.user.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: {
        id: true,
      },
      orderBy: {
        department: 'asc',
      },
    });
  }

  /**
   * Buscar hierarquia organizacional
   */
  async getOrganizationalHierarchy() {
    const users = await this.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        memberRank: true,
        department: true,
        unit: true,
        unitType: true,
        province: true,
        currentPosition: true,
      },
      orderBy: [
        { memberRank: 'desc' },
        { department: 'asc' },
        { province: 'asc' },
      ],
    });

    // Organizar por estrutura hierárquica
    return this.organizeHierarchy(users);
  }

  private organizeHierarchy(users: any[]) {
    // Implementar lógica de organização hierárquica
    const hierarchy = {
      nacional: [] as any[],
      provincial: {} as Record<string, any[]>,
      unidades: {} as Record<string, any[]>,
    };

    users.forEach(user => {
      if (user.unitType === 'DIRECCAO_NACIONAL') {
        hierarchy.nacional.push(user);
      } else if (user.unitType === 'COMANDO_PROVINCIAL') {
        if (!hierarchy.provincial[user.province]) {
          hierarchy.provincial[user.province] = [];
        }
        hierarchy.provincial[user.province].push(user);
      } else {
        if (!hierarchy.unidades[user.unit]) {
          hierarchy.unidades[user.unit] = [];
        }
        hierarchy.unidades[user.unit].push(user);
      }
    });

    return hierarchy;
  }
}