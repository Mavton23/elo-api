import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  UserSettingCategory, 
  UserSettingType,
  Prisma,
} from '@prisma/client';
import { CreateUserSettingDto } from '../dto/create-user-setting.dto';
import { UpdateUserSettingDto } from '../dto/update-user-setting.dto';
import { BulkUpdateSettingsDto } from '../dto/bulk-update-settings.dto';
import { UserSettingDto } from '../dto/user-setting.dto';
import { UserSettingsResponseDto } from '../dto/user-settings-response.dto';
import { UserSettingsInitializerService } from './user-settings-initializer.service';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => UserSettingsInitializerService))
    private readonly initializerService: UserSettingsInitializerService,
  ) {}

  async initializeUserSettings(userId: string): Promise<void> {
    await this.initializerService.initializeUserSettings(userId);
  }

  async getUserSettings(
    userId: string,
    filters?: {
      category?: UserSettingCategory;
      key?: string;
      isVisible?: boolean;
    },
  ): Promise<UserSettingsResponseDto> {
    // Garante que o utilizador tem exatamente as definições suportadas.
    await this.initializerService.initializeUserSettings(userId);
    const where: Prisma.UserSettingWhereInput = {
      userId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.key && { key: { contains: filters.key, mode: 'insensitive' } }),
      ...(filters?.isVisible !== undefined && { isVisible: filters.isVisible }),
    };

    const [settings, total] = await Promise.all([
      this.prisma.userSetting.findMany({
        where,
        orderBy: [
          { category: 'asc' },
          { order: 'asc' },
          { key: 'asc' },
        ],
      }),
      this.prisma.userSetting.count({ where }),
    ]);

    // Agrupar por categoria para estatísticas
    const byCategory: Record<string, number> = {};
    settings.forEach(setting => {
      byCategory[setting.category] = (byCategory[setting.category] || 0) + 1;
    });

    return {
      settings: settings.map(this.mapToDto),
      total,
      byCategory,
    };
  }

  async getUserSetting(
    userId: string,
    key: string,
  ): Promise<UserSettingDto> {
    const setting = await this.prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException(`Configuração "${key}" não encontrada`);
    }

    return this.mapToDto(setting);
  }

  async getUserSettingValue<T = any>(
    userId: string,
    key: string,
    defaultValue?: T,
  ): Promise<T> {
    try {
      const setting = await this.getUserSetting(userId, key);
      return setting.value !== undefined ? setting.value : (defaultValue as T);
    } catch (error) {
      if (error instanceof NotFoundException && defaultValue !== undefined) {
        return defaultValue as T;
      }
      throw error;
    }
  }

  async updateUserSetting(
    userId: string,
    key: string,
    updateDto: UpdateUserSettingDto,
  ): Promise<UserSettingDto> {
    // Verificar se a configuração existe
    const existingSetting = await this.prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });

    if (!existingSetting) {
      throw new NotFoundException(`Configuração "${key}" não encontrada`);
    }

    if (!existingSetting.isEditable) {
      throw new BadRequestException(`Configuração "${key}" não é editável`);
    }

    // Validar valor baseado no tipo
    const validatedValue = this.validateSettingValue(
      existingSetting.type,
      updateDto.value,
      existingSetting.options as any[],
      existingSetting.minValue,
      existingSetting.maxValue,
      existingSetting.regex,
    );

    // Criar histórico antes de atualizar
    await this.createSettingHistory(
      existingSetting.id,
      existingSetting.value,
      validatedValue,
      userId,
      updateDto.reason,
    );

    // Atualizar configuração
    const updatedSetting = await this.prisma.userSetting.update({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      data: {
        value: validatedValue,
        lastModifiedAt: new Date(),
      },
    });

    this.logger.log(`Configuração atualizada: ${userId} -> ${key} = ${JSON.stringify(validatedValue)}`);

    return this.mapToDto(updatedSetting);
  }

  async bulkUpdateSettings(
    userId: string,
    bulkUpdateDto: BulkUpdateSettingsDto,
  ): Promise<UserSettingDto[]> {
    const results: UserSettingDto[] = [];

    for (const item of bulkUpdateDto.settings) {
      try {
        const updatedSetting = await this.updateUserSetting(
          userId,
          item.key,
          {
            value: item.value,
            reason: item.reason || bulkUpdateDto.reason,
          },
        );
        results.push(updatedSetting);
      } catch (error) {
        this.logger.error(`Erro ao atualizar configuração ${item.key}:`, error);
        // Continue com outras configurações mesmo se uma falhar
      }
    }

    return results;
  }

  async resetUserSetting(
    userId: string,
    key: string,
  ): Promise<UserSettingDto> {
    const setting = await this.prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException(`Configuração "${key}" não encontrada`);
    }

    // Criar histórico
    await this.createSettingHistory(
      setting.id,
      setting.value,
      setting.defaultValue,
      userId,
      'Reset to default',
    );

    // Resetar para valor padrão
    const resetSetting = await this.prisma.userSetting.update({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      data: {
        value: setting.defaultValue !== null ? setting.defaultValue : Prisma.JsonNull,
        lastModifiedAt: new Date(),
      },
    });

    return this.mapToDto(resetSetting);
  }

  async resetAllUserSettings(
    userId: string,
    category?: UserSettingCategory,
  ): Promise<{ count: number }> {
    const where: Prisma.UserSettingWhereInput = {
      userId,
      ...(category && { category }),
    };

    const settings = await this.prisma.userSetting.findMany({
      where,
      select: {
        id: true,
        key: true,
        value: true,
        defaultValue: true,
      },
    });

    // Criar históricos em batch
    const historyData = settings.map(setting => ({
      settingId: setting.id,
      oldValue: setting.value as Prisma.InputJsonValue,
      newValue: setting.defaultValue as Prisma.InputJsonValue,
      changedBy: userId,
      reason: 'Reset all to default',
    }));

    await this.prisma.$transaction(async (tx) => {
      // Criar históricos
      await tx.userSettingHistory.createMany({
        data: historyData,
        skipDuplicates: true,
      });

      // Resetar todos os valores
      await tx.userSetting.updateMany({
        where,
        data: {
          value: Prisma.JsonNull, // Usar valor padrão do campo
          lastModifiedAt: new Date(),
        },
      });
    });

    this.logger.log(`Todas as configurações resetadas para o usuário ${userId}`);

    return { count: settings.length };
  }

  async getSettingHistory(
    userId: string,
    key: string,
    limit = 10,
  ) {
    const setting = await this.prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      select: { id: true },
    });

    if (!setting) {
      throw new NotFoundException(`Configuração "${key}" não encontrada`);
    }

    return this.prisma.userSettingHistory.findMany({
      where: { settingId: setting.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        oldValue: true,
        newValue: true,
        changedBy: true,
        reason: true,
        createdAt: true,
      },
    });
  }

  // Métodos auxiliares
  private validateSettingValue(
    type: UserSettingType,
    value: any,
    options?: any[],
    minValue?: any,
    maxValue?: any,
    regex?: string | null,
  ): any {
    if (value === undefined || value === null) {
      return null;
    }

    switch (type) {
      case 'BOOLEAN':
        if (typeof value !== 'boolean') {
          throw new BadRequestException('Valor deve ser booleano (true/false)');
        }
        return value;

      case 'NUMBER':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new BadRequestException('Valor deve ser um número');
        }
        if (minValue !== undefined && numValue < Number(minValue)) {
          throw new BadRequestException(`Valor deve ser maior ou igual a ${minValue}`);
        }
        if (maxValue !== undefined && numValue > Number(maxValue)) {
          throw new BadRequestException(`Valor deve ser menor ou igual a ${maxValue}`);
        }
        return numValue;

      case 'STRING':
        if (typeof value !== 'string') {
          throw new BadRequestException('Valor deve ser uma string');
        }
        if (regex && !new RegExp(regex).test(value)) {
          throw new BadRequestException(`Valor não corresponde ao formato esperado: ${regex}`);
        }
        return value;

      case 'SELECT':
        if (!options || !options.some((o: any) => (o && typeof o === 'object' ? o.value : o) === value)) {
          throw new BadRequestException(
            `Valor inválido. Opções válidas: ${options?.map((o: any) => (o && typeof o === 'object' ? o.value : o)).join(', ') || 'nenhuma'}`
          );
        }
        return value;

      case 'JSON':
        try {
          return typeof value === 'string' ? JSON.parse(value) : value;
        } catch {
          throw new BadRequestException('Valor deve ser um JSON válido');
        }

      case 'ARRAY':
        if (!Array.isArray(value)) {
          throw new BadRequestException('Valor deve ser um array');
        }
        if (options && value.some(item => !options.includes(item))) {
          throw new BadRequestException(
            `Array contém valores inválidos. Valores permitidos: ${options?.join(', ')}`
          );
        }
        return value;

      default:
        return value;
    }
  }

  private async createSettingHistory(
    settingId: string,
    oldValue: any,
    newValue: any,
    changedBy: string,
    reason?: string,
  ): Promise<void> {
    try {
      await this.prisma.userSettingHistory.create({
        data: {
          settingId,
          oldValue,
          newValue,
          changedBy,
          reason,
        },
      });
    } catch (error) {
      this.logger.error('Erro ao criar histórico de configuração:', error);
      // Não falhar a operação principal se o histórico falhar
    }
  }

  private mapToDto(setting: any): UserSettingDto {
    return {
      id: setting.id,
      userId: setting.userId,
      key: setting.key,
      category: setting.category,
      type: setting.type,
      value: setting.value,
      defaultValue: setting.defaultValue,
      label: setting.label,
      description: setting.description,
      options: setting.options,
      order: setting.order,
      isRequired: setting.isRequired,
      isEditable: setting.isEditable,
      isVisible: setting.isVisible,
      minValue: setting.minValue,
      maxValue: setting.maxValue,
      regex: setting.regex,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
      lastModifiedAt: setting.lastModifiedAt?.toISOString(),
    };
  }

  // Método para administradores
  async createUserSetting(
    userId: string,
    createDto: CreateUserSettingDto,
  ): Promise<UserSettingDto> {
    // Verificar se já existe
    const existing = await this.prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: createDto.key,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Configuração "${createDto.key}" já existe`);
    }

    const setting = await this.prisma.userSetting.create({
      data: {
        userId,
        key: createDto.key,
        category: createDto.category,
        type: createDto.type,
        value: createDto.value !== undefined ? createDto.value : createDto.defaultValue,
        defaultValue: createDto.defaultValue,
        label: createDto.label,
        description: createDto.description,
        options: createDto.options,
        order: createDto.order || 0,
        isRequired: createDto.isRequired || false,
        isEditable: createDto.isEditable !== undefined ? createDto.isEditable : true,
        isVisible: createDto.isVisible !== undefined ? createDto.isVisible : true,
        minValue: createDto.minValue,
        maxValue: createDto.maxValue,
        regex: createDto.regex,
      },
    });

    return this.mapToDto(setting);
  }

  // Método para obter configurações comuns
  async getCommonSettings(userId: string) {
    const settings = await this.prisma.userSetting.findMany({
      where: {
        userId,
        OR: [
          { key: 'appearance.theme' },
          { key: 'appearance.language' },
          { key: 'notifications.enabled' },
          { key: 'preferences.default_dashboard' },
        ],
      },
    });

    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value !== undefined ? setting.value : setting.defaultValue;
      return acc;
    }, {} as Record<string, any>);
  }
}