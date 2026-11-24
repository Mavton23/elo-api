export interface SystemSetting {
  id: string;
  name: string;
  description: string;
  category: 'GENERAL' | 'SECURITY' | 'NOTIFICATIONS' | 'BACKUP' | 'MAINTENANCE';
  type: 'BOOLEAN' | 'NUMBER' | 'STRING' | 'SELECT' | 'JSON';
  value: any;
  defaultValue: any;
  options?: Array<{ label: string; value: any }>;
  required: boolean;
  editable: boolean;
  order: number;
  updatedAt: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: string;
}

export interface SettingsCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  settingsCount: number;
}

export interface SystemInfo {
  version: string;
  lastUpdate: string;
  uptime: string;
  totalUsers: number;
  activeUsers: number;
  totalLogs: number;
  storageUsed: string;
  lastBackup?: string;
  serverTime: string;
  databaseSize: string;
  nodeVersion: string;
  environment: string;
  memoryUsage: string;
  cpuUsage: string;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  time: string;
  keepBackups: number;
  lastBackup?: string;
  nextBackup?: string;
  backupPath?: string;
}

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
  allowMultipleSessions: boolean;
  passwordExpirationDays: number;
  passwordHistorySize: number;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  emailServer?: string;
  emailPort?: number;
  emailFrom?: string;
  pushEnabled: boolean;
  slackWebhook?: string;
  telegramBotToken?: string;
  smsEnabled: boolean;
  smsProvider?: string;
  smsApiKey?: string;
  defaultNotificationExpiry: number;
}

export interface BackupFile {
  id: string;
  name: string;
  path: string;
  size: string;
  createdAt: Date;
  modifiedAt: Date;
}

export interface MaintenanceMode {
  enabled: boolean;
  message?: string;
  allowedIps?: string[];
  estimatedDuration?: number;
  since?: Date;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'unhealthy';
  timestamp: string;
  checks: Array<{
    service: string;
    status: string;
    message: string;
    data?: any;
    error?: string;
  }>;
}