import { UserSettingCategory, UserSettingType } from '@prisma/client';

export const USER_SETTINGS_CONFIG = {
  // Limites
  MAX_KEY_LENGTH: 100,
  MAX_LABEL_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Valores padrão
  DEFAULT_ORDER: 0,
  DEFAULT_IS_EDITABLE: true,
  DEFAULT_IS_VISIBLE: true,
  DEFAULT_IS_REQUIRED: false,
};

export const CATEGORY_CONFIG: Record<UserSettingCategory, {
  label: string;
  icon: string;
  color: string;
  description: string;
  order: number;
}> = {
  NOTIFICATIONS: {
    label: 'Notificações',
    icon: 'bell',
    color: '#3b82f6',
    description: 'Configurações de notificações e alertas',
    order: 1,
  },
  PRIVACY: {
    label: 'Privacidade',
    icon: 'shield',
    color: '#10b981',
    description: 'Configurações de privacidade e dados',
    order: 2,
  },
  SECURITY: {
    label: 'Segurança',
    icon: 'lock',
    color: '#ef4444',
    description: 'Configurações de segurança e autenticação',
    order: 3,
  },
  APPEARANCE: {
    label: 'Aparência',
    icon: 'palette',
    color: '#8b5cf6',
    description: 'Configurações de tema e interface',
    order: 4,
  },
  ACCOUNT: {
    label: 'Conta',
    icon: 'user',
    color: '#f59e0b',
    description: 'Configurações da conta do usuário',
    order: 5,
  },
  PREFERENCES: {
    label: 'Preferências',
    icon: 'settings',
    color: '#6366f1',
    description: 'Preferências gerais do usuário',
    order: 6,
  },
  SYSTEM: {
    label: 'Sistema',
    icon: 'cpu',
    color: '#6b7280',
    description: 'Configurações do sistema',
    order: 7,
  },
};

export const TYPE_CONFIG: Record<UserSettingType, {
  label: string;
  icon: string;
  defaultValue: any;
}> = {
  BOOLEAN: {
    label: 'Sim/Não',
    icon: 'toggle-left',
    defaultValue: false,
  },
  NUMBER: {
    label: 'Número',
    icon: 'hash',
    defaultValue: 0,
  },
  STRING: {
    label: 'Texto',
    icon: 'type',
    defaultValue: '',
  },
  SELECT: {
    label: 'Seleção',
    icon: 'list',
    defaultValue: null,
  },
  JSON: {
    label: 'JSON',
    icon: 'code',
    defaultValue: {},
  },
  ARRAY: {
    label: 'Lista',
    icon: 'list',
    defaultValue: [],
  },
};