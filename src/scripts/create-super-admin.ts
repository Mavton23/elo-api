/**
 * Cria (ou promove) o primeiro SUPER_ADMIN do ELO.
 *
 * Como o pré-registo de membros só pode ser feito por administradores,
 * este script é a forma segura de arrancar o sistema numa instalação nova.
 *
 * Uso:
 *   pnpm admin:create
 *
 * Variáveis necessárias (no .env ou na linha de comando):
 *   SEED_ADMIN_NIP, SEED_ADMIN_BI, SEED_ADMIN_NUIT, SEED_ADMIN_NAME,
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AdminLevel,
  Department,
  MaritalStatus,
  MemberRank,
  PrismaClient,
  SecurityLevel,
  UnitType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => {
  let out = '';
  for (const b of randomBytes(10)) out += ALPHABET[b % ALPHABET.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};
const hashCode = (c: string) => createHash('sha256').update(c.replace(/[^A-Z0-9]/g, '')).digest('hex');

const required = (name: string): string => {
  const v = process.env[name];
  if (!v) {
    console.error(`✖ Variável ${name} em falta`);
    process.exit(1);
  }
  return v;
};

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: required('DATABASE_URL') }),
  });

  const nip = required('SEED_ADMIN_NIP');
  const password = required('SEED_ADMIN_PASSWORD');
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(password)) {
    console.error('✖ A senha do SUPER_ADMIN deve ter ≥12 caracteres, com maiúscula, minúscula e número');
    process.exit(1);
  }

  const data = {
    nip,
    biNumber: required('SEED_ADMIN_BI').toUpperCase(),
    nuit: required('SEED_ADMIN_NUIT'),
    fullName: required('SEED_ADMIN_NAME'),
    institutionalEmail: process.env.SEED_ADMIN_EMAIL || null,
    officialPhone: process.env.SEED_ADMIN_PHONE || null,
    dateOfBirth: new Date(process.env.SEED_ADMIN_BIRTH || '1980-01-01'),
    placeOfBirth: process.env.SEED_ADMIN_BIRTHPLACE || 'Maputo',
    maritalStatus: MaritalStatus.CASADO,
    memberRank: (process.env.SEED_ADMIN_RANK as MemberRank) || MemberRank.SUPERINTENDENTE,
    currentPosition: process.env.SEED_ADMIN_POSITION || 'Administrador do Sistema ELO',
    department: (process.env.SEED_ADMIN_DEPARTMENT as Department) || Department.POLICIA_PROTECAO,
    unit: process.env.SEED_ADMIN_UNIT || 'Direcção Nacional',
    unitType: UnitType.DIRECCAO_NACIONAL,
    province: process.env.SEED_ADMIN_PROVINCE || 'Maputo Cidade',
    entryDate: new Date(process.env.SEED_ADMIN_ENTRY || '2005-01-01'),
  };

  const passwordHash = await bcrypt.hash(password, 12);

  const codes = Array.from({ length: 10 }, newCode);

  await prisma.$transaction(async (tx) => {
    await tx.member.upsert({
      where: { nip },
      update: {},
      create: { ...data, isVerified: true, verifiedAt: new Date() },
    });

    const user = await tx.user.upsert({
      where: { nip },
      update: { passwordHash, isActive: true, tokenVersion: { increment: 1 } },
      create: {
        ...data,
        passwordHash,
        passwordChangedAt: new Date(),
        securityLevel: SecurityLevel.ADMINISTRATIVO,
      },
    });

    await tx.adminProfile.upsert({
      where: { userId: user.id },
      update: { adminLevel: AdminLevel.SUPER_ADMIN, adminStatus: 'ACTIVE' },
      create: { userId: user.id, adminLevel: AdminLevel.SUPER_ADMIN },
    });

    // Códigos de recuperação: garantem o primeiro acesso mesmo sem SMS/email
    await tx.recoveryCode.deleteMany({ where: { userId: user.id } });
    await tx.recoveryCode.createMany({
      data: codes.map((c) => ({ userId: user.id, codeHash: hashCode(c) })),
    });
  });

  console.log(`✔ SUPER_ADMIN pronto (NIP ${nip}). O 2FA será exigido no login.`);
  console.log('\nCódigos de recuperação (guarde em papel; cada um funciona uma vez):\n');
  codes.forEach((c, i) => console.log(`   ${String(i + 1).padStart(2)}. ${c}`));
  console.log('\nNo primeiro acesso, configure o telemóvel de confiança em Segurança da conta.\n');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
