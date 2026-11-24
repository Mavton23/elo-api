import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MediaCloudinaryService, UploadResult } from './media-cloudinary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityService, UserContext } from './visibility.service';
import { CreatePostDto, UpdatePostDto, SocialFiltersDto } from '../dto';
import { PostCategory, VisibilityLevel, MemberRank, Department } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private visibilityService: VisibilityService,
    private media: MediaCloudinaryService,
  ) {}

  /**
   * Criar novo post
   */
  async create(user: UserContext, createPostDto: CreatePostDto, uploads: UploadResult[] = []) {
    // Validar se usuário pode usar esta visibilidade
    if (!this.visibilityService.canUseVisibility(user, createPostDto.visibility)) {
      throw new ForbiddenException(
        `Você não tem permissão para criar posts com visibilidade: ${createPostDto.visibility}`,
      );
    }

    // Converter tags se for string
    let tags: string[] = [];
    if (createPostDto.tags) {
      if (typeof createPostDto.tags === 'string') {
        try {
          tags = JSON.parse(createPostDto.tags);
        } catch (error) {
          // Se não for JSON, tratar como string única
          tags = [createPostDto.tags];
        }
      } else if (Array.isArray(createPostDto.tags)) {
        tags = createPostDto.tags;
      }
    }

    // Converter tags para maiúsculas e remover duplicatas
    tags = [...new Set(tags.map(tag => tag.toUpperCase().trim()))];

    // Criar post no banco
    const post = await this.prisma.post.create({
      data: {
        content: createPostDto.content,
        category: createPostDto.category,
        visibility: createPostDto.visibility,
        province: createPostDto.location?.province,
        unit: createPostDto.location?.unit,
        tags: tags,
        authorId: user.id,
        requiresApproval: false,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
      },
    });

    // Adicionar media attachments se houver
    if (uploads.length > 0) {
      await this.prisma.mediaAttachment.createMany({
        data: uploads.map((u) => ({
          postId: post.id,
          type: u.type,
          // Para ficheiros privados a URL guardada não dá acesso (exige assinatura)
          url: u.deliveryType === 'authenticated' ? `cloudinary:${u.publicId}` : u.url,
          name: u.originalName?.slice(0, 200),
          size: u.size,
          publicId: u.publicId,
          resourceType: u.resourceType,
          deliveryType: u.deliveryType,
          format: u.format,
          mimeType: u.mimeType,
        })),
      });
    }

    return this.mapToResponseDto(post, user.id);
  }

  /**
   * Buscar todos os posts (com filtros e paginação)
   */
  async findAll(user: UserContext, filters: SocialFiltersDto) {
    const limit = parseInt(filters.limit || '20', 10);
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;

    // Construir query baseada em filtros
    const where: any = {
      isArchived: false,
    };

    // Filtro por categoria
    if (filters.category) {
      where.category = filters.category;
    }

    // Filtro por departamento (somente se usuário tiver permissão)
    if (filters.department && user.department === filters.department) {
      where.author = { department: filters.department };
    }

    // Filtro por unidade (somente se usuário pertencer à unidade)
    if (filters.unit && user.unit === filters.unit) {
      where.unit = filters.unit;
    }

    // Filtro por província
    if (filters.province) {
      where.province = filters.province;
    }

    // Filtro por data
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start) {
        where.createdAt.gte = new Date(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        where.createdAt.lte = new Date(filters.dateRange.end);
      }
    }

    // Busca por texto
    if (filters.searchQuery) {
      where.content = {
        contains: filters.searchQuery,
        mode: 'insensitive' as any,
      };
    }

    // Buscar posts
    const posts = await this.prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            name: true,
            publicId: true,
            resourceType: true,
            deliveryType: true,
            format: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Pegar um extra para saber se tem mais
      cursor,
    });

    // Verificar se tem mais posts
    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;

    // Filtrar por visibilidade
    const filteredPosts = this.visibilityService.filterPosts(items, user);

    // Mapear para DTO de resposta
    const mappedPosts = filteredPosts.map(post =>
      this.mapToResponseDto(post, user.id),
    );

    return {
      posts: mappedPosts,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  /**
   * Buscar post por ID
   */
  async findOne(id: string, user: UserContext) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            name: true,
            publicId: true,
            resourceType: true,
            deliveryType: true,
            format: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    // Verificar visibilidade
    const postContext = {
      authorRank: post.author.memberRank,
      authorDepartment: post.author.department,
      authorUnit: post.author.unit,
      visibility: post.visibility,
    };

    if (!this.visibilityService.canViewPost(user, postContext)) {
      throw new ForbiddenException('Você não tem permissão para ver este post');
    }

    return this.mapToResponseDto(post, user.id);
  }

  /**
   * Atualizar post
   */
  async update(id: string, user: UserContext, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    // Verificar permissão para modificar
    const postContext = {
      authorRank: post.author.memberRank,
      authorDepartment: post.author.department,
      authorUnit: post.author.unit,
      visibility: post.visibility,
    };

    if (!this.visibilityService.canModifyPost(user, post.authorId, postContext)) {
      throw new ForbiddenException('Você não tem permissão para modificar este post');
    }

    // Validar nova visibilidade se for alterada
    if (updatePostDto.visibility && updatePostDto.visibility !== post.visibility) {
      if (!this.visibilityService.canUseVisibility(user, updatePostDto.visibility)) {
        throw new ForbiddenException(
          `Você não tem permissão para usar visibilidade: ${updatePostDto.visibility}`,
        );
      }
    }

    // Atualizar post
    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        content: updatePostDto.content,
        category: updatePostDto.category,
        visibility: updatePostDto.visibility,
        province: updatePostDto.location?.province,
        unit: updatePostDto.location?.unit,
        tags: updatePostDto.tags,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            name: true,
            publicId: true,
            resourceType: true,
            deliveryType: true,
            format: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return this.mapToResponseDto(updatedPost, user.id);
  }

  /**
   * Excluir post
   */
  async remove(id: string, user: UserContext) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    // Verificar permissão para excluir
    const postContext = {
      authorRank: post.author.memberRank,
      authorDepartment: post.author.department,
      authorUnit: post.author.unit,
      visibility: post.visibility,
    };

    if (!this.visibilityService.canModifyPost(user, post.authorId, postContext)) {
      throw new ForbiddenException('Você não tem permissão para excluir este post');
    }

    // Soft delete (marcar como arquivado)
    await this.prisma.post.update({
      where: { id },
      data: { isArchived: true },
    });

    return { message: 'Post excluído com sucesso' };
  }

  /**
   * Curtir/descurtir post
   */
  async toggleLike(postId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Descurtir
      await this.prisma.like.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });
      return { liked: false };
    } else {
      // Curtir
      await this.prisma.like.create({
        data: {
          postId,
          userId,
        },
      });
      return { liked: true };
    }
  }

  /**
   * Adicionar/remover bookmark
   */
  async toggleBookmark(postId: string, userId: string) {
    const existingBookmark = await this.prisma.bookmark.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingBookmark) {
      // Remover bookmark
      await this.prisma.bookmark.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      });
      return { bookmarked: false };
    } else {
      // Adicionar bookmark
      await this.prisma.bookmark.create({
        data: {
          postId,
          userId,
        },
      });
      return { bookmarked: true };
    }
  }

  /**
   * Buscar posts curtidos pelo usuário
   */
  async findLikedPosts(userId: string, user: UserContext, filters: SocialFiltersDto) {
    const likedPosts = await this.prisma.like.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
                department: true,
                unit: true,
              },
            },
            media: {
              select: {
                id: true,
                type: true,
                url: true,
                name: true,
                publicId: true,
                resourceType: true,
                deliveryType: true,
                format: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const posts = likedPosts.map(like => like.post);
    const filteredPosts = this.visibilityService.filterPosts(posts, user);

    return filteredPosts.map(post => this.mapToResponseDto(post, user.id));
  }

  /**
   * Buscar posts com bookmark
   */
  async findBookmarkedPosts(userId: string, user: UserContext, filters: SocialFiltersDto) {
    const bookmarkedPosts = await this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                memberRank: true,
                department: true,
                unit: true,
              },
            },
            media: {
              select: {
                id: true,
                type: true,
                url: true,
                name: true,
                publicId: true,
                resourceType: true,
                deliveryType: true,
                format: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const posts = bookmarkedPosts.map(bookmark => bookmark.post);
    const filteredPosts = this.visibilityService.filterPosts(posts, user);

    return filteredPosts.map(post => this.mapToResponseDto(post, user.id));
  }

  /**
   * Aprovar post (para posts que requerem aprovação)
   */
  async approvePost(id: string, user: UserContext) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post não encontrado');
    }

    // Verificar se usuário pode aprovar
    if (!this.canApprovePosts(user)) {
      throw new ForbiddenException('Você não tem permissão para aprovar posts');
    }

    const approvedPost = await this.prisma.post.update({
      where: { id },
      data: {
        approvedBy: user.id,
        approvedAt: new Date(),
        requiresApproval: false,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        media: {
          select: {
            id: true,
            type: true,
            url: true,
            name: true,
            publicId: true,
            resourceType: true,
            deliveryType: true,
            format: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return this.mapToResponseDto(approvedPost, user.id);
  }

  /**
   * Verificar se post requer aprovação
   */
  private requiresApproval(user: UserContext, dto: CreatePostDto): boolean {
    // Posts RESTRITOS sempre requerem aprovação
    if (dto.visibility === VisibilityLevel.RESTRITO) {
      return true;
    }

    // Patentes baixas postando para público podem requerer aprovação
    if (
      dto.visibility === VisibilityLevel.PUBLICO &&
      this.visibilityService['getRankValue'](user.memberRank) <
        this.visibilityService['getRankValue']('SARGENTO')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Verificar se usuário pode aprovar posts
   */
  private canApprovePosts(user: UserContext): boolean {
    const approverRanks: MemberRank[] = [
      'INSPECTOR',
      'INSPECTOR_PRINCIPAL',
      'ADJUNTO_SUPERINTENDENTE',
      'SUPERINTENDENTE',
      'SUPERINTENDENTE_PRINCIPAL',
      'PRIMEIRO_ADJUNTO_COMISSARIO',
      'COMISSARIO',
      'INSPECTOR_GERAL',
    ];

    return approverRanks.includes(user.memberRank) || user.securityLevel === 'ALTO';
  }

  /**
   * Determinar tipo de mídia baseado na URL
   */

  /**
   * Mapear post do Prisma para DTO de resposta
   */
  private mapToResponseDto(post: any, userId: string) {
    // Verificar se usuário curtiu o post
    const userLike = post.likes?.find((like: any) => like.userId === userId);
    const userBookmark = post.bookmarks?.find((bookmark: any) => bookmark.userId === userId);

    return {
      id: post.id,
      author: {
        id: post.author.id,
        name: post.author.fullName,
        rank: post.author.memberRank,
        department: post.author.department,
        unit: post.author.unit,
        avatar: undefined, // Implementar se tiver avatares
      },
      content: post.content,
      category: post.category,
      visibility: post.visibility,
      media: post.media?.map((media: any) => ({
        type: media.type as 'image' | 'document' | 'video',
        url: this.media.resolveUrl(media),
        name: media.name,
      })),
      metadata: {
        likes: post._count?.likes || 0,
        commentCount: post._count?.comments || 0,
        isLiked: !!userLike,
        isBookmarked: !!userBookmark,
      },
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      location: post.province && post.unit ? {
        province: post.province,
        unit: post.unit,
      } : undefined,
      tags: post.tags || [],
    };
  }
}