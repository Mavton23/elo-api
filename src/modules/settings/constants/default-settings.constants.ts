import { UserSettingCategory, UserSettingType } from '@prisma/client';

export interface DefaultUserSetting {
  key: string;
  category: UserSettingCategory;
  type: UserSettingType;
  defaultValue: any;
  label: string;
  description?: string;
  options?: { value: string; label: string }[];
  order?: number;
  isRequired?: boolean;
  isEditable?: boolean;
  isVisible?: boolean;
}

/**
 * Catálogo de definições pessoais. Só entram aqui definições que a plataforma
 * de facto respeita — cada uma indica onde é aplicada.
 */
export const DEFAULT_USER_SETTINGS: DefaultUserSetting[] = [
  {
    // Aplicada em MembersService (perfil e diretório).
    key: 'privacy.profile_visibility',
    category: 'PRIVACY',
    type: 'SELECT',
    defaultValue: 'INSTITUICAO',
    label: 'Quem pode ver o meu perfil',
    description: 'Fora deste grupo, os colegas só veem o seu nome e patente.',
    options: [
      { value: 'INSTITUICAO', label: 'Todo o efetivo' },
      { value: 'DEPARTAMENTO', label: 'O meu departamento' },
      { value: 'UNIDADE', label: 'A minha unidade' },
    ],
    order: 1,
  },
  {
    // Aplicada em MembersService (cartão profissional).
    key: 'privacy.show_contacts',
    category: 'PRIVACY',
    type: 'BOOLEAN',
    defaultValue: true,
    label: 'Mostrar contactos de serviço',
    description: 'Email institucional e telefone de serviço visíveis para colegas.',
    order: 2,
  },
  {
    // Aplicada em AuthService.issueSession (alerta de nova entrada).
    key: 'security.login_alerts',
    category: 'SECURITY',
    type: 'BOOLEAN',
    defaultValue: true,
    label: 'Avisar-me de cada nova entrada',
    description: 'Recebe um aviso na caixa de comunicados sempre que a sua conta inicia sessão.',
    order: 1,
  },
  {
    // Aplicada na app (vibração ao receber um comunicado em tempo real).
    key: 'notifications.vibration.enabled',
    category: 'NOTIFICATIONS',
    type: 'BOOLEAN',
    defaultValue: true,
    label: 'Vibrar ao receber comunicados',
    description: 'Com a app aberta, o telemóvel vibra quando chega um comunicado.',
    order: 1,
  },
];
