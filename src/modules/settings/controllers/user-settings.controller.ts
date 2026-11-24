import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserSettingsService } from '../services/user-settings.service';
import { UpdateUserSettingDto } from '../dto/update-user-setting.dto';
import { BulkUpdateSettingsDto } from '../dto/bulk-update-settings.dto';
import { UserSettingsResponseDto } from '../dto/user-settings-response.dto';
import { UserSettingDto } from '../dto/user-setting.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { User } from '@/modules/auth/types/user.types';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserSettingCategory } from '@prisma/client';

@ApiTags('user-settings')
@ApiBearerAuth()
@Controller('user/settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Obter todas as configurações do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de configurações do usuário',
    type: UserSettingsResponseDto 
  })
  async getUserSettings(
    @CurrentUser() user: User,
    @Query('category') category?: UserSettingCategory,
    @Query('key') key?: string,
    @Query('visible') visible?: string,
  ): Promise<UserSettingsResponseDto> {
    const isVisible = visible === 'true' ? true : 
                     visible === 'false' ? false : undefined;
    
    return this.userSettingsService.getUserSettings(user.id, {
      category,
      key,
      isVisible,
    });
  }

  @Get('common')
  @ApiOperation({ summary: 'Obter configurações comuns do usuário' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configurações comuns (tema, idioma, etc.)' 
  })
  async getCommonSettings(
    @CurrentUser() user: User,
  ): Promise<Record<string, any>> {
    return this.userSettingsService.getCommonSettings(user.id);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Obter uma configuração específica' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração do usuário',
    type: UserSettingDto 
  })
  async getUserSetting(
    @CurrentUser() user: User,
    @Param('key') key: string,
  ): Promise<UserSettingDto> {
    return this.userSettingsService.getUserSetting(user.id, key);
  }

  @Get(':key/value')
  @ApiOperation({ summary: 'Obter apenas o valor de uma configuração' })
  @ApiResponse({ 
    status: 200, 
    description: 'Valor da configuração' 
  })
  async getUserSettingValue(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Query('default') defaultValue?: string,
  ): Promise<any> {
    const parsedDefault = defaultValue ? JSON.parse(defaultValue) : undefined;
    return this.userSettingsService.getUserSettingValue(user.id, key, parsedDefault);
  }

  @Put(':key')
  @ApiOperation({ summary: 'Atualizar uma configuração' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração atualizada',
    type: UserSettingDto 
  })
  async updateUserSetting(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Body() updateDto: UpdateUserSettingDto,
  ): Promise<UserSettingDto> {
    return this.userSettingsService.updateUserSetting(user.id, key, updateDto);
  }

  @Patch('bulk')
  @ApiOperation({ summary: 'Atualizar múltiplas configurações' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configurações atualizadas',
    type: [UserSettingDto] 
  })
  async bulkUpdateSettings(
    @CurrentUser() user: User,
    @Body() bulkUpdateDto: BulkUpdateSettingsDto,
  ): Promise<UserSettingDto[]> {
    return this.userSettingsService.bulkUpdateSettings(user.id, bulkUpdateDto);
  }

  @Post(':key/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar uma configuração para o valor padrão' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuração resetada',
    type: UserSettingDto 
  })
  async resetUserSetting(
    @CurrentUser() user: User,
    @Param('key') key: string,
  ): Promise<UserSettingDto> {
    return this.userSettingsService.resetUserSetting(user.id, key);
  }

  @Post('reset-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetar todas as configurações para valores padrão' })
  @ApiResponse({ 
    status: 200, 
    description: 'Número de configurações resetadas' 
  })
  async resetAllSettings(
    @CurrentUser() user: User,
    @Query('category') category?: UserSettingCategory,
  ): Promise<{ count: number }> {
    return this.userSettingsService.resetAllUserSettings(user.id, category);
  }

  @Get(':key/history')
  @ApiOperation({ summary: 'Obter histórico de alterações de uma configuração' })
  @ApiResponse({ 
    status: 200, 
    description: 'Histórico de alterações' 
  })
  async getSettingHistory(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.userSettingsService.getSettingHistory(user.id, key, limitNumber);
  }

  // Endpoint para inicializar configurações (útil para migrações)
  @Post('initialize')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inicializar configurações do usuário' })
  async initializeSettings(
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.userSettingsService.initializeUserSettings(user.id);
  }
}