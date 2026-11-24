import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/modules/prisma/prisma.service';

/**
 * Leitura das políticas que os administradores definem em Configuração do sistema
 * (tabela system_settings), com cache curta e valores por omissão do ambiente.
 * Só existem aqui políticas que a plataforma de facto aplica.
 */
@Injectable()
export class SystemPolicyService {
  private cache = new Map<string, { v: unknown; at: number }>();
  private readonly ttlMs = 15_000;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private async raw(name: string): Promise<unknown> {
    const hit = this.cache.get(name);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.v;
    const row = await this.prisma.systemSetting.findUnique({ where: { name } }).catch(() => null);
    let v: unknown = undefined;
    if (row) {
      v = row.value;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch { /* texto simples */ } }
    }
    this.cache.set(name, { v, at: Date.now() });
    return v;
  }

  invalidate() {
    this.cache.clear();
  }

  async loginPolicy() {
    const max = Number(await this.raw('security_max_login_attempts'));
    const lock = Number(await this.raw('security_lockout_duration'));
    return {
      maxAttempts: Number.isFinite(max) && max >= 3 ? max : this.config.get<number>('security.maxLoginAttempts', 5),
      lockoutMinutes: Number.isFinite(lock) && lock >= 1 ? lock : this.config.get<number>('security.lockoutMinutes', 30),
    };
  }

  async maintenance() {
    const enabled = (await this.raw('maintenance_mode')) === true || (await this.raw('maintenance_mode')) === 'true';
    const message = (await this.raw('maintenance_message')) as string | undefined;
    return { enabled, message: message || 'O ELO está em manutenção. Volte a tentar dentro de momentos.' };
  }
}
