import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityAdminService } from '../services/activity-admin.service';
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
import * as os from 'os';
import * as child_process from 'child_process';
import { promisify } from 'util';
import { Prisma, SettingsCategory, SettingsType } from '@prisma/client';

const exec = promisify(child_process.exec);

@Injectable()
export class SettingsAdminService {
  private settingsCache: Map<string, any> = new Map();

  constructor(
    private prisma: PrismaService,
    private activityService: ActivityAdminService,
  ) {
    this.initializeDefaultSettings();
  }

  async getAllSettings(): Promise<SystemSettingDto[]> {
    const settings = await this.prisma.systemSetting.findMany({
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    return settings.map(setting => ({

      id: setting.id,
      name: setting.name,
      description: setting.description,
      category: setting.category,
      type: setting.type,
      value: this.parseSettingValue(setting.value, setting.type),
      defaultValue: this.parseSettingValue(setting.defaultValue, setting.type),
      options: setting.options as Array<{ label: string; value: any }>,
      required: setting.required,
      editable: setting.editable,
      order: setting.order,
      updatedAt: setting.updatedAt.toISOString(),
      updatedBy: setting.updatedBy?.id,
      updatedByName: setting.updatedBy?.fullName,
      createdAt: setting.createdAt.toISOString(),
    }));
  }

  async getCategories(): Promise<SettingsCategoryDto[]> {
    const categories = await this.prisma.systemSetting.groupBy({
      by: ['category'],
      _count: true,
    });

    const categoryInfo = {
      GENERAL: {
        name: 'Geral',
        description: 'Configurações gerais do sistema',
        icon: 'settings',
      },
      SECURITY: {
        name: 'Segurança',
        description: 'Configurações de segurança e autenticação',
        icon: 'shield',
      },
      NOTIFICATIONS: {
        name: 'Notificações',
        description: 'Configurações de notificações e comunicação',
        icon: 'bell',
      },
      BACKUP: {
        name: 'Backup',
        description: 'Configurações de backup e restauração',
        icon: 'database',
      },
      MAINTENANCE: {
        name: 'Manutenção',
        description: 'Configurações de manutenção do sistema',
        icon: 'tools',
      },
    };

    return categories.map(cat => ({
      id: cat.category,
      ...categoryInfo[cat.category],
      settingsCount: cat._count,
    }));
  }

  async getSettingsByCategory(category: string): Promise<SystemSettingDto[]> {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category: category as any },
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return settings.map(setting => ({
      id: setting.id,
      name: setting.name,
      description: setting.description,
      category: setting.category,
      type: setting.type,
      value: this.parseSettingValue(setting.value, setting.type),
      defaultValue: this.parseSettingValue(setting.defaultValue, setting.type),
      options: setting.options as Array<{ label: string; value: any }>,
      required: setting.required,
      editable: setting.editable,
      order: setting.order,
      updatedAt: setting.updatedAt.toISOString(), // Converter para string
      updatedBy: setting.updatedBy?.id,
      updatedByName: setting.updatedBy?.fullName,
      createdAt: setting.createdAt.toISOString(), // Converter para string
    }));
  }

  async getSetting(id: string): Promise<SystemSettingDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!setting) {
      throw new NotFoundException('Configuração não encontrada');
    }

