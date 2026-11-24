import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingsAdminService } from '../services/settings-admin.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import {
  SystemSettingDto,
  SettingsUpdateDto,
  BulkSettingsUpdateDto,
  SettingsCategoryDto,
  SystemInfoDto,
  BackupConfigDto,
  SecurityConfigDto,
  NotificationConfigDto,
  BackupCreateDto,
  BackupRestoreDto,
  MaintenanceModeDto,
} from '../dto/system-settings.dto';

@ApiTags('Admin - System Settings')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SettingsAdminController {
  constructor(private readonly settingsAdminService: SettingsAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Obter todas as configurações' })
  @AdminPermissions(['SETTINGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getAllSettings(): Promise<SystemSettingDto[]> {
    return this.settingsAdminService.getAllSettings();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Obter categorias de configurações' })
  @AdminPermissions(['SETTINGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getCategories(): Promise<SettingsCategoryDto[]> {
    return this.settingsAdminService.getCategories();
  }

  @Get('category/:category')
  @ApiOperation({ summary: 'Obter configurações por categoria' })
  @AdminPermissions(['SETTINGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getSettingsByCategory(
    @Param('category') category: string,
  ): Promise<SystemSettingDto[]> {
    return this.settingsAdminService.getSettingsByCategory(category);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Obter status do modo de manutenção' })
  @AdminPermissions(['SYSTEM', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getMaintenanceMode() {
    return this.settingsAdminService.getMaintenanceMode();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter uma configuração específica' })
  @AdminPermissions(['SETTINGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getSetting(@Param('id', ParseUUIDPipe) id: string): Promise<SystemSettingDto> {
    return this.settingsAdminService.getSetting(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Atualizar uma configuração' })
  @AdminPermissions(['SETTINGS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateSetting(@Body() updateDto: SettingsUpdateDto): Promise<SystemSettingDto> {
    return this.settingsAdminService.updateSetting(updateDto);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Atualizar múltiplas configurações' })
  @AdminPermissions(['SETTINGS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async bulkUpdateSettings(
    @Body() bulkUpdateDto: BulkSettingsUpdateDto,
  ): Promise<SystemSettingDto[]> {
    return this.settingsAdminService.bulkUpdateSettings(bulkUpdateDto);
  }

  @Patch('reset/:id')
  @ApiOperation({ summary: 'Restaurar configuração para valor padrão' })
  @AdminPermissions(['SETTINGS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async resetSetting(@Param('id', ParseUUIDPipe) id: string): Promise<SystemSettingDto> {
    return this.settingsAdminService.resetSetting(id);
  }

  @Get('system/info')
  @ApiOperation({ summary: 'Obter informações do sistema' })
  @AdminPermissions(['SYSTEM', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getSystemInfo(): Promise<SystemInfoDto> {
    return this.settingsAdminService.getSystemInfo();
  }

  @Get('security/config')
  @ApiOperation({ summary: 'Obter configurações de segurança' })
  @AdminPermissions(['SETTINGS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getSecurityConfig(): Promise<SecurityConfigDto> {
    return this.settingsAdminService.getSecurityConfig();
  }

  @Put('security/config')
  @ApiOperation({ summary: 'Atualizar configurações de segurança' })
  @AdminPermissions(['SETTINGS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateSecurityConfig(@Body() config: SecurityConfigDto): Promise<SecurityConfigDto> {
    return this.settingsAdminService.updateSecurityConfig(config);
  }

  @Put('maintenance')
  @ApiOperation({ summary: 'Ativar/desativar modo de manutenção' })
  @AdminPermissions(['SYSTEM', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async setMaintenanceMode(@Body() maintenanceData: MaintenanceModeDto) {
    return this.settingsAdminService.setMaintenanceMode(maintenanceData);
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Limpar cache do sistema' })
  @AdminPermissions(['SYSTEM', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async clearCache() {
    return this.settingsAdminService.clearCache();
  }

  @Get('logs/system')
  @ApiOperation({ summary: 'Obter logs do sistema' })
  @AdminPermissions(['SYSTEM', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getSystemLogs(@Query('limit') limit?: number) {
    return this.settingsAdminService.getSystemLogs(limit);
  }
}