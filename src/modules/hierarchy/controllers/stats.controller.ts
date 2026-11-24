import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StatsService } from '../services/stats.service';
import { HierarchyStatsDto } from '../dto/hierarchy-stats.dto';
import { Department, MemberRank } from '@prisma/client';

@ApiTags('Hierarchy - Stats')
@ApiBearerAuth()
@Controller('hierarchy/stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Obter estatísticas gerais' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas', type: HierarchyStatsDto })
  async getStats(): Promise<HierarchyStatsDto> {
    return this.statsService.getStats();
  }

  @Get('filtered')
  @ApiOperation({ summary: 'Obter estatísticas filtradas' })
  @ApiQuery({ name: 'department', required: false, enum: Object.values(Department) })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'rank', required: false, enum: Object.values(MemberRank) })
  @ApiResponse({ status: 200, description: 'Estatísticas filtradas' })
  async getFilteredStats(
    @Query('department') department?: Department,
    @Query('province') province?: string,
    @Query('rank') rank?: MemberRank,
  ) {
    const filters = { department, province, rank };
    return this.statsService.getFilteredStats(filters);
  }

  @Get('department/:department')
  @ApiOperation({ summary: 'Obter estatísticas de um departamento' })
  @ApiResponse({ status: 200, description: 'Estatísticas do departamento' })
  async getDepartmentStats(
    @Param('department') department: Department,
  ) {
    return this.statsService.getDepartmentStats(department);
  }

  @Get('province/:province')
  @ApiOperation({ summary: 'Obter estatísticas de uma província' })
  @ApiResponse({ status: 200, description: 'Estatísticas da província' })
  async getProvinceStats(
    @Param('province') province: string,
  ) {
    return this.statsService.getProvinceStats(province);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Obter tendências estatísticas' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['monthly', 'quarterly', 'yearly'] })
  @ApiResponse({ status: 200, description: 'Tendências estatísticas' })
  async getTrends(
    @Query('timeRange') timeRange: 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  ) {
    return this.statsService.getTrends(timeRange);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obter resumo estatístico' })
  @ApiResponse({ status: 200, description: 'Resumo estatístico' })
  async getSummary() {
    const stats = await this.statsService.getStats();
    
    // Calcular alguns dados resumidos
    const summary = {
      totalMembers: stats.totalMembers,
      activeMembers: stats.activeMembers,
      activePercentage: Math.round((stats.activeMembers / stats.totalMembers) * 100),
      totalDepartments: stats.totalDepartments,
      totalUnits: stats.totalUnits,
      averageMembersPerDepartment: Math.round(stats.totalMembers / stats.totalDepartments),
      averageMembersPerUnit: Math.round(stats.totalMembers / stats.totalUnits),
      largestDepartment: this.findLargestDepartment(stats.membersByDepartment),
      mostCommonRank: this.findMostCommonRank(stats.membersByRank),
      provinceWithMostMembers: this.findProvinceWithMostMembers(stats.membersByProvince),
    };

    return summary;
  }

  @Get('distribution/ranks')
  @ApiOperation({ summary: 'Obter distribuição por patente' })
  @ApiResponse({ status: 200, description: 'Distribuição por patente' })
  async getRankDistribution() {
    const stats = await this.statsService.getStats();
    
    const distribution = Object.entries(stats.membersByRank)
      .map(([rank, count]) => ({
        rank,
        displayName: this.getRankDisplayName(rank as MemberRank),
        count,
        percentage: Math.round((count / stats.totalMembers) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: stats.totalMembers,
      distribution,
    };
  }

  @Get('distribution/departments')
  @ApiOperation({ summary: 'Obter distribuição por departamento' })
  @ApiResponse({ status: 200, description: 'Distribuição por departamento' })
  async getDepartmentDistribution() {
    const stats = await this.statsService.getStats();
    
    const distribution = Object.entries(stats.membersByDepartment)
      .map(([department, count]) => ({
        department,
        displayName: this.getDepartmentDisplayName(department as Department),
        count,
        percentage: Math.round((count / stats.totalMembers) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: stats.totalMembers,
      distribution,
    };
  }

  @Get('distribution/provinces')
  @ApiOperation({ summary: 'Obter distribuição por província' })
  @ApiResponse({ status: 200, description: 'Distribuição por província' })
  async getProvinceDistribution() {
    const stats = await this.statsService.getStats();
    
    const distribution = Object.entries(stats.membersByProvince)
      .map(([province, count]) => ({
        province,
        count,
        percentage: Math.round((count / stats.totalMembers) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total: stats.totalMembers,
      distribution,
    };
  }

  /**
   * Funções auxiliares
   */
  private findLargestDepartment(membersByDepartment: Record<Department, number>) {
    let largest = { name: '', count: 0 };
    
    Object.entries(membersByDepartment).forEach(([dept, count]) => {
      if (count > largest.count) {
        largest = { name: dept, count };
      }
    });

    return {
      department: largest.name as Department,
      displayName: this.getDepartmentDisplayName(largest.name as Department),
      count: largest.count,
    };
  }

  private findMostCommonRank(membersByRank: Record<MemberRank, number>) {
    let mostCommon = { rank: '', count: 0 };
    
    Object.entries(membersByRank).forEach(([rank, count]) => {
      if (count > mostCommon.count) {
        mostCommon = { rank, count };
      }
    });

    return {
      rank: mostCommon.rank as MemberRank,
      displayName: this.getRankDisplayName(mostCommon.rank as MemberRank),
      count: mostCommon.count,
    };
  }

  private findProvinceWithMostMembers(membersByProvince: Record<string, number>) {
    let mostPopulated = { province: '', count: 0 };
    
    Object.entries(membersByProvince).forEach(([province, count]) => {
      if (count > mostPopulated.count) {
        mostPopulated = { province, count };
      }
    });

    return mostPopulated;
  }

  private getRankDisplayName(rank: MemberRank): string {
    const displayNames: Record<MemberRank, string> = {
      GUARDA: 'Guarda',
      SEGUNDO_CABO: '2º Cabo',
      PRIMEIRO_CABO: '1º Cabo',
      SARGENTO: 'Sargento',
      SARGENTO_PRINCIPAL: 'Sargento Principal',
      SUBINSPECTOR: 'Subinspector',
      INSPECTOR: 'Inspector',
      INSPECTOR_PRINCIPAL: 'Inspector Principal',
      ADJUNTO_SUPERINTENDENTE: 'Adjunto Superintendente',
      SUPERINTENDENTE: 'Superintendente',
      SUPERINTENDENTE_PRINCIPAL: 'Superintendente Principal',
      PRIMEIRO_ADJUNTO_COMISSARIO: 'Primeiro Adjunto Comissário',
      COMISSARIO: 'Comissário',
      INSPECTOR_GERAL: 'Inspector Geral',
    };

    return displayNames[rank] || rank;
  }

  private getDepartmentDisplayName(department: Department): string {
    const displayNames: Record<Department, string> = {
      POLICIA_PROTECAO: 'Polícia de Proteção',
      UNIDADE_CANINA: 'Unidade Canina',
      POLICIA_FRONTEIRAS: 'Polícia de Fronteiras',
      POLICIA_COSTEIRA_LACUSTRE_FLUVIAL: 'Polícia Costeira, Lacustre e Fluvial',
      POLICIA_TRANSITO: 'Polícia de Trânsito',
      UNIDADE_INTERVENCAO_RAPIDA: 'Unidade de Intervenção Rápida (UIR)',
      UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES:
        'Unidade de Proteção de Altas Individualidades (UPAI)',
      GRUPO_OPERACOES_ESPECIAIS: 'Grupo de Operações Especiais (GOE)',
    };

    return displayNames[department] || department;
  }
}