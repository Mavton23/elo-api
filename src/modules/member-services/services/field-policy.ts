import { MaritalStatus } from '@prisma/client';

export interface FieldPolicy {
  label: string;
  /** Aplicado de imediato, sem revisão (dados de contacto de baixo risco). */
  autoApprove: boolean;
  /** Exige documento comprovativo anexado. */
  requiresDocument?: boolean;
  /** Também atualiza a base pré-registada (Member). */
  syncMember?: boolean;
  /** Normaliza e valida. Devolve o valor ou lança Error com a mensagem. */
  parse: (value: unknown) => unknown;
}

const PHONE = /^\+?(258)?8[2-7]\d{7}$/;
const str = (max: number) => (v: unknown) => {
  if (typeof v !== 'string' || !v.trim()) throw new Error('valor em falta');
  const t = v.trim();
  if (t.length > max) throw new Error(`máximo ${max} caracteres`);
  return t;
};
const phone = (v: unknown) => {
  const t = str(20)(v) as string;
  const n = t.replace(/[\s-]/g, '');
  if (!PHONE.test(n)) throw new Error('número moçambicano inválido (ex.: +258 84 123 4567)');
  return n.startsWith('+') ? n : n.startsWith('258') ? `+${n}` : `+258${n}`;
};

/**
 * Campos que o efetivo pode pedir para alterar e a política de cada um.
 * Dados de identidade e carreira (nome, NIP, BI, NUIT, patente, unidade…)
 * NÃO estão aqui: só mudam por ato administrativo.
 */
export const FIELD_POLICIES: Record<string, FieldPolicy> = {
  personalPhone: { label: 'Telefone pessoal', autoApprove: true, parse: phone },
  residentialAddress: { label: 'Morada', autoApprove: true, parse: str(300) },
  emergencyContactName: { label: 'Contacto de emergência (nome)', autoApprove: true, parse: str(200) },
  emergencyContactPhone: { label: 'Contacto de emergência (telefone)', autoApprove: true, parse: phone },
  officialPhone: { label: 'Telefone de serviço', autoApprove: false, syncMember: true, parse: phone },
  institutionalEmail: {
    label: 'Email institucional',
    autoApprove: false,
    syncMember: true,
    parse: (v) => {
      const t = (str(100)(v) as string).toLowerCase();
      if (!/^[^\s@]+@(mint|policia|prisoes|migracao)\.gov\.mz$/.test(t)) {
        throw new Error('tem de ser um email institucional (.gov.mz)');
      }
      return t;
    },
  },
  maritalStatus: {
    label: 'Estado civil',
    autoApprove: false,
    requiresDocument: true,
    syncMember: true,
    parse: (v) => {
      if (!Object.values(MaritalStatus).includes(v as MaritalStatus)) {
        throw new Error(`valores aceites: ${Object.values(MaritalStatus).join(', ')}`);
      }
      return v;
    },
  },
  trainingSpecialty: { label: 'Especialidade', autoApprove: false, parse: str(100) },
  additionalCourses: {
    label: 'Cursos adicionais',
    autoApprove: false,
    requiresDocument: true,
    parse: (v) => {
      if (!Array.isArray(v) || v.length > 30) throw new Error('lista de cursos inválida');
      return v.map((c) => str(150)(c));
    },
  },
};

export const EDITABLE_FIELDS = Object.keys(FIELD_POLICIES);
