import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyStatsDto } from '../dto/hierarchy-stats.dto';
import { Department, MemberRank } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obter estatísticas gerais baseadas em dados reais
   */
  async getStats(): Promise<HierarchyStatsDto> {
    const [
      totalMembers,
      activeMembers,
      membersByRank,
      membersByDepartment,
      membersByProvince,
      departments,
      units,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.getMembersByRank({ isActive: true }),
      this.getMembersByDepartment({ isActive: true }),
      this.getMembersByProvince({ isActive: true }),
      this.getDistinctDepartments(),
      this.getDistinctUnits(),
    ]);

    return {
      totalMembers,
      totalDepartments: departments.length,
      totalUnits: units.length,
      activeMembers,
      membersByRank,
      membersByDepartment,
      membersByProvince,
    };
  }

  /**
   * Obter estatísticas filtradas
   */
  async getFilteredStats(filters: {
    department?: Department;
    province?: string;
    rank?: MemberRank;
  }): Promise<Partial<HierarchyStatsDto>> {
    const where: any = { isActive: true };

    if (filters.department) {
      where.department = filters.department;
    }

    if (filters.province) {
      where.province = filters.province;
    }

    if (filters.rank) {
      where.memberRank = filters.rank;
    }

    const [
      totalMembers,
      activeMembers,
      membersByRank,
      membersByDepartment,
      membersByProvince,
    ] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { ...where, isActive: true } }),
      this.getMembersByRank(where),
      this.getMembersByDepartment(where),
      this.getMembersByProvince(where),
    ]);

    return {
      totalMembers,
      activeMembers,
      membersByRank,
      membersByDepartment,
      membersByProvince,
    };
  }

  /**
   * Obter estatísticas de um departamento específico
   */
  async getDepartmentStats(department: Department) {
    const where = { department, isActive: true };

    const [
      totalMembers,
      membersByRank,
      membersByProvince,
      units,
    ] = await Promise.all([
      this.prisma.user.count({ where }),
      this.getMembersByRank(where),
      this.getMembersByProvince(where),
      this.getUnitsInDepartment(department),
    ]);

    return {
      totalMembers,
      membersByRank,
      membersByProvince,
      totalUnits: units.length,
      units: units.map(unit => ({
        name: unit.unit,
        province: unit.province,
        unitType: unit.unitType,
        memberCount: unit.memberCount,
      })),
    };
  }

  /**
   * Obter estatísticas de uma província específica
   */
  async getProvinceStats(province: string) {
    const where = { province, isActive: true };

    const [
      totalMembers,
      membersByRank,
      membersByDepartment,
      units,
    ] = await Promise.all([
      this.prisma.user.count({ where }),
      this.getMembersByRank(where),
      this.getMembersByDepartment(where),
      this.getUnitsInProvince(province),
    ]);

    return {
      totalMembers,
      membersByRank,
      membersByDepartment,
      totalUnits: units.length,
      units: units.map(unit => ({
        name: unit.unit,
        department: unit.department,
        unitType: unit.unitType,
        memberCount: unit.memberCount,
      })),
    };
  }

  /**
   * Obter tendências (últimos 6 meses)
   */
  async getTrends(timeRange: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Contar usuários ativos há 6 meses atrás
    const previousActive = await this.prisma.user.count({
      where: {
        isActive: true,
        createdAt: { lte: sixMonthsAgo },
        OR: [
          { updatedAt: { lte: sixMonthsAgo } },
          // { updatedAt: null }
        ]
      },
    });

    // Contar usuários ativos agora
    const currentActive = await this.prisma.user.count({
      where: { isActive: true },
    });

    // Novos registros nos últimos 6 meses
    const newEntries = await this.prisma.user.count({
      where: {
        createdAt: { gte: sixMonthsAgo },
        isActive: true,
      },
    });

    return {
      totalMembers: {
        current: await this.prisma.user.count(),
        previous: await this.prisma.user.count({
          where: { createdAt: { lte: sixMonthsAgo } }
        }),
        change: this.calculatePercentageChange(
          await this.prisma.user.count(),
          await this.prisma.user.count({ where: { createdAt: { lte: sixMonthsAgo } } })
        ),
      },
      activeMembers: {
        current: currentActive,
        previous: previousActive,
        change: this.calculatePercentageChange(currentActive, previousActive),
      },
      newEntries: {
        current: newEntries,
        previous: 0, // Não temos dados históricos detalhados
        change: 100, // 100% de "crescimento" já que não temos dados anteriores
      },
    };
  }

  /**
   * Métodos auxiliares
   */
  private async getMembersByRank(where: any): Promise<Record<MemberRank, number>> {
    const rankCounts = await this.prisma.user.groupBy({
      by: ['memberRank'],
      where,
      _count: { id: true },
    });

    // Inicializar com zeros
    const result: Record<MemberRank, number> = {
      GUARDA: 0,
      SEGUNDO_CABO: 0,
      PRIMEIRO_CABO: 0,
      SARGENTO: 0,
      SARGENTO_PRINCIPAL: 0,
      SUBINSPECTOR: 0,
      INSPECTOR: 0,
      INSPECTOR_PRINCIPAL: 0,
      ADJUNTO_SUPERINTENDENTE: 0,
      SUPERINTENDENTE: 0,
      SUPERINTENDENTE_PRINCIPAL: 0,
      PRIMEIRO_ADJUNTO_COMISSARIO: 0,
      COMISSARIO: 0,
      INSPECTOR_GERAL: 0,
    };

    // Preencher com dados reais
    rankCounts.forEach(item => {
      result[item.memberRank] = item._count.id;
    });

    return result;
  }

  private async getMembersByDepartment(where: any): Promise<Record<Department, number>> {
    const deptCounts = await this.prisma.user.groupBy({
      by: ['department'],
      where,
      _count: { id: true },
    });

    // Inicializar com zeros
    const result: Record<Department, number> = {
      POLICIA_PROTECAO: 0,
      UNIDADE_CANINA: 0,
      POLICIA_FRONTEIRAS: 0,
      POLICIA_COSTEIRA_LACUSTRE_FLUVIAL: 0,
      POLICIA_TRANSITO: 0,
      UNIDADE_INTERVENCAO_RAPIDA: 0,
      UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES: 0,
      GRUPO_OPERACOES_ESPECIAIS: 0,
    };

    // Preencher com dados reais
    deptCounts.forEach(item => {
      result[item.department] = item._count.id;
    });

    return result;
  }

  private async getMembersByProvince(where: any): Promise<Record<string, number>> {
    const provinceCounts = await this.prisma.user.groupBy({
      by: ['province'],
      where,
      _count: { id: true },
    });

    const result: Record<string, number> = {};

    // Preencher com dados reais
    provinceCounts.forEach(item => {
      result[item.province] = item._count.id;
    });

    return result;
  }

  private async getDistinctDepartments() {
    return this.prisma.user.groupBy({
      by: ['department'],
      where: { isActive: true },
      _count: { id: true },
    });
  }

  private async getDistinctUnits() {
    return this.prisma.user.groupBy({
      by: ['unit', 'province'],
      where: { isActive: true },
      _count: { id: true },
    });
  }

  private async getUnitsInDepartment(department: Department) {
    const units = await this.prisma.user.groupBy({
      by: ['unit', 'province', 'unitType'],
      where: { department, isActive: true },
      _count: { id: true },
      orderBy: { unit: 'asc' },
    });

    return units.map(unit => ({
      unit: unit.unit,
      province: unit.province,
      unitType: unit.unitType,
      memberCount: unit._count.id,
    }));
  }

  private async getUnitsInProvince(province: string) {
    const units = await this.prisma.user.groupBy({
      by: ['unit', 'department', 'unitType'],
      where: { province, isActive: true },
      _count: { id: true },
      orderBy: { unit: 'asc' },
    });

    return units.map(unit => ({
      unit: unit.unit,
      department: unit.department,
      unitType: unit.unitType,
      memberCount: unit._count.id,
    }));
  }

  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number(((current - previous) / previous * 100).toFixed(1));
  }
}