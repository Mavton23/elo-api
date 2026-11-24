import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityService, UserContext } from '../services/visibility.service';

export const OWNERSHIP_KEY = 'ownership';
export const ALLOW_SUPERIORS_KEY = 'allowSuperiors';

@Injectable()
export class PostOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private visibilityService: VisibilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    // Extrair postId da request
    const postId = this.extractPostId(request);
    if (!postId) {
      return true;
    }

    // Buscar post do banco
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

    // Verificar se usuário é o dono do post
    const isOwner = post.authorId === user.id;

    // Se é dono, permitir acesso
    if (isOwner) {
      request.post = post;
      return true;
    }

    // Verificar se permite superiores hierárquicos
    const allowSuperiors = this.reflector.get<boolean>(
      ALLOW_SUPERIORS_KEY,
      context.getHandler(),
    );

    if (allowSuperiors) {
      const postContext = {
        authorRank: post.author.memberRank,
        authorDepartment: post.author.department,
        authorUnit: post.author.unit,
        visibility: post.visibility,
      };

      const canModify = this.visibilityService.canModifyPost(user, post.authorId, postContext);
      
      if (canModify) {
        request.post = post;
        return true;
      }
    }

    throw new ForbiddenException('Você não tem permissão para modificar este post');
  }

  private extractPostId(request: any): string | null {
    // Similar ao método do PostVisibilityGuard
    return request.params?.id || 
           request.body?.postId || 
           request.params?.postId || 
           request.query?.postId;
  }
}