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

export const VISIBILITY_KEY = 'visibility';

@Injectable()
export class PostVisibilityGuard implements CanActivate {
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
      return true; // Se não tem postId, não precisa validar visibilidade
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

    // Verificar visibilidade
    const postContext = {
      authorRank: post.author.memberRank,
      authorDepartment: post.author.department,
      authorUnit: post.author.unit,
      visibility: post.visibility,
    };

    const canView = this.visibilityService.canViewPost(user, postContext);
    
    if (!canView) {
      throw new ForbiddenException('Você não tem permissão para acessar este conteúdo');
    }

    // Adicionar post ao request para uso no controller
    request.post = post;

    return true;
  }

  private extractPostId(request: any): string | null {
    // Tentar extrair do body
    if (request.body?.postId) {
      return request.body.postId;
    }

    // Tentar extrair dos parâmetros
    if (request.params?.postId) {
      return request.params.postId;
    }

    // Tentar extrair da query
    if (request.query?.postId) {
      return request.query.postId;
    }

    // Tentar extrair do path
    const urlParts = request.url.split('/');
    for (let i = 0; i < urlParts.length; i++) {
      if (urlParts[i] === 'posts' && urlParts[i + 1]) {
        return urlParts[i + 1];
      }
    }

    return null;
  }
}