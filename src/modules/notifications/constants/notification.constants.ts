import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationAction 
} from '@prisma/client';

export const NOTIFICATION_CONFIG = {
  // Limites
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_ATTACHMENTS: 10,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Tempos
  EXPIRATION_DAYS: 30, // Dias para expirar notificações
  CONFIRMATION_REMINDER_HOURS: 24, // Horas antes do prazo

  // WebSocket
  PING_INTERVAL: 30000, // 30 segundos
  CONNECTION_TIMEOUT: 30000, // 30 segundos
};

export const CATEGORY_CONFIG: Record<NotificationCategory, {
  label: string;
  color: string;
  icon: string;
  description: string;
}> = {
  OPERACIONAL: {
    label: 'Operacional',
    color: '#dc2626',
    icon: 'alert-triangle',
    description: 'Operações e missões em curso',
  },
  ADMINISTRATIVO: {
    label: 'Administrativo',
    color: '#1e40af',
    icon: 'file-text',
    description: 'Assuntos administrativos',
  },
  SEGURANCA: {
    label: 'Segurança',
    color: '#ea580c',
    icon: 'shield',
    description: 'Alertas de segurança',
  },
  PROMOCOES: {
    label: 'Promoções',
    color: '#be185d',
    icon: 'trending-up',
    description: 'Promoções e movimentações',
  },
  FORMACAO: {
    label: 'Formação',
    color: '#7c3aed',
    icon: 'graduation-cap',
    description: 'Cursos e treinamentos',
  },
  ALERTA: {
    label: 'Alerta',
    color: '#dc2626',
    icon: 'siren',
    description: 'Alertas urgentes',
  },
  INFORMACAO: {
    label: 'Informação',
    color: '#059669',
    icon: 'info',
    description: 'Informações gerais',
  },
  SOCIAL: {
    label: 'Social',
    color: '#0d9488',
    icon: 'users',
    description: 'Eventos sociais',
  },
};

export const URGENCY_CONFIG: Record<UrgencyLevel, {
  label: string;
  color: string;
  icon: string;
  sound?: boolean;
  vibration?: boolean;
}> = {
  BAIXA: {
    label: 'Baixa',
    color: '#6b7280',
    icon: 'bell',
  },
  MEDIA: {
    label: 'Média',
    color: '#ea580c',
    icon: 'bell-ring',
    sound: true,
  },
  ALTA: {
    label: 'Alta',
    color: '#dc2626',
    icon: 'alert-triangle',
    sound: true,
    vibration: true,
  },
  CRITICA: {
    label: 'Crítica',
    color: '#000000',
    icon: 'siren',
    sound: true,
    vibration: true,
  },
};

export const ACTION_CONFIG: Record<NotificationAction, {
  label: string;
  icon: string;
  color: string;
}> = {
  VER_DETALHES: {
    label: 'Ver Detalhes',
    icon: 'eye',
    color: '#1e40af',
  },
  RESPONDER: {
    label: 'Responder',
    icon: 'message-square',
    color: '#059669',
  },
  CONFIRMAR: {
    label: 'Confirmar',
    icon: 'check',
    color: '#059669',
  },
  NEGAR: {
    label: 'Negar',
    icon: 'x',
    color: '#dc2626',
  },
  MARCAR_COMO_RESOLVIDO: {
    label: 'Marcar como Resolvido',
    icon: 'check-circle',
    color: '#059669',
  },
  ENCAMINHAR: {
    label: 'Encaminhar',
    icon: 'forward',
    color: '#7c3aed',
  },
  NENHUMA: {
    label: 'Nenhuma',
    icon: 'minus',
    color: '#6b7280',
  },
};