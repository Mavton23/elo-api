import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaCloudinaryService } from '../social/services/media-cloudinary.service';
import { 
  HelpCategory, 
  HelpType, 
  HelpStatus, 
  HelpAudience,
  Prisma 
} from '@prisma/client';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateHelpFAQDto } from './dto/create-help-faq.dto';
import { HelpSearchDto } from './dto/help-search.dto';

@Injectable()
export class HelpService {
  constructor(
    private prisma: PrismaService,
    private mediaCloudinaryService: MediaCloudinaryService,
  ) {}

  // ============ ARTIGOS DE AJUDA ============

  /**
   * Criar um novo artigo de ajuda
   */
  async createArticle(
    createHelpArticleDto: CreateHelpArticleDto,
    authorId: string,
    files?: Express.Multer.File[],
  ) {
    // Verificar se slug já existe
    const existingArticle = await this.prisma.helpArticle.findUnique({
      where: { slug: createHelpArticleDto.slug },
    });

    if (existingArticle) {
      throw new BadRequestException('Slug já está em uso. Escolha outro.');
    }

    // Processar uploads se houver arquivos
    let attachments = [] as any;
    if (files && files.length > 0) {
      const uploadResults = await this.mediaCloudinaryService.uploadMultipleFiles(
        files,
        authorId,
        'help/articles',
        { private: false }, // conteúdo de ajuda: não classificado
      );

      attachments = uploadResults.map(result => ({
        name: result.originalName,
        description: `Anexo do artigo: ${createHelpArticleDto.title}`,
        type: result.type === 'image' ? 'IMAGE' : 
              result.type === 'video' ? 'VIDEO' : 'DOCUMENT',
        url: result.url,
        publicId: result.publicId,
        size: result.size,
        downloads: 0,
      }));
    }

    // Criar o artigo
    return await this.prisma.helpArticle.create({
      data: {
        ...createHelpArticleDto,
        authorId,
        attachments: attachments.length > 0 ? {
          create: attachments,
        } : undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        attachments: true,
        sections: true,
      },
    });
  }

