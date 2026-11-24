import { Injectable } from '@nestjs/common';
import { PostCategory, VisibilityLevel, MemberRank } from '@prisma/client';

export interface CategoryInfo {
  value: PostCategory;
  label: string;
  description: string;
  color: string;
  icon: string;
}

export interface VisibilityInfo {
  value: VisibilityLevel;
  label: string;
  description: string;
  minRank?: MemberRank;
}

@Injectable()
export class CategoryService {
  private readonly categories: CategoryInfo[] = [
    {
      value: 'OPERACIONAL',
      label: 'Operacional',
      description: 'Informações de operações e missões',
      color: '#dc2626',
      icon: 'alert-triangle',
    },
    {
      value: 'ADMINISTRATIVO',
      label: 'Administrativo',
      description: 'Assuntos administrativos e burocráticos',
      color: '#1e40af',
      icon: 'file-text',
    },
    {
      value: 'INFORMATIVO',
      label: 'Informativo',
      description: 'Informações gerais e notícias',
      color: '#059669',
      icon: 'info',
    },
    {
      value: 'FORMACAO',
      label: 'Formação',
      description: 'Cursos, treinamentos e capacitações',
      color: '#7c3aed',
      icon: 'graduation-cap',
    },
    {
      value: 'SEGURANCA',
      label: 'Segurança',
      description: 'Alertas e informações de segurança',
      color: '#ea580c',
      icon: 'shield',
    },
    {
      value: 'PROMOCOES',
      label: 'Promoções',
      description: 'Promoções e movimentações de pessoal',
      color: '#be185d',
      icon: 'trending-up',
    },
    {
      value: 'SOCIAL',
      label: 'Social',
      description: 'Eventos sociais e reconhecimentos',
      color: '#0d9488',
      icon: 'users',
    },
  ];

  private readonly visibilityLevels: VisibilityInfo[] = [
    {
      value: 'PUBLICO',
      label: 'Público Institucional',
      description: 'Visível para toda a instituição',
    },
    {
      value: 'DEPARTAMENTO',
      label: 'Departamento',
      description: 'Apenas membros do mesmo departamento',
    },
    {
      value: 'PATENTE_OU_MAIOR',
      label: 'Patente ou Superior',
      description: 'Mesma patente ou superiores hierárquicos',
    },
    {
      value: 'UNIDADE',
      label: 'Unidade',
      description: 'Apenas membros da mesma unidade',
    },
    {
      value: 'RESTRITO',
      label: 'Restrito',
      description: 'Apenas administradores e comandantes',
      minRank: 'ADJUNTO_SUPERINTENDENTE',
    },
  ];

  /**
   * Obter todas as categorias
   */
  getAllCategories(): CategoryInfo[] {
    return this.categories;
  }

  /**
   * Obter categoria específica
   */
  getCategory(category: PostCategory): CategoryInfo | undefined {
    return this.categories.find(c => c.value === category);
  }

  /**
   * Obter todas as opções de visibilidade
   */
  getAllVisibilityLevels(): VisibilityInfo[] {
    return this.visibilityLevels;
  }

  /**
   * Obter opções de visibilidade disponíveis para um usuário
   */
  getAvailableVisibilityLevels(userRank: MemberRank): VisibilityInfo[] {
    const rankHierarchy: Record<MemberRank, number> = {
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

    const userRankValue = rankHierarchy[userRank] || 0;

    return this.visibilityLevels.filter(level => {
      if (!level.minRank) return true;
      const minRankValue = rankHierarchy[level.minRank] || 0;
      return userRankValue >= minRankValue;
    });
  }

  /**
   * Validar se categoria existe
   */
  isValidCategory(category: string): boolean {
    return this.categories.some(c => c.value === category);
  }

  /**
   * Validar se nível de visibilidade existe
   */
  isValidVisibility(visibility: string): boolean {
    return this.visibilityLevels.some(v => v.value === visibility);
  }

  /**
   * Obter informações de categoria para múltiplos valores
   */
  getCategoriesInfo(categories: PostCategory[]): CategoryInfo[] {
    return categories
      .map(category => this.getCategory(category))
      .filter(Boolean) as CategoryInfo[];
  }
}