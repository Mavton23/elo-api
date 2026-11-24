import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HierarchyNodeDto,
  HierarchyFiltersDto,
  CreateHierarchyNodeDto,
  UpdateHierarchyNodeDto,
  AssignCommanderDto,
  AddMemberToNodeDto,
  HierarchyStatsDto,
} from '../dto/hierarchy.dto';
import { Department, UnitType, MemberRank, Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class HierarchyService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Obter hierarquia completa com filtros
   */
  async getHierarchy(filters?: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    const rootNode = await this.prisma.hierarchyNode.findFirst({
      where: {
        parentId: null,
        isActive: filters?.onlyActive ?? true,
        ...this.buildWhereFilters(filters),
      },
      include: this.buildIncludeOptions(filters),
      orderBy: { order: 'asc' },
    });

    if (!rootNode) {
      // Se não houver nó raiz, criar um padrão
      return this.getDefaultHierarchy();
    }

    return this.mapNodeToDto(rootNode, filters);
  }

  /**
   * Obter hierarquia filtrada
   */
  async getFilteredHierarchy(filters: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    return this.getHierarchy(filters);
  }

  /**
   * Buscar nó específico por ID
   */
  async findNodeById(id: string, filters?: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
      include: this.buildIncludeOptions(filters),
    });

    if (!node) {
      throw new NotFoundException(`Nó com ID ${id} não encontrado`);
    }

    return this.mapNodeToDto(node, filters);
  }

  /**
   * Buscar nó por código
   */
  async findNodeByCode(code: string, filters?: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { code },
      include: this.buildIncludeOptions(filters),
    });

    if (!node) {
      throw new NotFoundException(`Nó com código ${code} não encontrado`);
    }

    return this.mapNodeToDto(node, filters);
  }

  /**
   * Criar novo nó na hierarquia
   */
  async createNode(dto: CreateHierarchyNodeDto, userId: string): Promise<HierarchyNodeDto> {
    // Validar código único
    const existingCode = await this.prisma.hierarchyNode.findUnique({
      where: { code: dto.code },
    });

    if (existingCode) {
      throw new BadRequestException(`Código ${dto.code} já está em uso`);
    }

    // Validar parente se fornecido
    if (dto.parentId) {
      const parent = await this.prisma.hierarchyNode.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new BadRequestException(`Nó pai com ID ${dto.parentId} não encontrado`);
      }

      // Calcular nível baseado no parente
      dto['level'] = parent.level + 1;
    }

    const node = await this.prisma.hierarchyNode.create({
      data: {
        ...dto,
        createdById: userId,
        level: dto['level'] || 0,
      },
      include: {
        parent: true,
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            currentPosition: true,
          },
        },
      },
    });

    // Emitir evento
    this.eventEmitter.emit('hierarchy.node.created', {
      node,
      userId,
    });

    return this.mapNodeToDto(node);
  }

  /**
   * Atualizar nó existente
   */
  async updateNode(id: string, dto: UpdateHierarchyNodeDto, userId: string): Promise<HierarchyNodeDto> {
    // Verificar se o nó existe
    const existingNode = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!existingNode) {
      throw new NotFoundException(`Nó com ID ${id} não encontrado`);
    }

    // Validar código se for alterado
    if (dto.code && dto.code !== existingNode.code) {
      const existingCode = await this.prisma.hierarchyNode.findUnique({
        where: { code: dto.code },
      });

      if (existingCode) {
        throw new BadRequestException(`Código ${dto.code} já está em uso`);
      }
    }

    const node = await this.prisma.hierarchyNode.update({
      where: { id },
      data: {
        ...dto,
        updatedById: userId,
      },
      include: {
        parent: true,
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            currentPosition: true,
          },
        },
        children: {
          include: {
            commander: true,
          },
        },
      },
    });

    // Emitir evento
    this.eventEmitter.emit('hierarchy.node.updated', {
      node,
      userId,
      oldData: existingNode,
    });

    return this.mapNodeToDto(node);
  }

  /**
   * Atribuir comandante a um nó
   */
  async assignCommander(nodeId: string, dto: AssignCommanderDto): Promise<HierarchyNodeDto> {
    // Verificar se o nó existe
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Nó com ID ${nodeId} não encontrado`);
    }

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: {
        id: true,
        fullName: true,
        memberRank: true,
        currentPosition: true,
        department: true,
        unit: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${dto.userId} não encontrado`);
    }

    if (!user.isActive) {
      throw new BadRequestException('Usuário não está ativo');
    }

    // Atualizar nó com novo comandante
    const updatedNode = await this.prisma.hierarchyNode.update({
      where: { id: nodeId },
      data: {
        commanderId: dto.userId,
      },
      include: {
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            currentPosition: true,
          },
        },
      },
    });

    // Emitir evento
    this.eventEmitter.emit('hierarchy.commander.assigned', {
      node: updatedNode,
      commander: user,
      effectiveDate: dto.effectiveDate,
    });

    return this.mapNodeToDto(updatedNode);
  }

  /**
   * Remover comandante de um nó
   */
  async removeCommander(nodeId: string): Promise<HierarchyNodeDto> {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Nó com ID ${nodeId} não encontrado`);
    }

    const oldCommanderId = node.commanderId;
    const updatedNode = await this.prisma.hierarchyNode.update({
      where: { id: nodeId },
      data: {
        commanderId: null,
      },
      include: {
        commander: true,
      },
    });

    // Emitir evento
    if (oldCommanderId) {
      this.eventEmitter.emit('hierarchy.commander.removed', {
        node: updatedNode,
        oldCommanderId,
      });
    }

    return this.mapNodeToDto(updatedNode);
  }

  /**
   * Adicionar membro a um nó
   */
  async addMember(nodeId: string, dto: AddMemberToNodeDto): Promise<void> {
    // Verificar se o nó existe
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Nó com ID ${nodeId} não encontrado`);
    }

    // Verificar se o usuário existe
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuário com ID ${dto.userId} não encontrado`);
    }

    // Verificar se já é membro
    const existingMembership = await this.prisma.hierarchyMembership.findUnique({
      where: {
        nodeId_userId: {
          nodeId,
          userId: dto.userId,
        },
      },
    });

    if (existingMembership) {
      throw new BadRequestException('Usuário já é membro deste nó');
    }

    // Criar membro
    await this.prisma.hierarchyMembership.create({
      data: {
        nodeId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    // Emitir evento
    this.eventEmitter.emit('hierarchy.member.added', {
      nodeId,
      userId: dto.userId,
      role: dto.role,
    });
  }

  /**
   * Remover membro de um nó
   */
  async removeMember(nodeId: string, userId: string): Promise<void> {
    // Verificar se a associação existe
    const membership = await this.prisma.hierarchyMembership.findUnique({
      where: {
        nodeId_userId: {
          nodeId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado neste nó');
    }

    await this.prisma.hierarchyMembership.delete({
      where: {
        nodeId_userId: {
          nodeId,
          userId,
        },
      },
    });

    // Emitir evento
    this.eventEmitter.emit('hierarchy.member.removed', {
      nodeId,
      userId,
    });
  }

  /**
   * Buscar nós por diversos critérios
   */
  async searchNodes(filters: HierarchyFiltersDto): Promise<HierarchyNodeDto[]> {
    const where = this.buildWhereFilters(filters);

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const nodes = await this.prisma.hierarchyNode.findMany({
      where,
      include: this.buildIncludeOptions(filters),
      orderBy: [
        { level: 'asc' },
        { order: 'asc' },
        { name: 'asc' },
      ],
      take: filters.maxDepth ? undefined : 100, // Limite padrão
    });

    return Promise.all(
      nodes.map(node => this.mapNodeToDto(node, filters))
    );
  }

  /**
   * Obter todos os departamentos
   */
  async getDepartments(): Promise<HierarchyNodeDto[]> {
    const departments = await this.prisma.hierarchyNode.findMany({
      where: {
        type: 'DEPARTAMENTO',
        isActive: true,
      },
      include: {
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
              },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return Promise.all(
      departments.map(dept => this.mapNodeToDto(dept))
    );
  }

  /**
   * Obter departamento específico
   */
  async getDepartment(id: string): Promise<HierarchyNodeDto> {
    return this.findNodeById(id);
  }

  /**
   * Obter todas as unidades
   */
  async getUnits(filters?: { province?: string; unitType?: UnitType }): Promise<HierarchyNodeDto[]> {
    const where: any = {
      type: { notIn: ['DIRECCAO_NACIONAL', 'DEPARTAMENTO'] },
      isActive: true,
    };

    if (filters?.province) where.province = filters.province;
    if (filters?.unitType) where.type = filters.unitType;

    const units = await this.prisma.hierarchyNode.findMany({
      where,
      include: {
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });

    return Promise.all(
      units.map(unit => this.mapNodeToDto(unit))
    );
  }

  /**
   * Obter unidade específica
   */
  async getUnit(id: string): Promise<HierarchyNodeDto> {
    return this.findNodeById(id);
  }

  /**
   * Obter hierarquia de um usuário específico
   */
  async getUserHierarchy(userId: string): Promise<HierarchyNodeDto | null> {
    // Buscar nós onde o usuário é membro
    const memberships = await this.prisma.hierarchyMembership.findMany({
      where: { userId },
      include: {
        node: {
          include: {
            parent: true,
            commander: true,
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    memberRank: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (memberships.length > 0) return this.mapNodeToDto(memberships[0].node);

    // Sem vínculo explícito: deduzir pela unidade, departamento ou província do efetivo.
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { unit: true, department: true, province: true } });
    if (!user) return null;
    const node =
      (await this.prisma.hierarchyNode.findFirst({ where: { isActive: true, name: { equals: user.unit, mode: 'insensitive' } } })) ??
      (await this.prisma.hierarchyNode.findFirst({ where: { isActive: true, type: 'DEPARTAMENTO', department: user.department } })) ??
      (await this.prisma.hierarchyNode.findFirst({ where: { isActive: true, type: 'COMANDO_PROVINCIAL', province: user.province } }));
    return node ? this.mapNodeToDto(node, { includeChildren: false } as any) : null;
  }

  /**
   * Obter nós comandados por um usuário
   */
  async getUserCommandedNodes(userId: string): Promise<HierarchyNodeDto[]> {
    const nodes = await this.prisma.hierarchyNode.findMany({
      where: {
        commanderId: userId,
        isActive: true,
      },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
              },
            },
          },
        },
      },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });

    return Promise.all(
      nodes.map(node => this.mapNodeToDto(node))
    );
  }

  /**
   * Obter estatísticas da hierarquia
   */
  async getHierarchyStats(): Promise<HierarchyStatsDto> {
    const [
      totalNodes,
      activeNodes,
      totalMembers,
      nodesByType,
      membersByDepartment,
      membersByProvince,
      nodesWithoutCommander,
    ] = await Promise.all([
      this.prisma.hierarchyNode.count(),
      this.prisma.hierarchyNode.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.hierarchyNode.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['department'],
        _count: { id: true },
      }),
      this.prisma.user.groupBy({
        by: ['province'],
        _count: { id: true },
      }),
      this.prisma.hierarchyNode.count({
        where: {
          isActive: true,
          commanderId: null,
          type: { in: ['COMANDO_PROVINCIAL', 'COMANDO_DISTRITAL', 'ESQUADRA'] },
        },
      }),
    ]);

    return {
      totalNodes,
      activeNodes,
      totalMembers,
      membersByDepartment: membersByDepartment.reduce((acc, item) => {
        acc[item.department] = item._count.id;
        return acc;
      }, {}),
      membersByProvince: membersByProvince.reduce((acc, item) => {
        acc[item.province] = item._count.id;
        return acc;
      }, {}),
      nodesByType: nodesByType.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {}),
      nodesWithoutCommander,
    };
  }

  /**
   * Obter metadados
   */
  async getDisplayNames() {
    return {
      ranks: this.getRanksList(),
      departments: this.getDepartmentsList(),
      unitTypes: this.getUnitTypes(),
    };
  }

  async getProvinces(): Promise<{ value: string; label: string }[]> {
    const provinces = await this.prisma.hierarchyNode.findMany({
      where: {
        province: { not: null },
        isActive: true,
      },
      distinct: ['province'],
      select: { province: true },
      orderBy: { province: 'asc' },
    });

    return provinces
      .filter(p => p.province)
      .map(p => ({
        value: p.province!,
        label: p.province!,
      }));
  }

  getUnitTypes(): { value: string; label: string }[] {
    const unitTypes = Object.values(UnitType);
    const displayNames = this.getUnitTypeDisplayNames();

    return unitTypes.map(type => ({
      value: type,
      label: displayNames[type] || type,
    }));
  }

  getRanks(): { value: string; label: string }[] {
    return this.getRanksList();
  }

  getDepartmentsList(): { value: string; label: string }[] {
    const departments = Object.values(Department);
    const displayNames = this.getDepartmentDisplayNames();

    return departments.map(dept => ({
      value: dept,
      label: displayNames[dept] || dept,
    }));
  }

  /**
   * Métodos auxiliares privados
   */
  private async getDefaultHierarchy(): Promise<HierarchyNodeDto> {
    // Criar nó raiz padrão se não existir
    const rootNode = {
      id: 'ministry-root',
      type: 'DIRECCAO_NACIONAL' as UnitType,
      name: 'Ministério do Interior',
      code: 'MINT-001',
      description: 'Órgão central de coordenação das forças de segurança em Moçambique',
      isActive: true,
      level: 0,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      ...rootNode,
      data: {
        minister: 'Ministro Actual',
        viceMinister: 'Vice-Ministro Actual',
      },
      children: [],
      memberCount: 0,
      activeMemberCount: 0,
    };
  }

  private buildWhereFilters(filters?: HierarchyFiltersDto): Prisma.HierarchyNodeWhereInput {
    const where: Prisma.HierarchyNodeWhereInput = {};

    if (filters?.onlyActive !== false) {
      where.isActive = true;
    }

    if (filters?.department) {
      where.department = filters.department;
    }

    if (filters?.province) {
      where.province = filters.province;
    }

    if (filters?.unitType) {
      where.type = filters.unitType;
    }

    if (filters?.municipality) {
      where.municipality = filters.municipality;
    }

    if (filters?.district) {
      where.district = filters.district;
    }

    return where;
  }

  private buildIncludeOptions(filters?: HierarchyFiltersDto): Prisma.HierarchyNodeInclude {
    const include: Prisma.HierarchyNodeInclude = {
      commander: {
        select: {
          id: true,
          fullName: true,
          memberRank: true,
          currentPosition: true,
        },
      },
    };

    if (filters?.includeChildren !== false) {
      include.children = {
        where: filters?.onlyActive !== false ? { isActive: true } : undefined,
        include: {
          commander: true,
        },
        orderBy: { order: 'asc' },
      };
    }

    if (filters?.includeMembers) {
      include.memberships = {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
              currentPosition: true,
              isActive: true,
            },
          },
        },
      };
    }

    return include;
  }

  /**
   * Efetivo de um nó: vínculos explícitos (HierarchyMembership) OU o efetivo
   * derivado dos dados do utilizador (departamento, província, unidade).
   * Assim a estrutura reflete o efetivo real mesmo antes de os vínculos serem
   * geridos manualmente.
   */
  memberWhere(node: { id: string; type: string; department?: string | null; province?: string | null; name: string; parentId?: string | null }): Prisma.UserWhereInput {
    // Topo da estrutura: todo o efetivo.
    if (node.type === 'DIRECCAO_NACIONAL' && !node.parentId) return {};
    const derived: Prisma.UserWhereInput[] = [];
    if (node.type === 'DEPARTAMENTO' && node.department) derived.push({ department: node.department as any });
    else if (node.type === 'COMANDO_PROVINCIAL' && node.province)
      derived.push({ province: node.province, ...(node.department ? { department: node.department as any } : {}) });
    else derived.push({ unit: { equals: node.name, mode: 'insensitive' } });
    return { OR: [{ memberships: { some: { nodeId: node.id } } }, ...derived] };
  }

  private async mapNodeToDto(node: any, filters?: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    const where = this.memberWhere(node);
    const [memberCount, activeMemberCount] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: { AND: [where, { isActive: true }] } }),
    ]);

    // Buscar top membros se necessário
    let topMembers = [];
    if (filters?.includeMembers && node.memberships) {
      topMembers = node.memberships
        .filter((m: any) => m.user.isActive)
        .slice(0, 10)
        .map((m: any) => ({
          id: m.user.id,
          name: m.user.fullName,
          rank: m.user.memberRank,
          position: m.user.currentPosition,
          isActive: m.user.isActive,
        }));
    }

    // Mapear filhos recursivamente
    let children: HierarchyNodeDto[] = [];
    if (node.children && filters?.includeChildren !== false) {
      children = await Promise.all(
        node.children.map((child: any) =>
          this.mapNodeToDto(child, {
            ...filters,
            maxDepth: filters?.maxDepth ? filters.maxDepth - 1 : undefined,
          }),
        ),
      );
    }

    return {
      id: node.id,
      type: node.type,
      name: node.name,
      code: node.code,
      description: node.description || undefined,
      parentId: node.parentId || undefined,
      department: node.department || undefined,
      province: node.province || undefined,
      municipality: node.municipality || undefined,
      district: node.district || undefined,
      address: node.address || undefined,
      phone: node.phone || undefined,
      email: node.email || undefined,
      commander: node.commander
        ? {
            id: node.commander.id,
            name: node.commander.fullName,
            rank: node.commander.memberRank,
            position: node.commander.currentPosition,
          }
        : undefined,
      operationalHours: node.operationalHours || undefined,
      jurisdiction: node.jurisdiction || undefined,
      capacity: node.capacity || undefined,
      data: node.data as Record<string, any>,
      memberCount,
      activeMemberCount,
      topMembers,
      children,
      isActive: node.isActive,
      level: node.level,
      order: node.order,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private getDepartmentDisplayNames(): Record<Department, string> {
    return {
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

  private getUnitTypeDisplayNames(): Record<UnitType, string> {
    return {
      ESQUADRA: 'Esquadra',
      COMANDO_DISTRITAL: 'Comando Distrital',
      COMANDO_PROVINCIAL: 'Comando Provincial',
      DIRECCAO_NACIONAL: 'Direcção Nacional',
      QUARTEL: 'Quartel',
      SUBUNIDADE: 'Subunidade',
      DEPARTAMENTO: 'Departamento',
      SECCAO: 'Secção',
      COMPANHIA: 'Companhia'
    };
  }

  private getRanksList(): { value: string; label: string }[] {
    const ranks: MemberRank[] = [
      'GUARDA', 'SEGUNDO_CABO', 'PRIMEIRO_CABO', 'SARGENTO',
      'SARGENTO_PRINCIPAL', 'SUBINSPECTOR', 'INSPECTOR',
      'INSPECTOR_PRINCIPAL', 'ADJUNTO_SUPERINTENDENTE',
      'SUPERINTENDENTE', 'SUPERINTENDENTE_PRINCIPAL',
      'PRIMEIRO_ADJUNTO_COMISSARIO', 'COMISSARIO', 'INSPECTOR_GERAL',
    ];

    return ranks.map(rank => ({
      value: rank,
      label: this.getRankDisplayName(rank),
    }));
  }
}