import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RANK_ORDER } from '@/common/constants/ranks';
import { SearchMembersDto } from './dto/search-members.dto';
import {
  accessFor,
  DEFAULT_PRIVACY,
  PRIVACY_KEYS,
  PrivacyPrefs,
  ProfileAccess,
  Viewer,
} from './member-privacy';

const CARD_SELECT = {
  id: true,
  fullName: true,
  memberRank: true,
  currentPosition: true,
  department: true,
  unit: true,
  unitType: true,
  province: true,
  entryDate: true,
  institutionalEmail: true,
  officialPhone: true,
  isActive: true,
} satisfies Prisma.UserSelect;

type CardRow = Prisma.UserGetPayload<{ select: typeof CARD_SELECT }>;

/**
 * Diretório de efetivos com privacidade por camadas:
 *  - FULL: o próprio e administradores (dados pessoais completos);
 *  - PUBLIC: cartão profissional (sem BI, NUIT, nascimento, NIP);
 *  - RESTRICTED: apenas nome e patente, quando o titular limitou a visibilidade.
 */
@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberProfile(id: string, viewer: Viewer, options: { includePosts?: boolean; includeNotifications?: boolean } = {}) {
    const member = await this.prisma.user.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Efetivo não encontrado');

    const prefs = (await this.privacyFor([id])).get(id) ?? DEFAULT_PRIVACY;
    const access = accessFor(viewer, member, prefs);
    const isSelf = viewer.id === id;

    const base =
      access === 'FULL'
        ? this.fullProfile(member)
        : access === 'PUBLIC'
          ? this.card(member, prefs)
          : this.restricted(member);

    const extra: Record<string, unknown> = {};
    if (options.includePosts && access !== 'RESTRICTED') {
      extra.posts = await this.prisma.post.findMany({
        where: { authorId: id, isArchived: false, ...(isSelf || viewer.isAdmin ? {} : { visibility: 'PUBLICO' }) },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, content: true, category: true, visibility: true, createdAt: true },
      });
    }
    // Notificações de terceiros nunca são expostas.
    if (options.includeNotifications && isSelf) {
      extra.unreadNotifications = await this.prisma.notificationRecipient.count({ where: { userId: id, status: 'NAO_LIDA' } });
    }
    return { ...base, access, ...extra };
  }

  async searchMembers(dto: SearchMembersDto, viewer: Viewer) {
    const q = dto.q?.trim();
    const where: Prisma.UserWhereInput = {
      isActive: true,
      ...(dto.department && { department: dto.department }),
      ...(dto.rank && { memberRank: dto.rank }),
      ...(dto.province && { province: dto.province }),
      ...(q && q.length >= 2
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { unit: { contains: q, mode: 'insensitive' } },
              { currentPosition: { contains: q, mode: 'insensitive' } },
              ...(viewer.isAdmin ? [{ nip: { startsWith: q } }] : []),
            ],
          }
        : {}),
    };
    if (!q && !dto.department && !dto.rank && !dto.province) {
      return { items: [], total: 0, page: dto.page, limit: dto.limit, hasMore: false };
    }

    // Busca um pouco mais para compensar perfis restritos filtrados.
    const rows = await this.prisma.user.findMany({
      where,
      select: CARD_SELECT,
      orderBy: [{ fullName: 'asc' }],
      skip: (dto.page - 1) * dto.limit,
      take: dto.limit + 1,
    });
    const total = await this.prisma.user.count({ where });
    const prefs = await this.privacyFor(rows.map((r) => r.id));
    const visible = rows
      .slice(0, dto.limit)
      .map((r) => ({ r, p: prefs.get(r.id) ?? DEFAULT_PRIVACY }))
      .filter(({ r, p }) => accessFor(viewer, r, p) !== 'RESTRICTED')
      .map(({ r, p }) => ({ ...this.card(r, p), access: 'PUBLIC' as ProfileAccess }))
      .sort((a, b) => RANK_ORDER.indexOf(b.memberRank) - RANK_ORDER.indexOf(a.memberRank));

    return { items: visible, total, page: dto.page, limit: dto.limit, hasMore: rows.length > dto.limit };
  }

  async getMembersByDepartment(department: string, viewer: Viewer, page = 1, limit = 30) {
    return this.searchMembers(Object.assign(new SearchMembersDto(), { department: department as any, page, limit }), viewer);
  }

  // ───────────────────────── helpers ─────────────────────────

  private async privacyFor(userIds: string[]): Promise<Map<string, PrivacyPrefs>> {
    const map = new Map<string, PrivacyPrefs>();
    if (!userIds.length) return map;
    const rows = await this.prisma.userSetting.findMany({
      where: { userId: { in: userIds }, key: { in: Object.values(PRIVACY_KEYS) } },
      select: { userId: true, key: true, value: true },
    });
    for (const id of userIds) map.set(id, { ...DEFAULT_PRIVACY });
    for (const r of rows) {
      const p = map.get(r.userId)!;
      if (r.key === PRIVACY_KEYS.profileVisibility && typeof r.value === 'string') p.profileVisibility = r.value as any;
      if (r.key === PRIVACY_KEYS.showContacts) p.showContacts = r.value !== false;
    }
    return map;
  }

  private card(m: CardRow, prefs: PrivacyPrefs) {
    return {
      id: m.id,
      fullName: m.fullName,
      memberRank: m.memberRank,
      currentPosition: m.currentPosition,
      department: m.department,
      unit: m.unit,
      unitType: m.unitType,
      province: m.province,
      entryYear: m.entryDate ? new Date(m.entryDate).getFullYear() : null,
      institutionalEmail: prefs.showContacts ? m.institutionalEmail : null,
      officialPhone: prefs.showContacts ? m.officialPhone : null,
      isActive: m.isActive,
    };
  }

  private restricted(m: { id: string; fullName: string; memberRank: any; department: any }) {
    return { id: m.id, fullName: m.fullName, memberRank: m.memberRank, department: m.department };
  }

  private fullProfile(m: any) {
    return {
      ...this.card(m, { ...DEFAULT_PRIVACY, showContacts: true }),
      nip: m.nip,
      biNumber: m.biNumber,
      nuit: m.nuit,
      dateOfBirth: m.dateOfBirth,
      placeOfBirth: m.placeOfBirth,
      nationality: m.nationality,
      maritalStatus: m.maritalStatus,
      trainingCourse: m.trainingCourse,
      trainingSchool: m.trainingSchool,
      graduationYear: m.graduationYear,
      entryDate: m.entryDate,
      securityLevel: m.securityLevel,
      lastAccess: m.lastAccess,
    };
  }
}
