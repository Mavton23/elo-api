import { HierarchyService } from '../../hierarchy/services/hierarchy.service';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  HierarchyFilterDto,
  HierarchyCreateDataDto,
  HierarchyUpdateDataDto,
  HierarchyMoveDataDto,
  HierarchyMemberDto,
  HierarchyStatsDto,
} from '../dto/hierarchy-admin.dto';
import { ActivityAdminService } from './activity-admin.service';
import { NodePathItem } from '../interfaces/hierarchy.interface';

@Injectable()
export class HierarchyAdminService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityAdminService,
    private hierarchy: HierarchyService,
  ) {}

  /** Efetivo do nó: vínculos explícitos + efetivo derivado (departamento/província/unidade). */
  private countMembers(node: any) {
    return this.prisma.user.count({ where: { AND: [this.hierarchy.memberWhere(node), { isActive: true }] } });
  }

  async getNodes(filter: HierarchyFilterDto) {
    const {
      search,
      type,
      department,
      province,
      isActive,
      commanderId,
      parentId,
      page = 1,
      limit = 20,
    } = filter;

    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (department) where.department = department;
    if (province) where.province = { contains: province, mode: 'insensitive' };
    if (isActive !== undefined) {
      if (typeof isActive === 'string') {
        where.isActive = isActive === 'true'
      } else {
        where.isActive = isActive;
      }
    }
    if (commanderId) where.commanderId = commanderId;
    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }

    const [nodes, total] = await Promise.all([
      this.prisma.hierarchyNode.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          commander: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
            },
          },
          _count: {
            select: {
              children: true,
              memberships: true,
            },
          },
        },
        orderBy: [
          { parentId: 'asc' },
          { order: 'asc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.hierarchyNode.count({ where }),
    ]);

    // Enriquecer dados
    const enrichedNodes = nodes.map(node => ({
      ...node,
      memberCount: node._count.memberships,
      childrenCount: node._count.children,
      parentName: node.parent?.name,
      commanderName: node.commander?.fullName,
      commanderRank: node.commander?.memberRank,
    }));

    return {
      data: enrichedNodes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTree(rootId?: string, maxDepth: number = 10) {
    const buildTree = async (parentId: string | null, depth: number = 0): Promise<any[]> => {
      if (depth >= maxDepth) return [];

      const nodes = await this.prisma.hierarchyNode.findMany({
        where: { parentId },
        include: {
          commander: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
            },
          },
          _count: {
            select: {
              children: true,
              memberships: true,
            },
          },
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
      });

      const tree = await Promise.all(
        nodes.map(async node => ({
          ...node,
          memberCount: await this.countMembers(node),
          childrenCount: node._count.children,
          commanderName: node.commander?.fullName,
          children: await buildTree(node.id, depth + 1),
        })),
      );

      return tree;
    };

    if (rootId) {
      const rootNode = await this.prisma.hierarchyNode.findUnique({
        where: { id: rootId },
        include: {
          commander: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
            },
          },
          _count: {
            select: {
              children: true,
              memberships: true,
            },
          },
        },
      });

      if (!rootNode) {
        throw new NotFoundException('Nó raiz não encontrado');
      }

      return {
        ...rootNode,
        memberCount: await this.countMembers(rootNode),
        childrenCount: rootNode._count.children,
        commanderName: rootNode.commander?.fullName,
        children: await buildTree(rootId, 1),
      };
    }

    return buildTree(null, 0);
  }

  async getStats(): Promise<HierarchyStatsDto> {
    const [
      totalNodes,
      activeNodes,
      inactiveNodes,
      nodesByType,
      nodesByDepartment,
      nodesByProvince,
      totalMemberships,
    ] = await Promise.all([
      this.prisma.hierarchyNode.count(),
      this.prisma.hierarchyNode.count({ where: { isActive: true } }),
      this.prisma.hierarchyNode.count({ where: { isActive: false } }),
      this.prisma.hierarchyNode.groupBy({
        by: ['type'],
        _count: true,
      }),
      this.prisma.hierarchyNode.groupBy({
        by: ['department'],
        _count: true,
      }),
      this.prisma.hierarchyNode.groupBy({
        by: ['province'],
        _count: true,
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    // Contar unidades por tipo
    const totalDepartments = await this.prisma.hierarchyNode.count({
      where: { type: 'DEPARTAMENTO' },
    });

    const totalUnits = await this.prisma.hierarchyNode.count({
      where: { type: { notIn: ['DIRECCAO_NACIONAL', 'DEPARTAMENTO'] } },
    });

    return {
      totalNodes,
      totalDepartments,
      totalUnits,
      totalMembers: totalMemberships,
      activeNodes,
      inactiveNodes,
      byType: nodesByType.reduce(
        (acc, curr) => ({ ...acc, [curr.type]: curr._count }),
        {},
      ),
      byDepartment: nodesByDepartment.reduce(
        (acc, curr) => ({ ...acc, [curr.department  || 'Não Definido']: curr._count }),
        {},
      ),
      byProvince: nodesByProvince.reduce(
        (acc, curr) => ({ ...acc, [curr.province || 'Não Definido']: curr._count }),
        {},
      ),
    };
  }

  async getNode(id: string) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            isActive: true,
            _count: {
              select: {
                memberships: true,
              },
            },
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
            institutionalEmail: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        updatedBy: {
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
                department: true,
                unit: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    return {
      ...node,
      memberCount: node.memberships.length,
      childrenCount: node.children.length,
    };
  }

  async createNode(nodeData: HierarchyCreateDataDto) {
    // Verificar se código já existe
    const existingNode = await this.prisma.hierarchyNode.findUnique({
      where: { code: nodeData.code },
    });

    if (existingNode) {
      throw new ConflictException('Já existe um nó com este código');
    }

    // Verificar pai se fornecido
    if (nodeData.parentId) {
      const parent = await this.prisma.hierarchyNode.findUnique({
        where: { id: nodeData.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Nó pai não encontrado');
      }
    }

    // Verificar comandante se fornecido
    if (nodeData.commanderId) {
      const commander = await this.prisma.user.findUnique({
        where: { id: nodeData.commanderId },
      });

      if (!commander) {
        throw new NotFoundException('Comandante não encontrado');
      }
    }

    // Encontrar ordem apropriada
    const maxOrder = await this.prisma.hierarchyNode.findFirst({
      where: { parentId: nodeData.parentId || null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const order = (maxOrder?.order || 0) + 1;

    // Criar nó
    const node = await this.prisma.hierarchyNode.create({
      data: {
        type: nodeData.type,
        name: nodeData.name,
        code: nodeData.code,
        description: nodeData.description,
        parentId: nodeData.parentId,
        department: nodeData.department,
        province: nodeData.province,
        // unitType: nodeData.unitType,
        commanderId: nodeData.commanderId,
        municipality: nodeData.municipality,
        district: nodeData.district,
        address: nodeData.address,
        phone: nodeData.phone,
        email: nodeData.email,
        operationalHours: nodeData.operationalHours,
        jurisdiction: nodeData.jurisdiction,
        data: nodeData.data,
        order,
      },
      include: {
        parent: true,
        commander: true,
      },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'NODE_CREATED',
      description: `Nó ${node.name} (${node.code}) criado`,
      targetType: 'NODE',
      targetId: node.id,
      targetName: node.name,
    });

    return this.getNode(node.id);
  }

  async updateNode(id: string, nodeData: HierarchyUpdateDataDto) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Verificar se código já existe (se for alterado)
    if (nodeData.code && nodeData.code !== node.code) {
      const existingNode = await this.prisma.hierarchyNode.findUnique({
        where: { code: nodeData.code },
      });

      if (existingNode) {
        throw new ConflictException('Já existe um nó com este código');
      }
    }

    // Verificar pai se fornecido (evitar ciclos)
    if (nodeData.parentId && nodeData.parentId !== node.parentId) {
      if (nodeData.parentId === id) {
        throw new BadRequestException('Um nó não pode ser pai de si mesmo');
      }

      // Verificar se o novo pai existe
      const parent = await this.prisma.hierarchyNode.findUnique({
        where: { id: nodeData.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Nó pai não encontrado');
      }

      // Verificar ciclos
      const isDescendant = await this.isDescendant(nodeData.parentId, id);
      if (isDescendant) {
        throw new BadRequestException('Não é possível criar ciclo na hierarquia');
      }
    }

    // Verificar comandante se fornecido
    if (nodeData.commanderId && nodeData.commanderId !== node.commanderId) {
      const commander = await this.prisma.user.findUnique({
        where: { id: nodeData.commanderId },
      });

      if (!commander) {
        throw new NotFoundException('Comandante não encontrado');
      }
    }

    // Atualizar nó
    const updatedNode = await this.prisma.hierarchyNode.update({
      where: { id },
      data: {
        name: nodeData.name,
        code: nodeData.code,
        description: nodeData.description,
        parentId: nodeData.parentId,
        commanderId: nodeData.commanderId,
        isActive: nodeData.isActive,
        department: nodeData.department,
        province: nodeData.province,
        municipality: nodeData.municipality,
        district: nodeData.district,
        address: nodeData.address,
        phone: nodeData.phone,
        email: nodeData.email,
        operationalHours: nodeData.operationalHours,
        jurisdiction: nodeData.jurisdiction,
        data: nodeData.data,
      },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'NODE_UPDATED',
      description: `Nó ${updatedNode.name} (${updatedNode.code}) atualizado`,
      targetType: 'NODE',
      targetId: updatedNode.id,
      targetName: updatedNode.name,
    });

    return this.getNode(id);
  }

  async deleteNode(id: string) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            memberships: true,
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Verificar se tem filhos
    if (node._count.children > 0) {
      throw new BadRequestException(
        'Não é possível excluir um nó que possui filhos. Exclua os filhos primeiro ou mova-os para outro nó.',
      );
    }

    // Verificar se tem membros
    if (node._count.memberships > 0) {
      throw new BadRequestException(
        'Não é possível excluir um nó que possui membros. Remova os membros primeiro.',
      );
    }

    await this.prisma.hierarchyNode.delete({
      where: { id },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'WARNING',
      module: 'HIERARCHY',
      action: 'NODE_DELETED',
      description: `Nó ${node.name} (${node.code}) excluído`,
      targetType: 'NODE',
      targetId: node.id,
      targetName: node.name,
    });

    return { message: 'Nó excluído com sucesso' };
  }

  async moveNode(id: string, moveData: HierarchyMoveDataDto) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Verificar novo pai (se fornecido)
    if (moveData.newParentId && moveData.newParentId !== node.parentId) {
      if (moveData.newParentId === id) {
        throw new BadRequestException('Um nó não pode ser pai de si mesmo');
      }

      const newParent = await this.prisma.hierarchyNode.findUnique({
        where: { id: moveData.newParentId },
      });

      if (!newParent) {
        throw new NotFoundException('Novo nó pai não encontrado');
      }

      // Verificar ciclos
      const isDescendant = await this.isDescendant(moveData.newParentId, id);
      if (isDescendant) {
        throw new BadRequestException('Não é possível criar ciclo na hierarquia');
      }
    }

    const newParentId = moveData.newParentId === undefined ? node.parentId : moveData.newParentId;

    // Se posição for fornecida, reordenar irmãos
    if (moveData.position !== undefined) {
      await this.reorderSiblings(id, newParentId, moveData.position);
    }

    // Atualizar nó
    const updatedNode = await this.prisma.hierarchyNode.update({
      where: { id },
      data: {
        parentId: newParentId,
      },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'NODE_MOVED',
      description: `Nó ${updatedNode.name} movido`,
      targetType: 'NODE',
      targetId: updatedNode.id,
      targetName: updatedNode.name,
      metadata: {
        oldParentId: node.parentId,
        newParentId: updatedNode.parentId,
      },
    });

    return this.getNode(id);
  }

  async getNodeMembers(id: string) {
    const node = await this.prisma.hierarchyNode.findUnique({ where: { id } });
    if (!node) throw new NotFoundException('Nó não encontrado');

    const [explicit, derived] = await Promise.all([
      this.prisma.hierarchyMembership.findMany({ where: { nodeId: id }, select: { userId: true, role: true, joinedAt: true } }),
      this.prisma.user.findMany({
        where: this.hierarchy.memberWhere(node),
        select: { id: true, nip: true, fullName: true, memberRank: true, department: true, unit: true, province: true, institutionalEmail: true, isActive: true },
        orderBy: { fullName: 'asc' },
        take: 300,
      }),
    ]);
    const roles = new Map(explicit.map((m) => [m.userId, m]));
    // "explicit" indica vínculo registado manualmente (pode ser removido); os restantes vêm dos dados do efetivo.
    return derived.map((u) => ({ ...u, role: roles.get(u.id)?.role ?? 'EFETIVO', joinedAt: roles.get(u.id)?.joinedAt ?? null, explicit: roles.has(u.id) }));
  }

  async addMembers(nodeId: string, members: HierarchyMemberDto[]) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Verificar usuários
    const userIds = members.map(m => m.userId);
    const existingUsers = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    });

    if (existingUsers.length !== members.length) {
      throw new NotFoundException('Um ou mais usuários não encontrados');
    }

    // Preparar dados para criação
    const membershipData = members.map(member => ({
      nodeId,
      userId: member.userId,
      role: member.role,
    }));

    // Criar membros
    await this.prisma.hierarchyMembership.createMany({
      data: membershipData,
      skipDuplicates: true,
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'MEMBERS_ADDED',
      description: `${members.length} membros adicionados ao nó ${node.name}`,
      targetType: 'NODE',
      targetId: node.id,
      targetName: node.name,
      metadata: {
        memberCount: members.length,
        userIds: userIds,
      },
    });

    return { message: 'Membros adicionados com sucesso', count: members.length };
  }

  async removeMembers(nodeId: string, userIds: string[]) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Remover membros
    await this.prisma.hierarchyMembership.deleteMany({
      where: {
        nodeId,
        userId: { in: userIds },
      },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'MEMBERS_REMOVED',
      description: `${userIds.length} membros removidos do nó ${node.name}`,
      targetType: 'NODE',
      targetId: node.id,
      targetName: node.name,
      metadata: {
        memberCount: userIds.length,
        userIds,
      },
    });

    return { message: 'Membros removidos com sucesso', count: userIds.length };
  }

  async toggleNodeStatus(id: string, active: boolean) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException('Nó não encontrado');
    }

    const updatedNode = await this.prisma.hierarchyNode.update({
      where: { id },
      data: { isActive: active },
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: active ? 'NODE_ACTIVATED' : 'NODE_DEACTIVATED',
      description: `Nó ${updatedNode.name} ${active ? 'ativado' : 'desativado'}`,
      targetType: 'NODE',
      targetId: updatedNode.id,
      targetName: updatedNode.name,
    });

    return {
      id: updatedNode.id,
      isActive: updatedNode.isActive,
      message: `Nó ${active ? 'ativado' : 'desativado'} com sucesso`,
    };
  }

  async getNodeChildren(id: string) {
    const children = await this.prisma.hierarchyNode.findMany({
      where: { parentId: id },
      include: {
        commander: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        _count: {
          select: {
            children: true,
            memberships: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return children.map(node => ({
      ...node,
      memberCount: node._count.memberships,
      childrenCount: node._count.children,
      commanderName: node.commander?.fullName,
    }));
  }

  async getNodePath(id: string): Promise<NodePathItem[]>{
    const path: NodePathItem[] = [];
    let currentNode = await this.prisma.hierarchyNode.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        parentId: true,
      },
    });

    if (!currentNode) {
      throw new NotFoundException('Nó não encontrado');
    }

    // Adicionar nó atual ao caminho
    path.unshift(currentNode);

    // Subir na hierarquia até a raiz
    while (currentNode.parentId) {
      currentNode = await this.prisma.hierarchyNode.findUnique({
        where: { id: currentNode.parentId },
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          parentId: true,
        },
      });

      if (!currentNode) break;
      path.unshift(currentNode);
    }

    return path;
  }

  async searchMembers(filter: any) {
    const { department, rank } = filter;
    const search = filter.search ?? filter.q;
    const limit = Math.min(50, Number(filter.limit) || 20);
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) where.department = department;
    if (rank) where.memberRank = rank;
    where.isActive = true;

    const users = await this.prisma.user.findMany({
      where,
      take: limit,
      select: {
        id: true,
        nip: true,
        fullName: true,
        memberRank: true,
        department: true,
        unit: true,
        province: true,
        institutionalEmail: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return users;
  }

  async bulkUpdateOrder(updates: Array<{ id: string; order: number }>) {
    // Verificar se todos os nós existem
    const nodeIds = updates.map(u => u.id);
    const nodes = await this.prisma.hierarchyNode.findMany({
      where: { id: { in: nodeIds } },
      select: { id: true },
    });

    if (nodes.length !== updates.length) {
      throw new NotFoundException('Um ou mais nós não encontrados');
    }

    // Atualizar em transação
    const transactions = updates.map(({ id, order }) =>
      this.prisma.hierarchyNode.update({
        where: { id },
        data: { order },
      }),
    );

    await this.prisma.$transaction(transactions);

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'HIERARCHY',
      action: 'NODES_REORDERED',
      description: `Ordem de ${updates.length} nós atualizada`,
      metadata: { updatesCount: updates.length },
    });

    return { message: 'Ordem atualizada com sucesso', count: updates.length };
  }

  private async isDescendant(parentId: string, childId: string): Promise<boolean> {
    // Verificar se childId é descendente de parentId
    let currentId = childId || null;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const node = await this.prisma.hierarchyNode.findUnique({
        where: { id: currentId },
        select: { id: true, parentId: true },
      });

      if (!node) break;
      if (node.parentId === parentId) return true;
      currentId = node.parentId;
    }

    return false;
  }

  private async reorderSiblings(nodeId: string, parentId: string | null, newPosition: number) {
    // Obter todos os irmãos (excluindo o nó que está sendo movido)
    const siblings = await this.prisma.hierarchyNode.findMany({
      where: {
        parentId,
        id: { not: nodeId },
      },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });

    // Ajustar posições
    type OrderUpdate = { id: string; order: number };
    const updatedOrders: OrderUpdate[] = [];
    let currentOrder = 0;

    for (let i = 0; i <= siblings.length; i++) {
      if (i === newPosition) {
        // Inserir nó movido nesta posição
        updatedOrders.push({ id: nodeId, order: currentOrder });
        currentOrder++;
      }

      if (i < siblings.length) {
        // Manter irmão existente
        updatedOrders.push({ id: siblings[i].id, order: currentOrder });
        currentOrder++;
      }
    }

    // Se nova posição é maior que número de irmãos, adicionar no final
    if (newPosition > siblings.length) {
      updatedOrders.push({ id: nodeId, order: siblings.length });
    }

    // Atualizar ordens em transação
    const transactions = updatedOrders.map(({ id, order }) =>
      this.prisma.hierarchyNode.update({
        where: { id },
        data: { order },
      }),
    );

    await this.prisma.$transaction(transactions);
  }
}