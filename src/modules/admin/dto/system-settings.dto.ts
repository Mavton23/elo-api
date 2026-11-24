import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max, IsArray, ValidateNested, IsUUID, IsDefined, IsIn, Matches, IsIP } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SettingsCategory, SettingsType } from '@prisma/client';

export class SystemSettingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SettingsCategory })
  category: SettingsCategory;

  @ApiProperty({ enum: SettingsType })
  type: SettingsType;

  @ApiProperty()
  value: any;

  @ApiProperty()
  defaultValue: any;

  @ApiPropertyOptional()
  options?: Array<{ label: string; value: any }>;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  editable: boolean;

  @ApiProperty()
  order: number;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional()
  updatedBy?: string;

  @ApiPropertyOptional()
  updatedByName?: string;

  @ApiProperty()
  createdAt: string;
}

export class SettingsUpdateDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsDefined()
  value: any;
}

export class BulkSettingsUpdateDto {
  @ApiProperty({ type: [SettingsUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingsUpdateDto)
  updates: SettingsUpdateDto[];
}

export class SettingsCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  settingsCount: number;
}

export class SystemInfoDto {
  @ApiProperty()
  version: string;

  @ApiProperty()
  lastUpdate: string;

  @ApiProperty()
  uptime: string;

  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  activeUsers: number;

  @ApiProperty()
  totalLogs: number;

  @ApiProperty()
  storageUsed: string;

  @ApiPropertyOptional()
  lastBackup?: string;

  @ApiProperty()
  serverTime: string;

  @ApiProperty()
  databaseSize: string;

  @ApiProperty()
  nodeVersion: string;

  @ApiProperty()
  environment: string;

  @ApiProperty()
  memoryUsage: string;

  @ApiProperty()
  cpuUsage: string;
}

export class BackupConfigDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  @ApiProperty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Hora deve estar no formato HH:MM' })
  time: string; // HH:MM

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(365)
  keepBackups: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lastBackup?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nextBackup?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  backupPath?: string;
}

export class SecurityConfigDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxLoginAttempts: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(1440)
  lockoutDuration: number;

  @ApiProperty()
  @IsNumber()
  @Min(5)
  @Max(480)
  sessionTimeout: number;

  @ApiProperty()
  @IsNumber()
  @Min(8)
  @Max(32)
  passwordMinLength: number;

  @ApiProperty()
  @IsBoolean()
  passwordRequireUppercase: boolean;

  @ApiProperty()
  @IsBoolean()
  passwordRequireNumbers: boolean;

  @ApiProperty()
  @IsBoolean()
  passwordRequireSpecialChars: boolean;

  @ApiProperty()
  @IsBoolean()
  twoFactorEnabled: boolean;

  @ApiProperty({ type: [String] })
  @IsArray() @IsIP(undefined, { each: true })
  ipWhitelist: string[];

  @ApiProperty()
  @IsBoolean()
  allowMultipleSessions: boolean;

  @ApiProperty()
  @IsNumber() @Min(0) @Max(3650)
  passwordExpirationDays: number;

  @ApiProperty()
  @IsNumber() @Min(0) @Max(50)
  passwordHistorySize: number;
}

export class NotificationConfigDto {
  @ApiProperty()
  @IsBoolean()
  emailEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailServer?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(1)
  @Max(65535)
  emailPort?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailFrom?: string;

  @ApiProperty()
  @IsBoolean()
  pushEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  slackWebhook?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  telegramBotToken?: string;

  @ApiProperty()
  @IsBoolean()
  smsEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  smsProvider?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  smsApiKey?: string;

  @ApiProperty()
  @IsNumber() @Min(1)
  defaultNotificationExpiry: number; // hours
}

export class BackupCreateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  includeDatabase?: boolean = true;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  includeLogs?: boolean = false;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  includeSettings?: boolean = true;
}

export class BackupRestoreDto {
  @ApiProperty()
  @IsString()
  backupId: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  restoreDatabase?: boolean = true;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  restoreSettings?: boolean = true;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  restoreUsers?: boolean = false;
}

export class MaintenanceModeDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedIps?: string[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  estimatedDuration?: number; // minutes
}