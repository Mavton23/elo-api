import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { NotificationFiltersDto } from '../dto/notification-filters.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { NotificationStatsDto } from '../dto/notification-stats.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/modules/auth/types/user.types';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('user-notifications')
@ApiBearerAuth()
@Controller('user/notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário atual' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de notificações',
    type: [NotificationResponseDto] 
  })
  async getUserNotifications(
    @Query() filters: NotificationFiltersDto,
    @CurrentUser() user: User,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number }> {
    return this.notificationsService.getUserNotifications(user.id, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das notificações do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas das notificações',
    type: NotificationStatsDto 
  })
  async getUserStats(
    @CurrentUser() user: User,
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getNotificationStats(user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Obter contagem de notificações não lidas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contagem de notificações não lidas',
    schema: {
      type: 'object',
      properties: {
        unreadCount: { type: 'number' }
      }
    }
  })
  async getUnreadCount(
    @CurrentUser() user: User,
  ): Promise<{ unreadCount: number }> {
    const stats = await this.notificationsService.getNotificationStats(user.id);
    return { unreadCount: stats.unread };
  }

  @Get('requires-action')
  @ApiOperation({ summary: 'Obter notificações que requerem ação' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notificações que requerem ação',
    type: [NotificationResponseDto] 
  })
  async getNotificationsRequiringAction(
    @CurrentUser() user: User,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number }> {
    const filters: NotificationFiltersDto = {
      requiresAction: true,
    };
    return this.notificationsService.getUserNotifications(user.id, filters);
  }
}