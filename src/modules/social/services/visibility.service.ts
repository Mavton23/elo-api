import { Injectable, ForbiddenException } from '@nestjs/common';
import { MemberRank, VisibilityLevel, Department } from '@prisma/client';

export interface UserContext {
  id: string;
  memberRank: MemberRank;
  department: Department;
  unit: string;
  province: string;
  securityLevel: string;
}

export interface PostContext {
  authorRank: MemberRank;
  authorDepartment: Department;
  authorUnit: string;
  visibility: VisibilityLevel;
}

@Injectable()
export class VisibilityService {
  // Mapeamento de patentes para valores numéricos
  private readonly rankHierarchy: Record<MemberRank, number> = {
    GUARDA: 1,
    SEGUNDO_CABO: 2,
    PRIMEIRO_CABO: 3,
    SARGENTO: 4,
    SARGENTO_PRINCIPAL: 5,
    SUBINSPECTOR: 6,
    INSPECTOR: 7,
    INSPECTOR_PRINCIPAL: 8,
    ADJUNTO_SUPERINTENDENTE: 9,
    SUPERINTENDENTE: 10,
    SUPERINTENDENTE_PRINCIPAL: 11,
    PRIMEIRO_ADJUNTO_COMISSARIO: 12,
    COMISSARIO: 13,
    INSPECTOR_GERAL: 14,
  };

  /**
   * Verifica se usuário pode visualizar um post
   */
  canViewPost(user: UserContext, post: PostContext): boolean {
    switch (post.visibility) {
      case VisibilityLevel.PUBLICO:
        return true;

      case VisibilityLevel.DEPARTAMENTO:
        return user.department === post.authorDepartment;

      case VisibilityLevel.PATENTE_OU_MAIOR:
        return this.getRankValue(user.memberRank) >= this.getRankValue(post.authorRank);

      case VisibilityLevel.UNIDADE:
        return user.unit === post.authorUnit;

      case VisibilityLevel.RESTRITO:
        return this.canAccessRestricted(user);

      default:
        return false;
    }
  }

  /**
   * Verifica se usuário pode criar post com determinada visibilidade
   */
  canUseVisibility(user: UserContext, visibility: VisibilityLevel): boolean {
    switch (visibility) {
      case VisibilityLevel.PUBLICO:
        return true;

      case VisibilityLevel.DEPARTAMENTO:
        return true; // Todos podem postar para seu departamento

      case VisibilityLevel.PATENTE_OU_MAIOR:
        return this.getRankValue(user.memberRank) >= this.getRankValue('SARGENTO');

      case VisibilityLevel.UNIDADE:
        return true; // Todos podem postar para sua unidade

      case VisibilityLevel.RESTRITO:
        return this.canAccessRestricted(user);

      default:
        return false;
    }
  }

  /**
   * Filtra lista de posts baseado na visibilidade
   */
  filterPosts<T extends { visibility: VisibilityLevel; author: any }>(
    posts: T[],
    user: UserContext,
  ): T[] {
    return posts.filter(post => {
      const postContext: PostContext = {
        authorRank: post.author.memberRank,
        authorDepartment: post.author.department,
        authorUnit: post.author.unit,
        visibility: post.visibility,
      };
      return this.canViewPost(user, postContext);
    });
  }

  /**
   * Obtém opções de visibilidade disponíveis para o usuário
   */
  getAvailableVisibilityOptions(user: UserContext): VisibilityLevel[] {
    const options: VisibilityLevel[] = [
      VisibilityLevel.PUBLICO,
      VisibilityLevel.DEPARTAMENTO,
      VisibilityLevel.UNIDADE,
    ];

    if (this.getRankValue(user.memberRank) >= this.getRankValue('SARGENTO')) {
      options.push(VisibilityLevel.PATENTE_OU_MAIOR);
    }

    if (this.canAccessRestricted(user)) {
      options.push(VisibilityLevel.RESTRITO);
    }

    return options;
  }

  /**
   * Verifica se post pode ser editado/excluído pelo usuário
   */
  canModifyPost(user: UserContext, postAuthorId: string, postContext: PostContext): boolean {
    // Dono do post pode modificar
    if (user.id === postAuthorId) {
      return true;
    }

    // Superiores hierárquicos podem modificar posts de inferiores
    if (this.getRankValue(user.memberRank) > this.getRankValue(postContext.authorRank)) {
      return true;
    }

    // Comandantes de departamento podem modificar posts do departamento
    if (
      user.department === postContext.authorDepartment &&
      this.getRankValue(user.memberRank) >= this.getRankValue('INSPECTOR')
    ) {
      return true;
    }

    // Administradores/Inspetor Geral
    if (user.memberRank === 'INSPECTOR_GERAL') {
      return true;
    }

    return false;
  }

  /**
   * Valida se usuário pode acessar conteúdo restrito
   */
  private canAccessRestricted(user: UserContext): boolean {
    const restrictedRanks: MemberRank[] = [
      'ADJUNTO_SUPERINTENDENTE',
      'SUPERINTENDENTE',
      'SUPERINTENDENTE_PRINCIPAL',
      'PRIMEIRO_ADJUNTO_COMISSARIO',
      'COMISSARIO',
      'INSPECTOR_GERAL',
    ];

    return (
      restrictedRanks.includes(user.memberRank) ||
      user.securityLevel === 'ALTO' ||
      user.securityLevel === 'MAXIMO'
    );
  }

  /**
   * Converte patente para valor numérico
   */
  private getRankValue(rank: MemberRank): number {
    return this.rankHierarchy[rank] || 0;
  }
}