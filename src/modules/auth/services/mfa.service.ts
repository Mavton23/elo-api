import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, createPublicKey, randomBytes, verify as cryptoVerify } from 'crypto';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

import { PrismaService } from '@/modules/prisma/prisma.service';

/** Prefixo DER (SubjectPublicKeyInfo) de uma chave pública Ed25519 de 32 bytes. */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
/** Alfabeto dos códigos de recuperação: sem 0/O, 1/I/L, para evitar enganos ao ler. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RECOVERY_CODES = 10;

/** Mensagem que o telemóvel assina. O prefixo impede reutilizar a assinatura noutro contexto. */
export const deviceLoginMessage = (nonce: string) => `ELO-2FA-LOGIN:v1:${nonce}`;

authenticator.options = { window: 1 };

/**
 * Segundo fator próprio do ELO, sem depender de SMS nem de email:
 *
 *  1. Telemóvel de confiança: o telemóvel gera um par de chaves Ed25519 e
 *     guarda a privada no armazenamento seguro, só utilizável com biometria
 *     ou PIN. O servidor guarda apenas a pública e verifica assinaturas.
 *  2. TOTP: códigos de 6 dígitos gerados offline (app ELO ou qualquer app
 *     autenticadora compatível).
 *  3. Códigos de recuperação: 10 códigos de uso único, para papel.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly maxDevices: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.maxDevices = Number(config.get('MAX_TRUSTED_DEVICES', 3));
  }

  // ---------------------------------------------------------------- estado

  async status(userId: string) {
    const [user, devices, recoveryLeft] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { isTwoFactorEnabled: true, officialPhone: true, institutionalEmail: true },
      }),
      this.listDevices(userId),
      this.prisma.recoveryCode.count({ where: { userId, usedAt: null } }),
    ]);
    return {
      devices,
      totpEnabled: !!user?.isTwoFactorEnabled,
      recoveryCodesRemaining: recoveryLeft,
      fallbackChannels: {
        sms: !!user?.officialPhone,
        email: !!user?.institutionalEmail,
      },
    };
  }

  /** Tem algum fator próprio configurado? (Se sim, o 2FA passa a ser sempre exigido.) */
  async hasOwnFactors(userId: string): Promise<{ device: boolean; totp: boolean; recovery: boolean }> {
    const [devices, user, recovery] = await Promise.all([
      this.prisma.trustedDevice.count({ where: { userId, revokedAt: null } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { isTwoFactorEnabled: true } }),
      this.prisma.recoveryCode.count({ where: { userId, usedAt: null } }),
    ]);
    return { device: devices > 0, totp: !!user?.isTwoFactorEnabled, recovery: recovery > 0 };
  }

  // ---------------------------------------------------------------- telemóveis de confiança

  async registerDevice(
    userId: string,
    password: string,
    input: { publicKey: string; name: string; platform?: string },
  ) {
    await this.assertPassword(userId, password);

    const raw = Buffer.from(input.publicKey, 'base64');
    if (raw.length !== 32) {
      throw new BadRequestException('Chave pública inválida (esperada Ed25519 de 32 bytes)');
    }
    this.toKeyObject(input.publicKey); // falha se a chave não for válida

    const active = await this.prisma.trustedDevice.count({ where: { userId, revokedAt: null } });
    if (active >= this.maxDevices) {
      throw new ConflictException(
        `Já tem ${this.maxDevices} telemóveis de confiança. Remova um antes de adicionar outro.`,
      );
    }
    const dup = await this.prisma.trustedDevice.findFirst({
      where: { userId, publicKey: input.publicKey, revokedAt: null },
      select: { id: true },
    });
    if (dup) throw new ConflictException('Este telemóvel já está registado');

    const device = await this.prisma.trustedDevice.create({
      data: {
        userId,
        publicKey: input.publicKey,
        name: input.name.trim().slice(0, 100) || 'Telemóvel',
        platform: input.platform,
      },
    });
    return { deviceId: device.id, name: device.name, createdAt: device.createdAt };
  }

  listDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, platform: true, createdAt: true, lastUsedAt: true },
    });
  }

  async revokeDevice(userId: string, deviceId: string) {
    const r = await this.prisma.trustedDevice.updateMany({
      where: { id: deviceId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) throw new NotFoundException('Telemóvel não encontrado');
  }

  /** Verifica a assinatura do desafio de login feita pelo telemóvel de confiança. */
  async verifyDeviceSignature(
    userId: string,
    deviceId: string | undefined,
    nonce: string | undefined,
    signatureB64: string | undefined,
  ): Promise<boolean> {
    if (!deviceId || !nonce || !signatureB64) return false;
    const device = await this.prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId, revokedAt: null },
    });
    if (!device) return false;

    let ok = false;
    try {
      ok = cryptoVerify(
        null,
        Buffer.from(deviceLoginMessage(nonce), 'utf8'),
        this.toKeyObject(device.publicKey),
        Buffer.from(signatureB64, 'base64'),
      );
    } catch {
      ok = false;
    }
    if (ok) {
      await this.prisma.trustedDevice.update({
        where: { id: device.id },
        data: { lastUsedAt: new Date() },
      });
    }
    return ok;
  }

  // ---------------------------------------------------------------- TOTP

  async setupTotp(user: { id: string; nip: string }, password: string) {
    await this.assertPassword(user.id, password);
    const current = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isTwoFactorEnabled: true },
    });
    if (current?.isTwoFactorEnabled) {
      throw new ConflictException('O código de verificação já está ativo. Desative-o primeiro.');
    }
    const secret = authenticator.generateSecret(); // base32, 160 bits
    const issuer = this.config.get<string>('app.name', 'ELO');
    const otpauthUrl = authenticator.keyuri(user.nip, issuer, secret);
    await this.prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });
    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl: await toDataURL(otpauthUrl),
      period: 30,
      digits: 6,
    };
  }

  async confirmTotp(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, isTwoFactorEnabled: true },
    });
    if (!user?.twoFactorSecret || user.isTwoFactorEnabled) {
      throw new BadRequestException('Não existe configuração pendente');
    }
    if (!authenticator.verify({ token: code, secret: user.twoFactorSecret })) {
      throw new BadRequestException('Código inválido. Confirme a hora do telemóvel e tente de novo.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { isTwoFactorEnabled: true } });
  }

  async disableTotp(userId: string, password: string) {
    await this.assertPassword(userId, password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  // ---------------------------------------------------------------- códigos de recuperação

  /** Gera um novo conjunto (invalida os anteriores). Os códigos só são mostrados uma vez. */
  async generateRecoveryCodes(userId: string, password?: string): Promise<string[]> {
    if (password !== undefined) await this.assertPassword(userId, password);
    const codes = Array.from({ length: RECOVERY_CODES }, () => this.newRecoveryCode());
    await this.prisma.$transaction([
      this.prisma.recoveryCode.deleteMany({ where: { userId } }),
      this.prisma.recoveryCode.createMany({
        data: codes.map((c) => ({ userId, codeHash: this.hashRecovery(c) })),
      }),
    ]);
    return codes;
  }

  /** Consome um código (uso único, à prova de corridas). */
  async consumeRecoveryCode(userId: string, code: string | undefined): Promise<boolean> {
    if (!code) return false;
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length !== 10) return false;
    const r = await this.prisma.recoveryCode.updateMany({
      where: { userId, codeHash: this.hashRecovery(normalized), usedAt: null },
      data: { usedAt: new Date() },
    });
    return r.count === 1;
  }

  // ---------------------------------------------------------------- reposição pelo administrador

  /**
   * Repõe todos os fatores de um efetivo que perdeu o acesso (ato presencial).
   * Devolve novos códigos de recuperação para lhe entregar.
   */
  async resetAllFactors(userId: string): Promise<string[]> {
    await this.prisma.$transaction([
      this.prisma.trustedDevice.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isTwoFactorEnabled: false,
          twoFactorSecret: null,
          mfaChallengeId: null,
          loginAttempts: 0,
          lockedUntil: null,
          refreshToken: null,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);
    this.logger.warn(`Fatores 2FA repostos para o utilizador ${userId}`);
    return this.generateRecoveryCodes(userId);
  }

  // ---------------------------------------------------------------- auxiliares

  private async assertPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || !password || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Senha incorreta');
    }
  }

  private toKeyObject(publicKeyB64: string) {
    return createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyB64, 'base64')]),
      format: 'der',
      type: 'spki',
    });
  }

  private newRecoveryCode(): string {
    const bytes = randomBytes(10);
    let out = '';
    for (const b of bytes) out += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
    return `${out.slice(0, 5)}-${out.slice(5)}`;
  }

  private hashRecovery(code: string): string {
    return createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
  }
}
