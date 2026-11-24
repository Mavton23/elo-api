import { NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService } from './hierarchy.service';
import {
  OrganizationalChartDto,
  HierarchyFiltersDto,
  HierarchyNodeDto,
} from '../dto/hierarchy.dto';
import { OrgChartLinkDto } from '../dto/org-chart.dto';

@Injectable()
export class OrgChartService {
  constructor(
    private prisma: PrismaService,
    private hierarchyService: HierarchyService,
  ) {}

  /**
   * Gerar organograma completo
   */
  async generateOrgChart(filters?: HierarchyFiltersDto): Promise<OrganizationalChartDto> {
    const hierarchy = await this.hierarchyService.getHierarchy({
      ...filters,
      includeChildren: true,
      includeMembers: filters?.includeMembers || false,
    });

    // Calcular totais
    const totals = await this.calculateTotals(hierarchy);

    // Extrair departamentos e províncias únicas
    const departments = await this.extractUniqueDepartments(hierarchy);
    const provinces = await this.extractUniqueProvinces(hierarchy);

    // const { nodes, links } = await this.extractNodesAndLinks(hierarchy);

    return {
      root: hierarchy,
      totalNodes: totals.nodes,
      totalMembers: totals.members,
      departments,
      provinces,
      // nodes,
      // links
    };
  }

  /**
   * Gerar organograma de um departamento
   */
  async generateDepartmentOrgChart(departmentId: string): Promise<OrganizationalChartDto> {
    const department = await this.hierarchyService.findNodeById(departmentId, {
      includeChildren: true,
      includeMembers: true,
    });

    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }

    const totals = await this.calculateTotals(department);
    const provinces = await this.extractUniqueProvinces(department);

    return {
      root: department,
      totalNodes: totals.nodes,
      totalMembers: totals.members,
      departments: [department.department!],
      provinces,
    };
  }

  /**
   * Gerar organograma de uma unidade
   */
  async generateUnitOrgChart(unitId: string): Promise<OrganizationalChartDto> {
    const unit = await this.hierarchyService.findNodeById(unitId, {
      includeChildren: true,
      includeMembers: true,
    });

    if (!unit) {
      throw new NotFoundException('Unidade não encontrada');
    }

    const totals = await this.calculateTotals(unit);

    return {
      root: unit,
      totalNodes: totals.nodes,
      totalMembers: totals.members,
      departments: unit.department ? [unit.department] : [],
      provinces: unit.province ? [unit.province] : [],
    };
  }

  /**
   * Gerar organograma simplificado
   */
  async generateSimplifiedOrgChart(maxDepth: number = 3): Promise<OrganizationalChartDto> {
    const hierarchy = await this.hierarchyService.getHierarchy({
      includeChildren: true,
      maxDepth,
      includeMembers: false,
    });

    const totals = await this.calculateTotals(hierarchy, maxDepth);
    const departments = await this.extractUniqueDepartments(hierarchy);
    const provinces = await this.extractUniqueProvinces(hierarchy);

    return {
      root: hierarchy,
      totalNodes: totals.nodes,
      totalMembers: totals.members,
      departments,
      provinces,
    };
  }

   /**
   * Extrair nós e links para organograma
   */
  private async extractNodesAndLinks(node: HierarchyNodeDto): Promise<{
    nodes: HierarchyNodeDto[];
    links: OrgChartLinkDto[];
  }> {
    const nodes: HierarchyNodeDto[] = [];
    const links: OrgChartLinkDto[] = [];

    // Função recursiva para coletar nós
    const collectNodes = (currentNode: HierarchyNodeDto) => {
      nodes.push(currentNode);

      if (currentNode.children && currentNode.children.length > 0) {
        currentNode.children.forEach(child => {
          // Adicionar link entre pai e filho
          links.push({
            source: currentNode.id,
            target: child.id,
            type: 'parent-child',
            description: `${currentNode.name} → ${child.name}`,
          });

          // Coletar recursivamente
          collectNodes(child);
        });
      }
    };

    // Iniciar coleta a partir do nó raiz
    collectNodes(node);

    return { nodes, links };
  }

  /**
   * Gerar organograma em formato para bibliotecas de gráficos
   */
  async generateChartJsData(filters?: HierarchyFiltersDto) {
    const hierarchy = await this.hierarchyService.getHierarchy({
      ...filters,
      includeChildren: true,
    });

    return this.convertToChartJsFormat(hierarchy);
  }

  /**
   * Gerar organograma para exportação (JSON, CSV, etc.)
   */
  async generateExportableOrgChart(filters?: HierarchyFiltersDto) {
    const hierarchy = await this.hierarchyService.getHierarchy({
      ...filters,
      includeChildren: true,
      includeMembers: true,
    });

    return this.flattenHierarchy(hierarchy);
  }

  /**
   * Métodos auxiliares privados
   */
  private async calculateTotals(node: HierarchyNodeDto, maxDepth?: number): Promise<{ nodes: number; members: number }> {
    let nodeCount = 1; // Contar o nó atual
    let memberCount = node.memberCount || 0;

    if (node.children && (maxDepth === undefined || maxDepth > 0)) {
      for (const child of node.children) {
        const childTotals = await this.calculateTotals(
          child,
          maxDepth ? maxDepth - 1 : undefined,
        );
        nodeCount += childTotals.nodes;
        memberCount += childTotals.members;
      }
    }

    return { nodes: nodeCount, members: memberCount };
  }

  private async extractUniqueDepartments(node: HierarchyNodeDto): Promise<string[]> {
    const departments = new Set<string>();

    if (node.department) {
      departments.add(node.department);
    }

    if (node.children) {
      for (const child of node.children) {
        const childDepartments = await this.extractUniqueDepartments(child);
        childDepartments.forEach(dept => departments.add(dept));
      }
    }

    return Array.from(departments);
  }

  private async extractUniqueProvinces(node: HierarchyNodeDto): Promise<string[]> {
    const provinces = new Set<string>();

    if (node.province) {
      provinces.add(node.province);
    }

    if (node.children) {
      for (const child of node.children) {
        const childProvinces = await this.extractUniqueProvinces(child);
        childProvinces.forEach(prov => provinces.add(prov));
      }
    }

    return Array.from(provinces).filter(Boolean);
  }

  private convertToChartJsFormat(node: HierarchyNodeDto): any {
    const chartNode = {
      id: node.id,
      name: node.name,
      title: `${node.type} - ${node.name}`,
      className: `node-type-${node.type.toLowerCase()}`,
      children: [] as any[],
    };

    // Adicionar dados extras
    const extras: any = {
      type: node.type,
      department: node.department,
      province: node.province,
      commander: node.commander?.name,
      memberCount: node.memberCount,
    };

    // Filhos
    if (node.children && node.children.length > 0) {
      chartNode.children = node.children.map(child =>
        this.convertToChartJsFormat(child),
      );
    }

    return { ...chartNode, ...extras };
  }

  private flattenHierarchy(node: HierarchyNodeDto, parentPath: string = ''): any[] {
    const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
    const flatNode = {
      id: node.id,
      path: currentPath,
      type: node.type,
      name: node.name,
      code: node.code,
      department: node.department,
      province: node.province,
      commander: node.commander?.name,
      commanderRank: node.commander?.rank,
      memberCount: node.memberCount,
      activeMemberCount: node.activeMemberCount,
      isActive: node.isActive,
      level: node.level,
    };

    const result = [flatNode];

    if (node.children) {
      for (const child of node.children) {
        result.push(...this.flattenHierarchy(child, currentPath));
      }
    }

    return result;
  }
}