import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from '../dto';
import { VisibilityService, UserContext } from './visibility.service';
import { PostsService } from './posts.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private visibilityService: VisibilityService,
    private postsService: PostsService,
  ) {}

  /**
   * Criar comentário em um post
   */
  async create(
    postId: string,
    user: UserContext,
    createCommentDto: CreateCommentDto,
  ) {
    // Verificar se post existe e usuário pode ver
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
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

    // Verificar se usuário pode ver o post
    const postContext = {
      authorRank: post.author.memberRank,
      authorDepartment: post.author.department,
      authorUnit: post.author.unit,
      visibility: post.visibility,
    };

    if (!this.visibilityService.canViewPost(user, postContext)) {
      throw new ForbiddenException('Você não tem permissão para comentar neste post');
    }

    // Verificar se post está arquivado
    if (post.isArchived) {
      throw new BadRequestException('Não é possível comentar em um post arquivado');
    }

    // Verificar se post requer aprovação e ainda não foi aprovado
    if (post.requiresApproval && !post.approvedAt) {
      throw new BadRequestException('Post ainda não foi aprovado para comentários');
    }

    // Criar comentário
    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        postId,
        userId: user.id,
      },
      include: {
        user: {
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

    return this.mapToResponseDto(comment);
  }

  /**
   * Buscar comentários de um post
   */
  async findAllByPost(
    postId: string,
    user: UserContext,
    page: number = 1,
    limit: number = 20,
  ) {
    // Verificar se post existe e usuário pode ver
    try {
      await this.postsService.findOne(postId, user);
    } catch (error) {
      throw error; // Re-passar o erro (NotFound ou Forbidden)
    }

    // Calcular offset para paginação
    const skip = (page - 1) * limit;

    // Buscar comentários
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Contar total de comentários
    const total = await this.prisma.comment.count({
      where: { postId },
    });

    // Mapear para DTO
    const mappedComments = comments.map(comment =>
      this.mapToResponseDto(comment),
    );

    return {
      comments: mappedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Atualizar comentário
   */
  async update(
    id: string,
    user: UserContext,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        post: {
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
        },
        user: {
          select: {
            id: true,
            memberRank: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar permissão para editar
    const canEdit = await this.canModifyComment(comment, user);
    if (!canEdit) {
      throw new ForbiddenException('Você não tem permissão para editar este comentário');
    }

    // Atualizar comentário
    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        content: updateCommentDto.content,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
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

    return this.mapToResponseDto(updatedComment);
  }

  /**
   * Excluir comentário
   */
  async remove(id: string, user: UserContext) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        post: {
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
        },
        user: {
          select: {
            id: true,
            memberRank: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar permissão para excluir
    const canDelete = await this.canModifyComment(comment, user);
    if (!canDelete) {
      throw new ForbiddenException('Você não tem permissão para excluir este comentário');
    }

    // Excluir comentário
    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comentário excluído com sucesso' };
  }

  /**
   * Verificar se usuário pode modificar comentário
   */
  private async canModifyComment(comment: any, user: UserContext): Promise<boolean> {
    // Dono do comentário pode modificar
    if (comment.user.id === user.id) {
      return true;
    }

    // Dono do post pode modificar/excluir comentários
    if (comment.post.authorId === user.id) {
      return true;
    }

    // Superiores hierárquicos podem modificar comentários de inferiores
    const commenterRankValue = this.visibilityService['getRankValue'](comment.user.memberRank);
    const userRankValue = this.visibilityService['getRankValue'](user.memberRank);
    
    if (userRankValue > commenterRankValue) {
      return true;
    }

    // Comandantes podem modificar comentários em seus posts/departamentos
    if (
      comment.post.author.department === user.department &&
      userRankValue >= this.visibilityService['getRankValue']('INSPECTOR')
    ) {
      return true;
    }

    // Inspetor Geral pode modificar qualquer comentário
    if (user.memberRank === 'INSPECTOR_GERAL') {
      return true;
    }

    return false;
  }

  /**
   * Buscar comentários de um usuário
   */
  async findByUser(userId: string, currentUser: UserContext, page: number = 1, limit: number = 20) {
    // Calcular offset
    const skip = (page - 1) * limit;

    // Buscar comentários do usuário
    const comments = await this.prisma.comment.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            memberRank: true,
            department: true,
            unit: true,
          },
        },
        post: {
          select: {
            id: true,
            visibility: true,
            author: {
              select: {
                id: true,
                memberRank: true,
                department: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Filtrar comentários em posts que o usuário atual pode ver
    const filteredComments = comments.filter(comment => {
      const postContext = {
        authorRank: comment.post.author.memberRank,
        authorDepartment: comment.post.author.department,
        authorUnit: comment.post.author.unit,
        visibility: comment.post.visibility,
      };
      return this.visibilityService.canViewPost(currentUser, postContext);
    });

    // Contar total (após filtragem)
    const total = await this.prisma.comment.count({
      where: { userId },
    });

    // Mapear para DTO
    const mappedComments = filteredComments.map(comment =>
      this.mapToResponseDto(comment),
    );

    return {
      comments: mappedComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Mapear comentário do Prisma para DTO
   */
  private mapToResponseDto(comment: any) {
    return {
      id: comment.id,
      postId: comment.postId,
      author: {
        id: comment.user.id,
        name: comment.user.fullName,
        rank: comment.user.memberRank,
        department: comment.user.department,
        avatar: undefined, // Implementar se tiver avatares
      },
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      isEdited: comment.isEdited,
    };
  }
}