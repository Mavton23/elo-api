import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

// Tolerância de ±1 janela (30s) para relógios ligeiramente dessincronizados
authenticator.options = { window: 1 };

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Valida um código de login: TOTP (se ativo) ou OTP temporário enviado por
   * SMS/email. O OTP é de uso único e é apagado após sucesso.
   */
  async validateTwoFactorCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        isTwoFactorEnabled: true,
        otpCode: true,
        otpExpiresAt: true,
      },
    });
    if (!user || !/^\d{6}$/.test(code)) return false;

    // TOTP primeiro; se falhar, aceita um OTP pedido explicitamente (último recurso)
    if (user.isTwoFactorEnabled && user.twoFactorSecret) {
      if (authenticator.verify({ token: code, secret: user.twoFactorSecret })) return true;
    }

    if (!user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return false;
    }

    const valid = await bcrypt.compare(code, user.otpCode);
    if (valid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { otpCode: null, otpExpiresAt: null },
      });
    }
    return valid;
  }
}
