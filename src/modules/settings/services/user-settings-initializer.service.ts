import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_USER_SETTINGS } from '../constants/default-settings.constants';

/**
 * Sincroniza as definições de cada utilizador com o catálogo suportado:
 * cria as que faltam, atualiza rótulos/opções e remove chaves descontinuadas.
 * Idempotente e seguro em concorrência (createMany + skipDuplicates).
 */
@Injectable()
export class UserSettingsInitializerService {
  private readonly logger = new Logger(UserSettingsInitializerService.name);
  private readonly keys = DEFAULT_USER_SETTINGS.map((d) => d.key);

  constructor(private readonly prisma: PrismaService) {}

  async initializeUserSettings(userId: string): Promise<void> {
    const existing = await this.prisma.userSetting.findMany({ where: { userId }, select: { key: true, label: true } });
    const have = new Map(existing.map((e) => [e.key, e.label]));
    const stale = existing.filter((e) => !this.keys.includes(e.key)).map((e) => e.key);

    const missing = DEFAULT_USER_SETTINGS.filter((d) => !have.has(d.key));
    const outdated = DEFAULT_USER_SETTINGS.filter((d) => have.has(d.key) && have.get(d.key) !== d.label);
    if (!stale.length && !missing.length && !outdated.length) return;

    await this.prisma.$transaction([
      ...(stale.length ? [this.prisma.userSetting.deleteMany({ where: { userId, key: { in: stale } } })] : []),
      ...(missing.length
        ? [
            this.prisma.userSetting.createMany({
              skipDuplicates: true,
              data: missing.map((d) => ({
                userId,
                key: d.key,
                category: d.category,
                type: d.type,
                value: d.defaultValue,
                defaultValue: d.defaultValue,
                label: d.label,
                description: d.description,
                options: d.options as any,
                order: d.order ?? 0,
                isRequired: d.isRequired ?? false,
                isEditable: d.isEditable ?? true,
                isVisible: d.isVisible ?? true,
              })),
            }),
          ]
        : []),
      ...outdated.map((d) =>
        this.prisma.userSetting.update({
          where: { userId_key: { userId, key: d.key } },
          data: { label: d.label, description: d.description, options: d.options as any, order: d.order ?? 0, category: d.category, defaultValue: d.defaultValue },
        }),
      ),
    ]);
    this.logger.debug(`Definições sincronizadas para ${userId}: +${missing.length} ~${outdated.length} -${stale.length}`);
  }
}
