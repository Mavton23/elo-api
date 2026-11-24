import { MemberRank } from '@prisma/client';

/**
 * Ordem oficial das patentes, da mais baixa para a mais alta.
 *
 * Os enums do Prisma são strings, por isso NUNCA comparar patentes com `>`/`<`
 * diretamente (seria uma comparação alfabética). Usar sempre `rankValue()`.
 */
export const RANK_ORDER: readonly MemberRank[] = [
  MemberRank.GUARDA,
  MemberRank.SEGUNDO_CABO,
  MemberRank.PRIMEIRO_CABO,
  MemberRank.SARGENTO,
  MemberRank.SARGENTO_PRINCIPAL,
  MemberRank.SUBINSPECTOR,
  MemberRank.INSPECTOR,
  MemberRank.INSPECTOR_PRINCIPAL,
  MemberRank.ADJUNTO_SUPERINTENDENTE,
  MemberRank.SUPERINTENDENTE,
  MemberRank.SUPERINTENDENTE_PRINCIPAL,
  MemberRank.PRIMEIRO_ADJUNTO_COMISSARIO,
  MemberRank.COMISSARIO,
  MemberRank.INSPECTOR_GERAL,
] as const;

/** Valor numérico da patente (1 = mais baixa). Patente desconhecida = 0. */
export function rankValue(rank: MemberRank | string | null | undefined): number {
  if (!rank) return 0;
  const idx = RANK_ORDER.indexOf(rank as MemberRank);
  return idx === -1 ? 0 : idx + 1;
}

/** `true` se `rank` for igual ou superior a `minimum`. */
export function isRankAtLeast(
  rank: MemberRank | string | null | undefined,
  minimum: MemberRank,
): boolean {
  return rankValue(rank) >= rankValue(minimum);
}

/** Patentes iguais ou superiores a `minimum` (útil em filtros Prisma `in`). */
export function ranksAtLeast(minimum: MemberRank): MemberRank[] {
  return RANK_ORDER.slice(RANK_ORDER.indexOf(minimum));
}
