import { NotificationSenderGuard, canSendNotifications, notificationMinRank } from '../guards/notification-sender.guard';
import { NotificationReportService } from '../services/notification-report.service';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationFiltersDto } from '../dto/notification-filters.dto';
import { MarkNotificationDto } from '../dto/mark-notification.dto';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { NotificationStatsDto } from '../dto/notification-stats.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/modules/auth/types/user.types';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly reports: NotificationReportService,
  ) {}

  @Post()
  @UseGuards(NotificationSenderGuard)
  @ApiOperation({ summary: 'Criar nova notificação (oficiais ou admins com permissão)' })
  @ApiResponse({ 
    status: 201, 
    description: 'Notificação criada com sucesso',
    type: NotificationResponseDto 
  })
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @CurrentUser() user: User,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.createNotification(
      createNotificationDto, 
      user.id
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de notificações',
    type: [NotificationResponseDto] 
  })
  async findAll(
    @Query() filters: NotificationFiltersDto,
    @CurrentUser() user: User,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number }> {
    return this.notificationsService.getUserNotifications(user.id, filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das notificações' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas das notificações',
    type: NotificationStatsDto 
  })
  async getStats(
    @CurrentUser() user: User,
  ): Promise<NotificationStatsDto> {
    return this.notificationsService.getNotificationStats(user.id);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'O que o utilizador pode fazer com comunicados' })
  capabilities(@CurrentUser() user: User) {
    return { canSend: canSendNotifications(user), minRank: notificationMinRank() };
  }

  @Get('sent')
  @UseGuards(NotificationSenderGuard)
  @ApiOperation({ summary: 'Comunicados que enviei, com progresso de leitura' })
  sent(@CurrentUser() user: User, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.reports.sent(user.id, Math.max(1, Number(page) || 1), Math.min(50, Math.max(1, Number(limit) || 20)));
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Relatório de leitura e confirmação (emissor ou administrador)' })
  report(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reports.report(id, { id: user.id, isAdmin: !!user.isAdmin });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma notificação' })
  @ApiResponse({ 
    status: 200, 
    description: 'Detalhes da notificação',
    type: NotificationResponseDto 
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.getNotificationById(id, user.id);
  }

  @Patch(':id/mark')
  @ApiOperation({ summary: 'Marcar notificação (ler, arquivar, responder)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Notificação atualizada',
    type: NotificationResponseDto 
  })
  async mark(
    @Param('id') id: string,
    @Body() markDto: MarkNotificationDto,
    @CurrentUser() user: User,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markNotification(id, user.id, markDto);
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contagem de notificações marcadas como lidas' 
  })
  async markAllAsRead(
    @CurrentUser() user: User,
  ): Promise<{ count: number }> {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir notificação (apenas remetente)' })
  @ApiResponse({ 
    status: 204, 
    description: 'Notificação excluída com sucesso' 
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.notificationsService.deleteNotification(id, user.id);
  }
}