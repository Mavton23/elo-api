import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ActivityAdminService } from '../services/activity-admin.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import {
  ActivityFiltersDto,
  ActivityStatsDto,
  ExportLogsDto,
} from '../dto/activity-log.dto';
import { ActivityLevel, ActivityModule, TargetType } from '@prisma/client';

@ApiTags('Admin - Activity Logs')
@ApiBearerAuth()
@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ActivityAdminController {
  constructor(private readonly activityAdminService: ActivityAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar logs de atividade com filtros' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'level', required: false, enum: ActivityLevel })
  @ApiQuery({ name: 'module', required: false, enum: ActivityModule })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'targetType', required: false, enum: TargetType })
  @ApiQuery({ name: 'targetId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getActivityLogs(@Query() filters: ActivityFiltersDto) {
    return this.activityAdminService.getActivityLogs(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de atividades' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getActivityStats(): Promise<ActivityStatsDto> {
    return this.activityAdminService.getActivityStats();
  }

  @Get('modules')
  @ApiOperation({ summary: 'Obter lista de módulos com contagem' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getModulesStats() {
    return this.activityAdminService.getModulesStats();
  }

  @Get('users/top')
  @ApiOperation({ summary: 'Obter top usuários por atividade' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getTopUsers(@Query('limit') limit?: number) {
    return this.activityAdminService.getTopUsers(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um log' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.activityAdminService.getLog(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obter logs de um usuário específico' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getUserLogs(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityAdminService.getUserLogs(userId, limit);
  }

  @Post('search')
  @ApiOperation({ summary: 'Busca avançada em logs' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async searchLogs(@Body() searchCriteria: any) {
    return this.activityAdminService.searchLogs(searchCriteria);
  }

  @Post('export')
  @ApiOperation({ summary: 'Exportar logs' })
  @AdminPermissions(['LOGS', 'EXPORT'])
  @UseGuards(AdminPermissionsGuard)
  async exportLogs(@Body() exportDto: ExportLogsDto) {
    return this.activityAdminService.exportLogs(exportDto);
  }

  @Delete('cleanup')
  @ApiOperation({ summary: 'Limpar logs antigos' })
  @ApiQuery({ name: 'days', required: true, type: Number })
  @AdminPermissions(['LOGS', 'DELETE'])
  @UseGuards(AdminPermissionsGuard)
  async cleanupOldLogs(@Query('days') days: number) {
    return this.activityAdminService.cleanupOldLogs(days);
  }

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Visão geral para dashboard' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getDashboardOverview() {
    return this.activityAdminService.getDashboardOverview();
  }

  @Get('timeline/daily')
  @ApiOperation({ summary: 'Atividades por dia (últimos 30 dias)' })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getDailyTimeline() {
    return this.activityAdminService.getDailyTimeline();
  }

  @Get('alerts/recent')
  @ApiOperation({ summary: 'Alertas recentes (WARNING/ERROR/SECURITY)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions(['LOGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getRecentAlerts(@Query('limit') limit?: number) {
    return this.activityAdminService.getRecentAlerts(limit);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Simular um log de atividade (apenas desenvolvimento)' })
  @AdminPermissions(['LOGS', 'CREATE'])
  @UseGuards(AdminPermissionsGuard)
  async simulateLog(@Body() logData: any) {
    return this.activityAdminService.simulateLog(logData);
  }
}