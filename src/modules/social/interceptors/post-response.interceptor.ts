import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VisibilityService, UserContext } from '../services/visibility.service';

export interface Response<T> {
  data: T;
  metadata?: {
    canEdit?: boolean;
    canDelete?: boolean;
    availableVisibilityOptions?: string[];
    userContext?: Partial<UserContext>;
  };
}

@Injectable()
export class PostResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private visibilityService: VisibilityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const user: UserContext = request.user;

    return next.handle().pipe(
      map(data => {
        // Se não for um post ou array de posts, retornar sem modificação
        if (!data || (!Array.isArray(data) && typeof data !== 'object')) {
          return { data };
        }

        // Se for array de posts
        if (Array.isArray(data)) {
          return {
            data: data as T,
            metadata: {
              userContext: this.sanitizeUserContext(user),
            },
          };
        }

        // Se for um único post
        const post = data as any;
        if (post.id && post.author && post.visibility) {
          const postContext = {
            authorRank: post.author.rank,
            authorDepartment: post.author.department,
            authorUnit: post.author.unit,
            visibility: post.visibility,
          };

          const canModify = this.visibilityService.canModifyPost(
            user, 
            post.author.id, 
            postContext
          );

          const availableVisibilityOptions = this.visibilityService
            .getAvailableVisibilityOptions(user);

          return {
            data: post as T,
            metadata: {
              canEdit: canModify,
              canDelete: canModify,
              availableVisibilityOptions,
              userContext: this.sanitizeUserContext(user),
            },
          };
        }

        return { data };
      }),
    );
  }

  private sanitizeUserContext(user: UserContext): Partial<UserContext> {
    return {
      id: user.id,
      memberRank: user.memberRank,
      department: user.department,
      unit: user.unit,
      province: user.province,
    };
  }
}