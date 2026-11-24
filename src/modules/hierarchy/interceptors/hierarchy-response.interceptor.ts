import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HierarchyHelpers } from '../helpers/hierarchy.helpers';

@Injectable()
export class HierarchyResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      map(data => {
        // Se for resposta de hierarquia, adicionar metadados
        if (this.isHierarchyResponse(data)) {
          return this.enrichHierarchyResponse(data, user);
        }
        
        // Se for resposta de estatísticas
        if (this.isStatsResponse(data)) {
          return this.enrichStatsResponse(data);
        }
        
        // Se for resposta de organograma
        if (this.isOrgChartResponse(data)) {
          return this.enrichOrgChartResponse(data);
        }
        
        return data;
      }),
    );
  }

  private isHierarchyResponse(data: any): boolean {
    return data && (
      (data.id && data.type && data.name) || // Nó único
      (Array.isArray(data) && data.every(item => item.id && item.type)) // Lista
    );
  }

  private isStatsResponse(data: any): boolean {
    return data && (
      data.totalMembers !== undefined ||
      data.membersByRank !== undefined ||
      data.membersByDepartment !== undefined
    );
  }

  private isOrgChartResponse(data: any): boolean {
    return data && data.nodes && data.links;
  }

  private enrichHierarchyResponse(data: any, user: any): any {
    const metadata = {
      timestamp: new Date().toISOString(),
      userContext: user ? {
        id: user.id,
        rank: user.memberRank,
        department: user.department,
        unit: user.unit,
      } : null,
      responseType: 'hierarchy',
    };

    // Se for nó único
    if (data.id && data.type) {
      const stats = HierarchyHelpers.calculateHierarchyStats(data);
      return {
        ...data,
        _metadata: {
          ...metadata,
          nodeStats: stats,
          totalNodes: stats.totalNodes,
          maxDepth: stats.maxDepth,
        },
      };
    }

    // Se for lista
    if (Array.isArray(data)) {
      return {
        items: data,
        total: data.length,
        _metadata: metadata,
      };
    }

    return data;
  }

  private enrichStatsResponse(data: any): any {
    const metadata = {
      timestamp: new Date().toISOString(),
      responseType: 'stats',
      calculatedAt: new Date().toISOString(),
    };

    // Adicionar percentuais se não existirem
    if (data.totalMembers && data.membersByRank) {
      const membersByRankWithPercentage = Object.entries(data.membersByRank).map(
        ([rank, count]) => ({
          rank,
          count,
          percentage: Math.round((count as number / data.totalMembers) * 100),
        })
      );
      
      data.membersByRankWithPercentage = membersByRankWithPercentage;
    }

    return {
      ...data,
      _metadata: metadata,
    };
  }

  private enrichOrgChartResponse(data: any): any {
    const metadata = {
      timestamp: new Date().toISOString(),
      responseType: 'org-chart',
      totalNodes: data.nodes.length,
      totalLinks: data.links.length,
      nodeTypes: this.countNodeTypes(data.nodes),
    };

    return {
      ...data,
      _metadata: metadata,
    };
  }

  private countNodeTypes(nodes: any[]): Record<string, number> {
    const counts: Record<string, number> = {};
    nodes.forEach(node => {
      counts[node.type] = (counts[node.type] || 0) + 1;
    });
    return counts;
  }
}