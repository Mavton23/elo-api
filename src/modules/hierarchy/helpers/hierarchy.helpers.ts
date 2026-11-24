import { HierarchyNodeDto } from '../dto/hierarchy-node.dto';

export class HierarchyHelpers {
  /**
   * Encontrar nó por ID recursivamente
   */
  static findNodeById(nodes: HierarchyNodeDto[], nodeId: string): HierarchyNodeDto | null {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      
      if (node.children && node.children.length > 0) {
        const found = this.findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Encontrar todos os nós por tipo
   */
  static findNodesByType(
    nodes: HierarchyNodeDto[], 
    type: HierarchyNodeDto['type']
  ): HierarchyNodeDto[] {
    const results: HierarchyNodeDto[] = [];
    
    const search = (node: HierarchyNodeDto) => {
      if (node.type === type) {
        results.push(node);
      }
      
      if (node.children) {
        node.children.forEach(search);
      }
    };
    
    nodes.forEach(search);
    return results;
  }

  /**
   * Calcular profundidade máxima da hierarquia
   */
  static getMaxDepth(node: HierarchyNodeDto): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }
    
    const childDepths = node.children.map(child => this.getMaxDepth(child));
    return 1 + Math.max(...childDepths);
  }

  /**
   * Contar total de nós na hierarquia
   */
  static countNodes(node: HierarchyNodeDto): number {
    let count = 1; // Contar o nó atual
    
    if (node.children) {
      node.children.forEach(child => {
        count += this.countNodes(child);
      });
    }
    
    return count;
  }

  /**
   * Contar nós por tipo
   */
  static countNodesByType(node: HierarchyNodeDto): Record<string, number> {
    const counts: Record<string, number> = {};
    
    const traverse = (currentNode: HierarchyNodeDto) => {
      const type = currentNode.type;
      counts[type] = (counts[type] || 0) + 1;
      
      if (currentNode.children) {
        currentNode.children.forEach(traverse);
      }
    };
    
    traverse(node);
    return counts;
  }

  /**
   * Achatizar hierarquia para lista
   */
  static flattenHierarchy(node: HierarchyNodeDto): HierarchyNodeDto[] {
    const result: HierarchyNodeDto[] = [node];
    
    if (node.children) {
      node.children.forEach(child => {
        result.push(...this.flattenHierarchy(child));
      });
    }
    
    return result;
  }

  /**
   * Filtrar hierarquia mantendo estrutura
   */
  static filterHierarchy(
    node: HierarchyNodeDto,
    predicate: (node: HierarchyNodeDto) => boolean
  ): HierarchyNodeDto | null {
    // Se o nó não passa no predicado e não é raiz, retorna null
    if (!predicate(node) && node.type !== 'MINISTERIO') {
      return null;
    }

    // Filtrar filhos
    let filteredChildren: HierarchyNodeDto[] = [];
    if (node.children) {
      node.children.forEach(child => {
        const filteredChild = this.filterHierarchy(child, predicate);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      });
    }

    // Se não tem filhos e não passa no predicado, excluir
    if (filteredChildren.length === 0 && !predicate(node) && node.type !== 'MINISTERIO') {
      return null;
    }

    return {
      ...node,
      children: filteredChildren.length > 0 ? filteredChildren : undefined,
    };
  }

  /**
   * Buscar caminho até um nó
   */
  static findPathToNode(
    root: HierarchyNodeDto,
    nodeId: string
  ): HierarchyNodeDto[] | null {
    const path: HierarchyNodeDto[] = [];
    
    const search = (currentNode: HierarchyNodeDto): boolean => {
      path.push(currentNode);
      
      if (currentNode.id === nodeId) {
        return true;
      }
      
      if (currentNode.children) {
        for (const child of currentNode.children) {
          if (search(child)) {
            return true;
          }
        }
      }
      
      path.pop();
      return false;
    };
    
    return search(root) ? path : null;
  }

  /**
   * Encontrar parentes mais próximos (irmãos)
   */
  static findSiblings(root: HierarchyNodeDto, nodeId: string): HierarchyNodeDto[] {
    const path = this.findPathToNode(root, nodeId);
    if (!path || path.length < 2) {
      return [];
    }
    
    const parent = path[path.length - 2];
    if (!parent.children) {
      return [];
    }
    
    // Retornar todos os filhos do parent, exceto o nó atual
    return parent.children.filter(child => child.id !== nodeId);
  }

  /**
   * Encontrar subordinados diretos
   */
  static findDirectSubordinates(root: HierarchyNodeDto, nodeId: string): HierarchyNodeDto[] {
    const node = this.findNodeById([root], nodeId);
    if (!node || !node.children) {
      return [];
    }
    
    return node.children;
  }

  /**
   * Gerar ID único baseado no tipo e dados
   */
  static generateNodeId(
    type: HierarchyNodeDto['type'],
    data: any,
    parentId?: string
  ): string {
    const prefix = type.toLowerCase().charAt(0);
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 9);
    
    let dataHash = '';
    if (data) {
      if (data.department) dataHash += data.department.substring(0, 3);
      if (data.province) dataHash += data.province.substring(0, 3);
      if (data.unitType) dataHash += data.unitType.substring(0, 3);
    }
    
    return `${prefix}-${dataHash || 'node'}-${timestamp}-${random}`;
  }

  /**
   * Validar estrutura hierárquica
   */
  static validateHierarchy(node: HierarchyNodeDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const validateNode = (currentNode: HierarchyNodeDto, depth: number = 0) => {
      // Validar campos obrigatórios
      if (!currentNode.id) {
        errors.push(`Node at depth ${depth} missing id`);
      }
      
      if (!currentNode.type) {
        errors.push(`Node ${currentNode.id} missing type`);
      }
      
      if (!currentNode.name) {
        errors.push(`Node ${currentNode.id} missing name`);
      }
      
      // Validar tipo específico
      switch (currentNode.type) {
        case 'DEPARTAMENTO':
          if (!currentNode.data?.department) {
            errors.push(`Department node ${currentNode.id} missing department data`);
          }
          break;
        
        case 'UNIDADE':
          if (!currentNode.data?.unitType) {
            errors.push(`Unit node ${currentNode.id} missing unitType data`);
          }
          if (!currentNode.data?.province) {
            errors.push(`Unit node ${currentNode.id} missing province data`);
          }
          break;
          
        case 'MEMBRO':
          if (!currentNode.data?.member?.id) {
            errors.push(`Member node ${currentNode.id} missing member data`);
          }
          break;
      }
      
      // Validar filhos recursivamente
      if (currentNode.children) {
        currentNode.children.forEach(child => validateNode(child, depth + 1));
      }
    };
    
    validateNode(node);
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converter para formato de árvore para UI
   */
  static toTreeFormat(node: HierarchyNodeDto): any {
    const treeNode = {
      key: node.id,
      title: node.name,
      type: node.type,
      data: node.data,
      children: [] as any[],
    };
    
    if (node.children && node.children.length > 0) {
      treeNode.children = node.children.map(child => this.toTreeFormat(child));
    }
    
    return treeNode;
  }

  /**
   * Calcular estatísticas básicas da hierarquia
   */
  static calculateHierarchyStats(node: HierarchyNodeDto) {
    const counts = this.countNodesByType(node);
    const totalNodes = this.countNodes(node);
    const maxDepth = this.getMaxDepth(node);
    
    return {
      totalNodes,
      maxDepth,
      counts,
      averageBranching: totalNodes > 1 ? (totalNodes - 1) / Object.keys(counts).length : 0,
    };
  }
}