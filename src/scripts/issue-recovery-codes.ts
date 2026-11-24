/**
 * ACESSO DE EMERGÊNCIA (break-glass) — só para quem opera o servidor.
 *
 * Gera 10 novos códigos de recuperação para um utilizador (ex.: o único
 * SUPER_ADMIN ficou sem acesso ao 2FA). Quem tem acesso à base de dados já
 * é de confiança máxima; esta operação fica registada na auditoria.
 *
 *   pnpm admin:recovery-codes <NIP>
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ActivityLevel, ActivityModule, PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => {
  let out = '';
  for (const b of randomBytes(10)) out += ALPHABET[b % ALPHABET.length];
  return `${out.slice(0, 5)}-${out.slice(5)}`;
};
const hash = (c: string) => createHash('sha256').update(c.replace(/[^A-Z0-9]/g, '')).digest('hex');

async function main() {
  const nip = process.argv[2];
  if (!nip) {
    console.error('Uso: pnpm admin:recovery-codes <NIP>');
    process.exit(1);
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const user = await prisma.user.findUnique({ where: { nip }, select: { id: true, fullName: true } });
  if (!user) {
    console.error(`✖ Não existe utilizador com NIP ${nip}`);
    process.exit(1);
  }
  const codes = Array.from({ length: 10 }, newCode);
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId: user.id } }),
    prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId: user.id, codeHash: hash(c) })) }),
    prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } }),
    prisma.activityLog.create({
      data: {
        level: ActivityLevel.SECURITY,
        module: ActivityModule.AUTH,
        action: 'BREAK_GLASS_RECOVERY_CODES',
        description: `Códigos de recuperação emitidos por linha de comandos para ${nip}`,
        targetId: user.id,
      },
    }),
  ]);
  console.log(`\n✔ Códigos de recuperação para ${user.fullName} (NIP ${nip}):\n`);
  codes.forEach((c, i) => console.log(`   ${String(i + 1).padStart(2)}. ${c}`));
  console.log('\nNo ecrã de verificação escolha "Código de recuperação". Cada código só funciona uma vez.\n');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