    return {
      id: setting.id,
      name: setting.name,
      description: setting.description,
      category: setting.category,
      type: setting.type,
      value: this.parseSettingValue(setting.value, setting.type),
      defaultValue: this.parseSettingValue(setting.defaultValue, setting.type),
      options: setting.options as Array<{ label: string; value: any }>,
      required: setting.required,
      editable: setting.editable,
      order: setting.order,
      updatedAt: setting.updatedAt.toISOString(), // Converter para string
      updatedBy: setting.updatedBy?.id,
      updatedByName: setting.updatedBy?.fullName,
      createdAt: setting.createdAt.toISOString(), // Converter para string
    };
  }

  async updateSetting(updateDto: SettingsUpdateDto): Promise<SystemSettingDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id: updateDto.id },
    });

    if (!setting) {
      throw new NotFoundException('Configuração não encontrada');
    }

    if (!setting.editable) {
      throw new BadRequestException('Esta configuração não pode ser editada');
    }

    // Validar valor baseado no tipo
    this.validateSettingValue(updateDto.value, setting.type, setting.options);

    const updatedSetting = await this.prisma.systemSetting.update({
      where: { id: updateDto.id },
      data: {
        value: this.serializeSettingValue(updateDto.value, setting.type),
        updatedAt: new Date(),
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Limpar cache
    this.settingsCache.delete(setting.name);

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'SETTING_UPDATED',
      description: `Configuração "${setting.name}" atualizada`,
      targetType: 'SYSTEM',
      targetId: setting.id,
      targetName: setting.name,
      metadata: {
        oldValue: this.parseSettingValue(setting.value, setting.type),
        newValue: updateDto.value,
      },
    });

    return {
      id: updatedSetting.id,
      name: updatedSetting.name,
      description: updatedSetting.description,
      category: updatedSetting.category,
      type: updatedSetting.type,
      value: this.parseSettingValue(updatedSetting.value, updatedSetting.type),
      defaultValue: this.parseSettingValue(updatedSetting.defaultValue, updatedSetting.type),
      options: updatedSetting.options as Array<{ label: string; value: any }>,
      required: updatedSetting.required,
      editable: updatedSetting.editable,
      order: updatedSetting.order,
      updatedAt: updatedSetting.updatedAt.toISOString(), // Converter para string
      updatedBy: updatedSetting.updatedBy?.id,
      updatedByName: updatedSetting.updatedBy?.fullName,
      createdAt: setting.createdAt.toISOString(), // Converter para string
    };
  }

  async bulkUpdateSettings(bulkUpdateDto: BulkSettingsUpdateDto): Promise<SystemSettingDto[]> {
    const updates = bulkUpdateDto.updates;
    const updateIds = updates.map(u => u.id);
    
    // Buscar todas as configurações de uma vez
    const existingSettings = await this.prisma.systemSetting.findMany({
      where: {
        id: { in: updateIds },
      },
    });

    // Validar todas as atualizações
    const settingMap = new Map(existingSettings.map(s => [s.id, s]));
    
    for (const update of updates) {
      const setting = settingMap.get(update.id);
      
      if (!setting) {
        throw new NotFoundException(`Configuração ${update.id} não encontrada`);
      }

      if (!setting.editable) {
        throw new BadRequestException(`Configuração "${setting.name}" não pode ser editada`);
      }

      this.validateSettingValue(update.value, setting.type, setting.options);
    }

    // Executar atualizações em transação
    const updatedSettings = await this.prisma.$transaction(
      updates.map(update => {
        const setting = settingMap.get(update.id)!;
        return this.prisma.systemSetting.update({
          where: { id: update.id },
          data: {
            value: this.serializeSettingValue(update.value, setting.type),
            updatedAt: new Date(),
          },
          include: {
            updatedBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        });
      })
    );

    // Limpar cache
    updates.forEach(update => {
      const setting = updatedSettings.find(s => s.id === update.id);
      if (setting) {
        this.settingsCache.delete(setting.name);
      }
    });

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'SETTINGS_BULK_UPDATED',
      description: `${updates.length} configurações atualizadas em massa`,
      metadata: {
        count: updates.length,
        updatedSettings: updates.map(u => u.id),
      },
    });

    return updatedSettings.map(setting => ({
      id: setting.id,
      name: setting.name,
      description: setting.description,
      category: setting.category,
      type: setting.type,
      value: this.parseSettingValue(setting.value, setting.type),
      defaultValue: this.parseSettingValue(setting.defaultValue, setting.type),
      options: setting.options as Array<{ label: string; value: any }>,
      required: setting.required,
      editable: setting.editable,
      order: setting.order,
      updatedAt: setting.updatedAt.toISOString(),
      updatedBy: setting.updatedBy?.id,
      updatedByName: setting.updatedBy?.fullName,
      createdAt: setting.createdAt.toISOString(),
    }));
  }

  async resetSetting(id: string): Promise<SystemSettingDto> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new NotFoundException('Configuração não encontrada');
    }

    const defaultValue = setting.defaultValue as any;

    const updatedSetting = await this.prisma.systemSetting.update({
      where: { id },
      data: {
        value: defaultValue,
        updatedAt: new Date(),
      },
      include: {
        updatedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Limpar cache
    this.settingsCache.delete(setting.name);

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'SETTING_RESET',
      description: `Configuração "${setting.name}" restaurada para valor padrão`,
      targetType: 'SYSTEM',
      targetId: setting.id,
      targetName: setting.name,
    });

    return {
      id: updatedSetting.id,
      name: updatedSetting.name,
      description: updatedSetting.description,
      category: updatedSetting.category,
      type: updatedSetting.type,
      value: this.parseSettingValue(updatedSetting.value, setting.type),
      defaultValue: this.parseSettingValue(updatedSetting.defaultValue, setting.type),
      options: updatedSetting.options as Array<{ label: string; value: any }>,
      required: updatedSetting.required,
      editable: updatedSetting.editable,
      order: updatedSetting.order,
      updatedAt: updatedSetting.updatedAt.toISOString(), // Converter para string
      updatedBy: updatedSetting.updatedBy?.id,
      updatedByName: updatedSetting.updatedBy?.fullName,
      createdAt: updatedSetting.createdAt.toISOString(), // Converter para string
    };
  }

  async getSystemInfo(): Promise<SystemInfoDto> {
    const [
      totalUsers,
      activeUsers,
      totalLogs,
      lastBackupSetting,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.activityLog.count(),
      this.prisma.systemSetting.findUnique({ where: { name: 'last_backup' } }),
    ]);

    // Obter informações do sistema
    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);

    // Obter uso de armazenamento (simulado)
    const storageUsed = await this.getDatabaseSize();

    // Obter informações de memória
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsage = `${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB`;

    return {
      version: process.env.APP_VERSION || '1.0.0',
      lastUpdate: new Date().toISOString(),
      uptime: `${days}d ${hours}h ${minutes}m`,
      totalUsers,
      activeUsers,
      totalLogs,
      storageUsed,
      lastBackup: lastBackupSetting ? this.parseSettingValue(lastBackupSetting.value, 'STRING') : undefined,
      serverTime: new Date().toISOString(),
      databaseSize: storageUsed,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      memoryUsage,
      cpuUsage: await this.getCpuUsage(),
    };
  }

  async getBackupConfig(): Promise<BackupConfigDto> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        name: {
          in: [
            'backup_enabled',
            'backup_frequency',
            'backup_time',
            'backup_keep_days',
            'backup_last_run',
            'backup_next_run',
            'backup_path',
          ],
        },
      },
    });

    const getValue = (name: string, defaultValue: any) => {
      const setting = settings.find(s => s.name === name);
      return setting ? this.parseSettingValue(setting.value, setting.type) : defaultValue;
    };

    return {
      enabled: getValue('backup_enabled', false),
      frequency: getValue('backup_frequency', 'DAILY'),
      time: getValue('backup_time', '02:00'),
      keepBackups: getValue('backup_keep_days', 30),
      lastBackup: getValue('backup_last_run', null),
      nextBackup: getValue('backup_next_run', null),
      backupPath: getValue('backup_path', './backups'),
    };
  }

  async updateBackupConfig(config: BackupConfigDto): Promise<BackupConfigDto> {
    const updates = [
      { name: 'backup_enabled', value: config.enabled, type: 'BOOLEAN' },
      { name: 'backup_frequency', value: config.frequency, type: 'STRING' },
      { name: 'backup_time', value: config.time, type: 'STRING' },
      { name: 'backup_keep_days', value: config.keepBackups, type: 'NUMBER' },
      { name: 'backup_path', value: config.backupPath, type: 'STRING' },
    ];

    await Promise.all(
      updates.map(async update => {
        await this.prisma.systemSetting.upsert({
          where: { name: update.name },
          update: {
            value: this.serializeSettingValue(update.value, update.type as any),
            updatedAt: new Date(),
          },
          create: {
            name: update.name,
            description: `Backup: ${update.name.replace('_', ' ')}`,
            category: 'BACKUP',
            type: update.type as any,
            value: this.serializeSettingValue(update.value, update.type as any),
            defaultValue: this.serializeSettingValue(update.value, update.type as any),
            order: 0,
            editable: true,
            required: true,
          },
        });

        this.settingsCache.delete(update.name);
      }),
    );

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'BACKUP_CONFIG_UPDATED',
      description: 'Configurações de backup atualizadas',
      metadata: config,
    });

    return this.getBackupConfig();
  }

  async getSecurityConfig(): Promise<SecurityConfigDto> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        name: {
          in: [
            'security_max_login_attempts',
            'security_lockout_duration',
            'security_session_timeout',
            'security_password_min_length',
            'security_password_require_uppercase',
            'security_password_require_numbers',
            'security_password_require_special',
            'security_two_factor_enabled',
            'security_ip_whitelist',
            'security_allow_multiple_sessions',
            'security_password_expiration_days',
            'security_password_history_size',
          ],
        },
      },
    });

    const getValue = (name: string, defaultValue: any) => {
      const setting = settings.find(s => s.name === name);
      return setting ? this.parseSettingValue(setting.value, setting.type) : defaultValue;
    };

    return {
      maxLoginAttempts: getValue('security_max_login_attempts', 5),
      lockoutDuration: getValue('security_lockout_duration', 30),
      sessionTimeout: getValue('security_session_timeout', 60),
      passwordMinLength: getValue('security_password_min_length', 8),
      passwordRequireUppercase: getValue('security_password_require_uppercase', true),
      passwordRequireNumbers: getValue('security_password_require_numbers', true),
      passwordRequireSpecialChars: getValue('security_password_require_special', true),
      twoFactorEnabled: getValue('security_two_factor_enabled', false),
      ipWhitelist: getValue('security_ip_whitelist', []),
      allowMultipleSessions: getValue('security_allow_multiple_sessions', true),
      passwordExpirationDays: getValue('security_password_expiration_days', 90),
      passwordHistorySize: getValue('security_password_history_size', 5),
    };
  }

  async updateSecurityConfig(config: SecurityConfigDto): Promise<SecurityConfigDto> {
    const updates = [
      { name: 'security_max_login_attempts', value: config.maxLoginAttempts, type: 'NUMBER' },
      { name: 'security_lockout_duration', value: config.lockoutDuration, type: 'NUMBER' },
      { name: 'security_session_timeout', value: config.sessionTimeout, type: 'NUMBER' },
      { name: 'security_password_min_length', value: config.passwordMinLength, type: 'NUMBER' },
      { name: 'security_password_require_uppercase', value: config.passwordRequireUppercase, type: 'BOOLEAN' },
      { name: 'security_password_require_numbers', value: config.passwordRequireNumbers, type: 'BOOLEAN' },
      { name: 'security_password_require_special', value: config.passwordRequireSpecialChars, type: 'BOOLEAN' },
      { name: 'security_two_factor_enabled', value: config.twoFactorEnabled, type: 'BOOLEAN' },
      { name: 'security_ip_whitelist', value: config.ipWhitelist, type: 'JSON' },
      { name: 'security_allow_multiple_sessions', value: config.allowMultipleSessions, type: 'BOOLEAN' },
      { name: 'security_password_expiration_days', value: config.passwordExpirationDays, type: 'NUMBER' },
      { name: 'security_password_history_size', value: config.passwordHistorySize, type: 'NUMBER' },
    ];

    await Promise.all(
      updates.map(async update => {
        await this.prisma.systemSetting.upsert({
          where: { name: update.name },
          update: {
            value: this.serializeSettingValue(update.value, update.type as any),
            updatedAt: new Date(),
          },
          create: {
            name: update.name,
            description: `Segurança: ${update.name.replace('security_', '').replace('_', ' ')}`,
            category: 'SECURITY',
            type: update.type as any,
            value: this.serializeSettingValue(update.value, update.type as any),
            defaultValue: this.serializeSettingValue(update.value, update.type as any),
            order: 0,
            editable: true,
            required: true,
          },
        });

        this.settingsCache.delete(update.name);
      }),
    );

    // Log da atividade
    await this.activityService.logActivity({
      level: 'SECURITY',
      module: 'SETTINGS',
      action: 'SECURITY_CONFIG_UPDATED',
      description: 'Configurações de segurança atualizadas',
      metadata: config,
    });

    return this.getSecurityConfig();
  }

  async getNotificationConfig(): Promise<NotificationConfigDto> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        name: {
          in: [
            'notifications_email_enabled',
            'notifications_email_server',
            'notifications_email_port',
            'notifications_email_from',
            'notifications_push_enabled',
            'notifications_slack_webhook',
            'notifications_telegram_token',
            'notifications_sms_enabled',
            'notifications_sms_provider',
            'notifications_sms_api_key',
            'notifications_default_expiry',
          ],
        },
      },
    });

    const getValue = (name: string, defaultValue: any) => {
      const setting = settings.find(s => s.name === name);
      return setting ? this.parseSettingValue(setting.value, setting.type) : defaultValue;
    };

    return {
      emailEnabled: getValue('notifications_email_enabled', false),
      emailServer: getValue('notifications_email_server', 'smtp.gmail.com'),
      emailPort: getValue('notifications_email_port', 587),
      emailFrom: getValue('notifications_email_from', ''),
      pushEnabled: getValue('notifications_push_enabled', false),
      slackWebhook: getValue('notifications_slack_webhook', ''),
      telegramBotToken: getValue('notifications_telegram_token', ''),
      smsEnabled: getValue('notifications_sms_enabled', false),
      smsProvider: getValue('notifications_sms_provider', ''),
      smsApiKey: getValue('notifications_sms_api_key', ''),
      defaultNotificationExpiry: getValue('notifications_default_expiry', 24),
    };
  }

  async updateNotificationConfig(config: NotificationConfigDto): Promise<NotificationConfigDto> {
    const updates = [
      { name: 'notifications_email_enabled', value: config.emailEnabled, type: 'BOOLEAN' },
      { name: 'notifications_email_server', value: config.emailServer, type: 'STRING' },
      { name: 'notifications_email_port', value: config.emailPort, type: 'NUMBER' },
      { name: 'notifications_email_from', value: config.emailFrom, type: 'STRING' },
      { name: 'notifications_push_enabled', value: config.pushEnabled, type: 'BOOLEAN' },
      { name: 'notifications_slack_webhook', value: config.slackWebhook, type: 'STRING' },
      { name: 'notifications_telegram_token', value: config.telegramBotToken, type: 'STRING' },
      { name: 'notifications_sms_enabled', value: config.smsEnabled, type: 'BOOLEAN' },
      { name: 'notifications_sms_provider', value: config.smsProvider, type: 'STRING' },
      { name: 'notifications_sms_api_key', value: config.smsApiKey, type: 'STRING' },
      { name: 'notifications_default_expiry', value: config.defaultNotificationExpiry, type: 'NUMBER' },
    ];

    await Promise.all(
      updates.map(async update => {
        await this.prisma.systemSetting.upsert({
          where: { name: update.name },
          update: {
            value: this.serializeSettingValue(update.value, update.type as any),
            updatedAt: new Date(),
          },
          create: {
            name: update.name,
            description: `Notificações: ${update.name.replace('notifications_', '').replace('_', ' ')}`,
            category: 'NOTIFICATIONS',
            type: update.type as any,
            value: this.serializeSettingValue(update.value, update.type as any),
            defaultValue: this.serializeSettingValue(update.value, update.type as any),
            order: 0,
            editable: true,
            required: true,
          },
        });

        this.settingsCache.delete(update.name);
      }),
    );

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'NOTIFICATION_CONFIG_UPDATED',
      description: 'Configurações de notificações atualizadas',
      metadata: config,
    });

    return this.getNotificationConfig();
  }

  async getMaintenanceMode() {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { name: 'maintenance_mode' },
    });

    const enabled = setting ? this.parseSettingValue(setting.value, setting.type) : false;
    const message = await this.getSettingValue('maintenance_message', 'Sistema em manutenção. Volte em breve.');
    const allowedIps = await this.getSettingValue('maintenance_allowed_ips', []);
    const estimatedDuration = await this.getSettingValue('maintenance_estimated_duration', 60);

    return {
      enabled,
      message,
      allowedIps,
      estimatedDuration,
      since: setting?.updatedAt || null,
    };
  }

  async setMaintenanceMode(maintenanceData: MaintenanceModeDto) {
    // Atualizar modo de manutenção
    await this.prisma.systemSetting.upsert({
      where: { name: 'maintenance_mode' },
      update: {
        value: this.serializeSettingValue(maintenanceData.enabled, 'BOOLEAN'),
        updatedAt: new Date(),
      },
      create: {
        name: 'maintenance_mode',
        description: 'Modo de manutenção do sistema',
        category: 'MAINTENANCE',
        type: 'BOOLEAN',
        value: this.serializeSettingValue(maintenanceData.enabled, 'BOOLEAN'),
        defaultValue: this.serializeSettingValue(false, 'BOOLEAN'),
        order: 0,
        editable: true,
        required: true,
      },
    });

    // Atualizar mensagem se fornecida
    if (maintenanceData.message !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { name: 'maintenance_message' },
        update: {
          value: this.serializeSettingValue(maintenanceData.message, 'STRING'),
          updatedAt: new Date(),
        },
        create: {
          name: 'maintenance_message',
          description: 'Mensagem do modo de manutenção',
          category: 'MAINTENANCE',
          type: 'STRING',
          value: this.serializeSettingValue(maintenanceData.message, 'STRING'),
          defaultValue: this.serializeSettingValue('Sistema em manutenção. Volte em breve.', 'STRING'),
          order: 1,
          editable: true,
          required: true,
        },
      });
    }

    // Atualizar IPs permitidos se fornecidos
    if (maintenanceData.allowedIps !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { name: 'maintenance_allowed_ips' },
        update: {
          value: this.serializeSettingValue(maintenanceData.allowedIps, 'JSON'),
          updatedAt: new Date(),
        },
        create: {
          name: 'maintenance_allowed_ips',
          description: 'IPs permitidos durante manutenção',
          category: 'MAINTENANCE',
          type: 'JSON',
          value: this.serializeSettingValue(maintenanceData.allowedIps, 'JSON'),
          defaultValue: this.serializeSettingValue([], 'JSON'),
          order: 2,
          editable: true,
          required: true,
        },
      });
    }

    // Atualizar duração estimada se fornecida
    if (maintenanceData.estimatedDuration !== undefined) {
      await this.prisma.systemSetting.upsert({
        where: { name: 'maintenance_estimated_duration' },
        update: {
          value: this.serializeSettingValue(maintenanceData.estimatedDuration, 'NUMBER'),
          updatedAt: new Date(),
        },
        create: {
          name: 'maintenance_estimated_duration',
          description: 'Duração estimada da manutenção (minutos)',
          category: 'MAINTENANCE',
          type: 'NUMBER',
          value: this.serializeSettingValue(maintenanceData.estimatedDuration, 'NUMBER'),
          defaultValue: this.serializeSettingValue(60, 'NUMBER'),
          order: 3,
          editable: true,
          required: true,
        },
      });
    }

    // Limpar cache
    ['maintenance_mode', 'maintenance_message', 'maintenance_allowed_ips', 'maintenance_estimated_duration']
      .forEach(name => this.settingsCache.delete(name));

    // Log da atividade
    await this.activityService.logActivity({
      level: maintenanceData.enabled ? 'WARNING' : 'INFO',
      module: 'SETTINGS',
      action: maintenanceData.enabled ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED',
      description: maintenanceData.enabled 
        ? 'Modo de manutenção ativado' 
        : 'Modo de manutenção desativado',
      metadata: maintenanceData,
    });

    return this.getMaintenanceMode();
  }

  async clearCache() {
    this.settingsCache.clear();

    // Log da atividade
    await this.activityService.logActivity({
      level: 'INFO',
      module: 'SETTINGS',
      action: 'CACHE_CLEARED',
      description: 'Cache do sistema limpo',
    });

    return { message: 'Cache limpo com sucesso' };
  }

  async getSystemLogs(limit = 100) {
    const logs = await this.prisma.activityLog.findMany({
      where: {
        module: 'SYSTEM',
        OR: [
          { level: 'ERROR' },
          { level: 'WARNING' },
          { level: 'SECURITY' },
        ],
      },
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return logs.map(log => ({
      ...log,
      metadata: log.metadata as Record<string, any>,
      userName: log.userName || log.user?.fullName,
    }));
  }

  // Métodos auxiliares
  private convertToInputJsonValue(value: any): any {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }
    
    if (Array.isArray(value) || typeof value === 'object') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Se for uma string que parece JSON, tentar parsear
      try {
        if ((value.startsWith('[') && value.endsWith(']')) || 
            (value.startsWith('{') && value.endsWith('}'))) {
          return JSON.parse(value);
        }
      } catch {
        // Se não for JSON válido, retornar como string
      }
    }
    
    return value;
  }

  private async initializeDefaultSettings() {
    const defaultSettings = [
      // Configurações Gerais
      {
        name: 'system_name',
        description: 'Nome do sistema',
        category: SettingsCategory.GENERAL,
        type: SettingsType.STRING,
        value: 'ELO — Espaço de Ligação Operacional',
        defaultValue: 'ELO — Espaço de Ligação Operacional',
        order: 1,
        editable: true,
        required: true,
      },
      {
        name: 'system_version',
        description: 'Versão do sistema',
        category: SettingsCategory.GENERAL,
        type: SettingsType.STRING,
        value: '1.0.0',
        defaultValue: '1.0.0',
        order: 2,
        editable: false,
        required: true,
      },
      {
        name: 'default_language',
        description: 'Idioma padrão',
        category: SettingsCategory.GENERAL,
        type: SettingsType.SELECT,
        value: 'pt',
        defaultValue: 'pt',
        options: [
          { label: 'Português', value: 'pt' },
          { label: 'English', value: 'en' },
        ],
        order: 3,
        editable: true,
        required: true,
      },

      // Configurações de Segurança (valores padrão)
      {
        name: 'security_max_login_attempts',
        description: 'Máximo de tentativas de login',
        category: SettingsCategory.SECURITY,
        type: SettingsType.NUMBER,
        value: 5,
        defaultValue: 5,
        order: 1,
        editable: true,
        required: true,
      },
      {
        name: 'security_lockout_duration',
        description: 'Duração do bloqueio (minutos)',
        category: SettingsCategory.SECURITY,
        type: SettingsType.NUMBER,
        value: 30,
        defaultValue: 30,
        order: 2,
        editable: true,
        required: true,
      },
      // ... outras configurações padrão
    ];

    for (const setting of defaultSettings) {
      const exists = await this.prisma.systemSetting.findUnique({
        where: { name: setting.name },
      });

      if (!exists) {
        const optionsValue = setting.options 
          ? JSON.stringify(setting.options) 
          : Prisma.JsonNull;

        await this.prisma.systemSetting.create({
          data: {
            name: setting.name,
            description: setting.description,
            category: setting.category,
            type: setting.type,
            value: this.serializeSettingValue(setting.value, setting.type),
            defaultValue: this.serializeSettingValue(setting.defaultValue, setting.type),
            options: optionsValue, // Usar Prisma.JsonNull para null
            order: setting.order,
            editable: setting.editable,
            required: setting.required,
          },
        });
      }
    }
  }

  private parseSettingValue(value: any, type: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'BOOLEAN':
        return Boolean(value);
      case 'NUMBER':
        return Number(value);
      case 'STRING':
        return String(value);
      case 'JSON':
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          return value;
        }
      case 'SELECT':
        return value;
      default:
        return value;
    }
  }

  private serializeSettingValue(value: any, type: string): any {
    switch (type) {
      case 'BOOLEAN':
      case 'NUMBER':
      case 'STRING':
        return value;
      case 'JSON':
        return typeof value === 'string' ? value : JSON.stringify(value);
      case 'SELECT':
        return value;
      default:
        return String(value);
    }
  }

  private validateSettingValue(value: any, type: string, options?: any) {
    if (value === null || value === undefined) {
      return;
    }

    switch (type) {
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Valor deve ser booleano');
        }
        break;
      case 'NUMBER':
        if (isNaN(Number(value))) {
          throw new BadRequestException('Valor deve ser numérico');
        }
        break;
      case 'STRING':
        if (typeof value !== 'string') {
          throw new BadRequestException('Valor deve ser texto');
        }
        break;
      case 'JSON':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          throw new BadRequestException('Valor deve ser JSON válido');
        }
        break;
      case 'SELECT':
        if (options) {
          const validOptions = (typeof options === 'string' ? JSON.parse(options) : options) || [];
          if (!validOptions.some((opt: any) => opt.value === value)) {
            throw new BadRequestException('Valor não está nas opções permitidas');
          }
        }
        break;
    }
  }

  private async getSettingValue(name: string, defaultValue: any) {
    if (this.settingsCache.has(name)) {
      return this.settingsCache.get(name);
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { name },
    });

    const value = setting 
      ? this.parseSettingValue(setting.value, setting.type)
      : defaultValue;

    this.settingsCache.set(name, value);
    return value;
  }

  private async getDatabaseSize(): Promise<string> {
    try {
      // Esta é uma simulação - em produção, use uma consulta SQL real
      const result = await this.prisma.$queryRaw`
        SELECT pg_database_size(current_database()) as size
      `;
      
      if (Array.isArray(result) && result[0]) {
        const size = Number((result[0] as any).size);
        return this.formatFileSize(size);
      }
    } catch (error) {
      // Em caso de erro, retornar valor simulado
      console.error('Error getting database size:', error);
    }
    
    // Valor simulado para desenvolvimento
    return '2.5 GB';
  }

  private async getDiskUsage() {
    try {
      const { stdout } = await exec('df -h /');
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        return {
          total: parts[1],
          used: parts[2],
          free: parts[3],
          usagePercent: parseInt(parts[4].replace('%', '')),
        };
      }
    } catch (error) {
      // Em caso de erro, retornar valores simulados
      console.error('Error getting disk usage:', error);
    }

    // Valores simulados para desenvolvimento
    return {
      total: '100 GB',
      used: '45 GB',
      free: '55 GB',
      usagePercent: 45,
    };
  }

  private async getCpuUsage(): Promise<string> {
    try {
      const { stdout } = await exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
      const usage = parseFloat(stdout.trim());
      return `${usage.toFixed(1)}%`;
    } catch (error) {
      // Em caso de erro, retornar valor simulado
      console.error('Error getting CPU usage:', error);
      return '15.5%';
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}