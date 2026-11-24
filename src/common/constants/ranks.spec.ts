import { MemberRank } from '@prisma/client';
import { isRankAtLeast, rankValue, ranksAtLeast } from './ranks';

describe('ranks', () => {
  it('ordena patentes pela hierarquia, não alfabeticamente', () => {
    // Alfabeticamente "GUARDA" > "COMISSARIO" — o bug que esta utilidade evita
    expect(rankValue(MemberRank.COMISSARIO)).toBeGreaterThan(rankValue(MemberRank.GUARDA));
    expect(isRankAtLeast(MemberRank.GUARDA, MemberRank.COMISSARIO)).toBe(false);
    expect(isRankAtLeast(MemberRank.INSPECTOR_GERAL, MemberRank.INSPECTOR)).toBe(true);
  });

  it('trata valores desconhecidos como a patente mais baixa', () => {
    expect(rankValue(undefined)).toBe(0);
    expect(isRankAtLeast('XYZ', MemberRank.GUARDA)).toBe(false);
  });

  it('lista patentes iguais ou superiores', () => {
    expect(ranksAtLeast(MemberRank.COMISSARIO)).toEqual([
      MemberRank.COMISSARIO,
      MemberRank.INSPECTOR_GERAL,
    ]);
  });
});