  /**
   * Buscar artigos com filtros e paginação
   */
  async findAllArticles(
    filters: HelpSearchDto,
    userId?: string,
  ) {
    const {
      query,
      category,
      type,
      audience,
      tag,
      onlyFeatured,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Construir filtros
    const where: Prisma.HelpArticleWhereInput = {
      status: 'PUBLICADO',
      OR: query ? [
        { title: { contains: query, mode: 'insensitive' } },
        { excerpt: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
        { tags: { has: query } },
      ] : undefined,
      category,
      type,
      audience,
      tags: tag ? { has: tag } : undefined,
      isFeatured: onlyFeatured ? true : undefined,
    };

    // Se não for usuário autenticado, mostrar apenas para TODOS_USUARIOS
    if (!userId) {
      where.audience = 'TODOS_USUARIOS';
    }

    // Ordenação
    const orderBy: Prisma.HelpArticleOrderByWithRelationInput = {};
    if (sortBy === 'views') {
      orderBy.views = sortOrder;
    } else if (sortBy === 'helpfulVotes') {
      orderBy.helpfulVotes = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Executar query
    const [articles, total] = await Promise.all([
      this.prisma.helpArticle.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              memberRank: true,
            },
          },
          _count: {
            select: {
              userInteractions: {
                where: {
                  isBookmarked: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.helpArticle.count({ where }),
    ]);

    // Adicionar interação do usuário se autenticado
    let articlesWithInteraction = articles;
    if (userId) {
      const articleIds = articles.map(article => article.id);
      const userInteractions = await this.prisma.helpUserInteraction.findMany({
        where: {
          userId,
          articleId: { in: articleIds },
        },
      });

      const interactionMap = new Map(
        userInteractions.map(interaction => [interaction.articleId, interaction])
      );

      articlesWithInteraction = articles.map(article => ({
        ...article,
        userInteraction: interactionMap.get(article.id) ? {
          hasViewed: interactionMap.get(article.id)?.hasViewed,
          wasHelpful: interactionMap.get(article.id)?.wasHelpful,
          isBookmarked: interactionMap.get(article.id)?.isBookmarked,
          rating: interactionMap.get(article.id)?.rating,
        } : undefined,
      }));
    }

    return {
      data: articlesWithInteraction,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: page * limitNum < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Buscar artigo por ID ou slug
   */
  async findArticleByIdOrSlug(
    identifier: string,
    userId?: string,
  ) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    const article = await this.prisma.helpArticle.findUnique({
      where: isUuid ? { id: identifier } : { slug: identifier },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
          },
        },
        sections: {
          orderBy: { order: 'asc' },
        },
        attachments: true,
        relatedFrom: {
          include: {
            relatedArticle: {
              include: {
                author: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    // Verificar acesso baseado na audiência
    if (!this.canUserAccessArticle(article, userId)) {
      throw new ForbiddenException('Você não tem permissão para acessar este artigo');
    }

    // Registrar visualização se for usuário autenticado
    if (userId) {
      await this.recordView(article.id, userId);
      
      // Incrementar contador de visualizações
      await this.prisma.helpArticle.update({
        where: { id: article.id },
        data: { views: { increment: 1 } },
      });
    }

    // Buscar interação do usuário
    let userInteraction = null as any;
    if (userId) {
      userInteraction = await this.prisma.helpUserInteraction.findUnique({
        where: {
          articleId_userId: {
            articleId: article.id,
            userId,
          },
        },
      });
    }

    // Transformar dados relacionados
    const relatedArticles = article.relatedFrom.map(rel => ({
      ...rel.relatedArticle,
      author: rel.relatedArticle.author,
    }));

    return {
      ...article,
      relatedArticles,
      userInteraction: userInteraction ? {
        hasViewed: userInteraction.hasViewed,
        wasHelpful: userInteraction.wasHelpful,
        isBookmarked: userInteraction.isBookmarked,
        rating: userInteraction.rating,
      } : undefined,
    };
  }

  /**
   * Atualizar artigo
   */
  async updateArticle(
    id: string,
    updateHelpArticleDto: UpdateHelpArticleDto,
    userId: string,
  ) {
    // Verificar se artigo existe e se usuário é o autor
    const article = await this.prisma.helpArticle.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    // Verificar permissões (apenas autor ou admin pode editar)
    if (article.authorId !== userId) {
      // Verificar se usuário é admin
      const isAdmin = await this.isUserAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Você não tem permissão para editar este artigo');
      }
    }

    // Verificar se slug já está em uso (se for alterado)
    if (updateHelpArticleDto.slug && updateHelpArticleDto.slug !== article.slug) {
      const existingWithSlug = await this.prisma.helpArticle.findUnique({
        where: { slug: updateHelpArticleDto.slug },
      });
      
      if (existingWithSlug && existingWithSlug.id !== id) {
        throw new BadRequestException('Slug já está em uso');
      }
    }

    // Se status for alterado para PUBLICADO e ainda não tiver publishedAt
    const data: any = { ...updateHelpArticleDto };
    
    if (updateHelpArticleDto.status === 'PUBLICADO' && !article.publishedAt) {
      data.publishedAt = new Date();
    }

    if (updateHelpArticleDto.status === 'EM_REVISAO') {
      data.reviewerId = updateHelpArticleDto.reviewerId ?? userId;
      data.reviewedAt = new Date();
    }

    return await this.prisma.helpArticle.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
          },
        },
        attachments: true,
        sections: true,
      },
    });
  }

  /**
   * Excluir artigo
   */
  async deleteArticle(id: string, userId: string) {
    // Verificar se artigo existe e se usuário é o autor
    const article = await this.prisma.helpArticle.findUnique({
      where: { id },
      include: { 
        author: true,
        attachments: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    // Verificar permissões
    if (article.authorId !== userId) {
      const isAdmin = await this.isUserAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Você não tem permissão para excluir este artigo');
      }
    }

    // Primeiro, excluir todos os anexos do Cloudinary
    if (article.attachments?.length > 0) {
      for (const attachment of article.attachments) {
        const resourceType = attachment.type === 'IMAGE' ? 'image' :
                           attachment.type === 'VIDEO' ? 'video' : 'raw';
        await this.mediaCloudinaryService.deleteFile(attachment.publicId, resourceType, 'upload');
      }
    }

    // Depois excluir o artigo (cascata exclui sections, attachments, etc.)
    return await this.prisma.helpArticle.delete({
      where: { id },
    });
  }

  /**
   * Adicionar anexo a artigo existente
   */
  async addAttachmentToArticle(
    articleId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Verificar se artigo existe e se usuário tem permissão
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
      include: { author: true },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    if (article.authorId !== userId) {
      const isAdmin = await this.isUserAdmin(userId);
      if (!isAdmin) {
        throw new ForbiddenException('Você não tem permissão para adicionar anexos a este artigo');
      }
    }

    // Fazer upload do arquivo
    const uploadResult = await this.mediaCloudinaryService.uploadFile(
      file,
      userId,
      'help/articles',
      { private: false },
    );

    // Criar registro do anexo
    return await this.prisma.helpAttachment.create({
      data: {
        articleId,
        name: file.originalname,
        description: `Anexo do artigo: ${article.title}`,
        type: uploadResult.type === 'image' ? 'IMAGE' :
              uploadResult.type === 'video' ? 'VIDEO' : 'DOCUMENT',
        url: uploadResult.url,
        size: uploadResult.size,
        publicId: uploadResult.publicId,
        downloads: 0,
      },
    });
  }

  // ============ INTERAÇÕES DO USUÁRIO ============

  /**
   * Registrar visualização de artigo
   */
  private async recordView(articleId: string, userId: string) {
    try {
      await this.prisma.helpUserInteraction.upsert({
        where: {
          articleId_userId: {
            articleId,
            userId,
          },
        },
        update: {
          hasViewed: true,
          viewedAt: new Date(),
        },
        create: {
          articleId,
          userId,
          hasViewed: true,
          viewedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  }

  /**
   * Marcar artigo como útil/não útil
   */
  async voteArticle(
    articleId: string,
    userId: string,
    isHelpful: boolean,
  ) {
    // Verificar se artigo existe
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    // Buscar interação existente
    const existingInteraction = await this.prisma.helpUserInteraction.findUnique({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
    });

    // Preparar dados para atualização
    const updateData: any = {
      wasHelpful: isHelpful,
      votedAt: new Date(),
    };

    // Calcular mudanças nos votos
    let helpfulIncrement = 0;
    let notHelpfulIncrement = 0;

    if (existingInteraction) {
      // Se já votou antes, ajustar contadores
      if (existingInteraction.wasHelpful === true && !isHelpful) {
        // Muda de útil para não útil
        helpfulIncrement = -1;
        notHelpfulIncrement = 1;
      } else if (existingInteraction.wasHelpful === false && isHelpful) {
        // Muda de não útil para útil
        helpfulIncrement = 1;
        notHelpfulIncrement = -1;
      } else if (existingInteraction.wasHelpful === null) {
        // Primeiro voto
        if (isHelpful) {
          helpfulIncrement = 1;
        } else {
          notHelpfulIncrement = 1;
        }
      }
      // Se voto for o mesmo, não faz nada
    } else {
      // Primeira interação
      if (isHelpful) {
        helpfulIncrement = 1;
      } else {
        notHelpfulIncrement = 1;
      }
      updateData.hasViewed = true;
      updateData.viewedAt = new Date();
    }

    // Executar transação para garantir consistência
    return await this.prisma.$transaction(async (prisma) => {
      // Atualizar interação do usuário
      await prisma.helpUserInteraction.upsert({
        where: {
          articleId_userId: {
            articleId,
            userId,
          },
        },
        update: updateData,
        create: {
          articleId,
          userId,
          ...updateData,
          hasViewed: true,
          viewedAt: new Date(),
        },
      });

      // Atualizar contadores do artigo
      return await prisma.helpArticle.update({
        where: { id: articleId },
        data: {
          helpfulVotes: { increment: helpfulIncrement },
          notHelpfulVotes: { increment: notHelpfulIncrement },
        },
      });
    });
  }

  /**
   * Adicionar/remover artigo dos bookmarks
   */
  async toggleBookmark(
    articleId: string,
    userId: string,
  ) {
    // Verificar se artigo existe
    const article = await this.prisma.helpArticle.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new NotFoundException('Artigo não encontrado');
    }

    // Buscar interação existente
    const existingInteraction = await this.prisma.helpUserInteraction.findUnique({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
    });

    const isCurrentlyBookmarked = existingInteraction?.isBookmarked || false;

    return await this.prisma.helpUserInteraction.upsert({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
      update: {
        isBookmarked: !isCurrentlyBookmarked,
        bookmarkedAt: !isCurrentlyBookmarked ? new Date() : null,
      },
      create: {
        articleId,
        userId,
        isBookmarked: true,
        bookmarkedAt: new Date(),
        hasViewed: true,
        viewedAt: new Date(),
      },
    });
  }

  /**
   * Buscar artigos bookmarkados pelo usuário
   */
  async getUserBookmarks(
    userId: string,
    page = 1,
    limit = 10,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [interactions, total] = await Promise.all([
      this.prisma.helpUserInteraction.findMany({
        where: {
          userId,
          isBookmarked: true,
        },
        skip,
        take: limitNum,
        orderBy: {
          bookmarkedAt: 'desc',
        },
        include: {
          article: {
            include: {
              author: {
                select: {
                  id: true,
                  fullName: true,
                  memberRank: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.helpUserInteraction.count({
        where: {
          userId,
          isBookmarked: true,
        },
      }),
    ]);

    return {
      data: interactions.map(interaction => ({
        ...interaction.article,
        bookmarkedAt: interaction.bookmarkedAt,
      })),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  // ============ FAQs ============

  /**
   * Criar FAQ
   */
  async createFAQ(
    createHelpFAQDto: CreateHelpFAQDto,
    userId: string,
  ) {
    // Verificar se usuário tem permissão (apenas admin)
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem criar FAQs');
    }

    return await this.prisma.helpFAQ.create({
      data: createHelpFAQDto,
    });
  }

  /**
   * Buscar FAQs
   */
  async findAllFAQs(filters: {
    category?: HelpCategory;
    audience?: HelpAudience;
    onlyFeatured?: boolean;
  } = {}) {
    const where: Prisma.HelpFAQWhereInput = {
      category: filters.category,
      audience: filters.audience,
      isFeatured: filters.onlyFeatured ? true : undefined,
    };

    return await this.prisma.helpFAQ.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Atualizar FAQ
   */
  async updateFAQ(
    id: string,
    updateData: Partial<CreateHelpFAQDto>,
    userId: string,
  ) {
    // Verificar permissão
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem atualizar FAQs');
    }

    // Verificar se FAQ existe
    const faq = await this.prisma.helpFAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('FAQ não encontrado');
    }

    return await this.prisma.helpFAQ.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Excluir FAQ
   */
  async deleteFAQ(id: string, userId: string) {
    // Verificar permissão
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem excluir FAQs');
    }

    // Verificar se FAQ existe
    const faq = await this.prisma.helpFAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      throw new NotFoundException('FAQ não encontrado');
    }

    return await this.prisma.helpFAQ.delete({
      where: { id },
    });
  }

  // ============ ESTATÍSTICAS E RELATÓRIOS ============

  /**
   * Obter estatísticas do módulo de ajuda
   */
  async getHelpStats(userId: string) {
    // Verificar se usuário é admin
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem visualizar estatísticas');
    }

    const [
      totalArticles,
      publishedArticles,
      totalFAQs,
      totalViews,
      helpfulVotes,
      totalBookmarks,
      popularArticles,
    ] = await Promise.all([
      this.prisma.helpArticle.count(),
      this.prisma.helpArticle.count({ where: { status: 'PUBLICADO' } }),
      this.prisma.helpFAQ.count(),
      this.prisma.helpArticle.aggregate({ _sum: { views: true } }),
      this.prisma.helpArticle.aggregate({ _sum: { helpfulVotes: true } }),
      this.prisma.helpUserInteraction.count({ where: { isBookmarked: true } }),
      this.prisma.helpArticle.findMany({
        where: { status: 'PUBLICADO' },
        orderBy: { views: 'desc' },
        take: 5,
        include: {
          author: {
            select: {
              fullName: true,
              memberRank: true,
            },
          },
        },
      }),
    ]);

    return {
      articles: {
        total: totalArticles,
        published: publishedArticles,
        draft: totalArticles - publishedArticles,
      },
      faqs: {
        total: totalFAQs,
      },
      engagement: {
        totalViews: totalViews._sum.views || 0,
        totalHelpfulVotes: helpfulVotes._sum.helpfulVotes || 0,
        totalBookmarks,
      },
      popularArticles,
    };
  }

   /**
    * Obter artigos recomendados para o usuário
    */
    async getRecommendedArticles(userId: string, limit: number = 5) {
    // Buscar histórico de visualizações do usuário
    const userInteractions = await this.prisma.helpUserInteraction.findMany({
        where: { userId, hasViewed: true },
        include: { article: true },
        take: 10,
        orderBy: { viewedAt: 'desc' },
    });

    if (userInteractions.length === 0) {
        // Se não tem histórico, retorna artigos populares
        return this.findAllArticles(
        {
            limit,
            sortBy: 'views',
            sortOrder: 'desc',
        },
        userId,
        );
    }

    // Analisar preferências do usuário
    const categoryCounts = userInteractions.reduce((acc, interaction) => {
        const category = interaction.article.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});

    const topCategory = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[a] > categoryCounts[b] ? a : b
    );

    // Buscar artigos que o usuário ainda não viu na categoria favorita
    const viewedArticleIds = userInteractions.map(interaction => interaction.articleId);

    const where: Prisma.HelpArticleWhereInput = {
        category: topCategory as HelpCategory,
        status: 'PUBLICADO',
        id: { notIn: viewedArticleIds },
    };

    // Verificar audiência do usuário
    const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { adminProfile: true },
    });

    const isAdmin = !!user?.adminProfile;
    if (!isAdmin) {
        where.OR = [
        { audience: 'TODOS_USUARIOS' },
        { audience: 'MEMBROS' },
        ];
    }

    const recommendedArticles = await this.prisma.helpArticle.findMany({
        where,
        take: limit,
        orderBy: { views: 'desc' },
        include: {
        author: {
            select: {
            id: true,
            fullName: true,
            memberRank: true,
            },
        },
        },
    });

    // Se não encontrou suficientes na categoria favorita, completar com artigos populares
    if (recommendedArticles.length < limit) {
        const remaining = limit - recommendedArticles.length;
        const popularArticles = await this.prisma.helpArticle.findMany({
        where: {
            status: 'PUBLICADO',
            id: { 
            notIn: [
                ...viewedArticleIds,
                ...recommendedArticles.map(article => article.id)
            ] 
            },
            ...(isAdmin ? {} : {
            OR: [
                { audience: 'TODOS_USUARIOS' },
                { audience: 'MEMBROS' },
            ],
            }),
        },
        take: remaining,
        orderBy: { views: 'desc' },
        include: {
            author: {
            select: {
                id: true,
                fullName: true,
                memberRank: true,
            },
            },
        },
        });

        recommendedArticles.push(...popularArticles);
    }

    return {
        data: recommendedArticles,
        meta: {
        total: recommendedArticles.length,
        recommendedCategory: topCategory,
        },
    };
    }

  // ============ MÉTODOS AUXILIARES ============

  /**
   * Verificar se usuário pode acessar artigo baseado na audiência
   */
  private async canUserAccessArticle(article: any, userId?: string): Promise<boolean> {
    if (!userId) {
      // Usuários não autenticados só podem ver artigos para TODOS_USUARIOS
      return article.audience === 'TODOS_USUARIOS';
    }

    // Se usuário for admin, pode ver tudo
    // TODO: Implementar verificação de admin

    // Por enquanto, lógica simples baseada na audiência
    switch (article.audience) {
      case 'TODOS_USUARIOS':
        return true;
      case 'MEMBROS':
        return !!userId; // Qualquer usuário autenticado é membro
      case 'ADMINISTRADORES':
        return this.isUserAdmin(userId);
      default:
        return true;
    }
  }

  /**
   * Verificar se usuário é administrador
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    const adminProfile = await this.prisma.adminProfile.findUnique({
      where: { userId },
    });
    
    return !!adminProfile;
  }

  /**
   * Log de busca para analytics
   */
  async logSearch(
    query: string,
    resultsCount: number,
    userId?: string,
    clickedResultId?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    try {
      await this.prisma.helpSearchLog.create({
        data: {
          userId,
          query,
          resultsCount,
          clickedResultId,
          userAgent,
          ipAddress,
        },
      });
    } catch (error) {
      // Não falhar se o log falhar
      console.error('Erro ao logar busca:', error);
    }
  }
}