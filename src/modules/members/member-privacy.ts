import { Department, MemberRank } from '@prisma/client';

/** Chaves de privacidade guardadas em user_settings (ver default-settings.constants). */
export const PRIVACY_KEYS = {
  profileVisibility: 'privacy.profile_visibility',
  showContacts: 'privacy.show_contacts',
} as const;

export type ProfileVisibility = 'INSTITUICAO' | 'DEPARTAMENTO' | 'UNIDADE';

export interface PrivacyPrefs {
  profileVisibility: ProfileVisibility;
  showContacts: boolean;
}

export const DEFAULT_PRIVACY: PrivacyPrefs = { profileVisibility: 'INSTITUICAO', showContacts: true };

export interface Viewer {
  id: string;
  department: Department;
  unit: string;
  memberRank: MemberRank;
  isAdmin: boolean;
}

export interface Target {
  id: string;
  department: Department;
  unit: string;
}

/** Nível de detalhe que o observador pode ver sobre o alvo. */
export type ProfileAccess = 'FULL' | 'PUBLIC' | 'RESTRICTED';

export function accessFor(viewer: Viewer, target: Target, prefs: PrivacyPrefs): ProfileAccess {
  if (viewer.id === target.id || viewer.isAdmin) return 'FULL';
  switch (prefs.profileVisibility) {
    case 'UNIDADE':
      return viewer.unit && viewer.unit === target.unit ? 'PUBLIC' : 'RESTRICTED';
    case 'DEPARTAMENTO':
      return viewer.department === target.department ? 'PUBLIC' : 'RESTRICTED';
    default:
      return 'PUBLIC';
  }
}
