import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, ServiceRequestStatus, UrgencyLevel } from '@prisma/client';
import { randomInt } from 'crypto';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { MediaCloudinaryService } from '@/modules/social/services/media-cloudinary.service';
import type { AuthUser } from '@/modules/auth/types/user.types';
import {
  CreateLifeProofCampaignDto,
  ListRequestsQueryDto,
  ReviewDto,
  SubmitLifeProofDto,
  UpdateLifeProofCampaignDto,
} from '../dto/member-services.dto';
import { MemberNotifier } from './member-notifier.service';

const SELFIE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CHALLENGE_TTL = '10m';

interface ChallengePayload {
  sub: string;
  typ: 'lifeproof';
  code: string;
  cid: string | null;
}

/**
 * Prova de vida digital.
 *
 * Fluxo: a app pede um desafio → mostra um código de 4 dígitos → o efetivo
 * tira uma selfie (câmara, não galeria) a segurar o código escrito → a app
 * envia selfie + localização → um revisor compara com a prova anterior e aprova.
 * O código, assinado pelo servidor e válido 10 min, impede o reenvio de
 * fotografias antigas.
 */
@Injectable()
export class LifeProofService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly media: MediaCloudinaryService,
    private readonly notifier: MemberNotifier,
  ) {}

  // ---------------------------------------------------------------- efetivo

  /** Campanha ativa que abrange este efetivo (ou null). */
  async activeCampaignFor(user: Pick<AuthUser, 'department' | 'province'>) {
    const now = new Date();
    const campaigns = await this.prisma.lifeProofCampaign.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
    });
    return (
      campaigns.find(
        (c) =>
          (c.targetDepartments.length === 0 || c.targetDepartments.includes(user.department)) &&
          (c.targetProvinces.length === 0 || c.targetProvinces.includes(user.province)),
      ) ?? null
    );
  }

  async status(user: AuthUser) {
    const campaign = await this.activeCampaignFor(user);
    const [current, lastApproved] = await Promise.all([
      campaign
        ? this.prisma.lifeProof.findFirst({
            where: { userId: user.id, campaignId: campaign.id, status: { not: 'CANCELADO' } },
            orderBy: { submittedAt: 'desc' },
          })
        : null,
      this.prisma.lifeProof.findFirst({
        where: { userId: user.id, status: 'APROVADO' },
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true, reviewedAt: true },
      }),
    ]);

    const canSubmit = !!campaign && (!current || current.status === 'REJEITADO');

    return {
      campaign: campaign && {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        endsAt: campaign.endsAt,
      },
      current: current && this.toMemberView(current),
      lastApprovedAt: lastApproved?.reviewedAt ?? lastApproved?.submittedAt ?? null,
      canSubmit,
      message: !campaign
        ? 'Não há nenhuma campanha de prova de vida em curso para si.'
        : !current
          ? `Faça a sua prova de vida até ${campaign.endsAt.toLocaleDateString('pt-MZ')}.`
          : current.status === 'PENDENTE'
            ? 'A sua prova de vida foi recebida e aguarda validação.'
            : current.status === 'APROVADO'
              ? 'Prova de vida validada. Não precisa de fazer mais nada.'
              : 'A sua prova de vida foi rejeitada. Veja o motivo e submeta novamente.',
    };
  }

  async createChallenge(user: AuthUser) {
    const st = await this.status(user);
    if (!st.canSubmit) throw new BadRequestException(st.message);

    const code = randomInt(1000, 10000).toString();
    const challengeToken = await this.jwt.signAsync(
      { sub: user.id, typ: 'lifeproof', code, cid: st.campaign?.id ?? null } satisfies ChallengePayload,
      { secret: this.config.getOrThrow('JWT_SECRET'), expiresIn: CHALLENGE_TTL },
    );
    return {
      challengeToken,
      code,
      expiresInSeconds: 600,
      instructions: [
        `Escreva o código ${code} numa folha de papel.`,
        'Segure a folha junto ao rosto, num local bem iluminado.',
        'Tire a fotografia com a câmara frontal. Não use fotografias da galeria.',
      ],
    };
  }

  async submit(user: AuthUser, dto: SubmitLifeProofDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('A fotografia (selfie) é obrigatória');
    if (!SELFIE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('A fotografia deve ser JPEG, PNG ou WebP');
    }

    let payload: ChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<ChallengePayload>(dto.challengeToken, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('O código expirou. Peça um novo código e tire nova fotografia.');
    }
    if (payload.typ !== 'lifeproof' || payload.sub !== user.id) {
      throw new UnauthorizedException('Código de prova de vida inválido');
    }

    const st = await this.status(user);
    if (!st.canSubmit || st.campaign?.id !== payload.cid) {
      throw new ConflictException(st.message);
    }

    const upload = await this.media.uploadFile(file, user.id, 'life-proof', { private: true });

    const proof = await this.prisma.lifeProof.create({
      data: {
        userId: user.id,
        campaignId: payload.cid,
        challengeCode: payload.code,
        selfiePublicId: upload.publicId,
        selfieFormat: upload.format,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy,
        devicePlatform: dto.platform,
      },
    });
    return this.toMemberView(proof);
  }

  async history(userId: string) {
    const rows = await this.prisma.lifeProof.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: { campaign: { select: { title: true } } },
    });
    return rows.map((r) => ({ ...this.toMemberView(r), campaignTitle: r.campaign?.title ?? null }));
  }

  // ---------------------------------------------------------------- administração

  createCampaign(adminId: string, dto: CreateLifeProofCampaignDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) throw new BadRequestException('A data de fim tem de ser posterior à de início');
    return this.prisma.lifeProofCampaign.create({
      data: {
        title: dto.title,
        description: dto.description,
        startsAt,
        endsAt,
        targetDepartments: dto.targetDepartments ?? [],
        targetProvinces: dto.targetProvinces ?? [],
        createdById: adminId,
      },
    });
  }

  updateCampaign(id: string, dto: UpdateLifeProofCampaignDto) {
    return this.prisma.lifeProofCampaign.update({
      where: { id },
      data: {
        isActive: dto.isActive,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  listCampaigns() {
    return this.prisma.lifeProofCampaign.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { proofs: true } } },
    });
  }

  /** Cumprimento da campanha: quantos efetivos abrangidos já submeteram/foram validados. */
  async compliance(campaignId: string) {
    const c = await this.prisma.lifeProofCampaign.findUnique({ where: { id: campaignId } });
    if (!c) throw new NotFoundException('Campanha não encontrada');

    const target: Prisma.UserWhereInput = {
      isActive: true,
      ...(c.targetDepartments.length ? { department: { in: c.targetDepartments } } : {}),
      ...(c.targetProvinces.length ? { province: { in: c.targetProvinces } } : {}),
    };
    const [targetUsers, byStatus] = await Promise.all([
      this.prisma.user.count({ where: target }),
      this.prisma.lifeProof.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { _all: true },
      }),
    ]);
    const count = (s: ServiceRequestStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
    const submittedUsers = await this.prisma.lifeProof.findMany({
      where: { campaignId, status: { in: ['PENDENTE', 'APROVADO'] } },
      distinct: ['userId'],
      select: { userId: true },
    });
    const approved = count('APROVADO');
    return {
      campaign: { id: c.id, title: c.title, startsAt: c.startsAt, endsAt: c.endsAt },
      targetUsers,
      approved,
      pending: count('PENDENTE'),
      rejected: count('REJEITADO'),
      missing: Math.max(0, targetUsers - submittedUsers.length),
      complianceRate: targetUsers ? Math.round((approved / targetUsers) * 1000) / 10 : 0,
      // Lista nominal de quem ainda não submeteu (para os RH contactarem).
      missingMembers: await this.prisma.user.findMany({
        where: { AND: [target, { id: { notIn: submittedUsers.map((u) => u.userId) } }] },
        select: { id: true, fullName: true, memberRank: true, unit: true, province: true },
        orderBy: [{ province: 'asc' }, { fullName: 'asc' }],
        take: 200,
      }),
    };
  }

  async list(q: ListRequestsQueryDto) {
    const where: Prisma.LifeProofWhereInput = {
      status: q.status,
      campaignId: q.campaignId,
      user: {
        department: q.department,
        province: q.province,
      },
    };
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.lifeProof.findMany({
        where,
        orderBy: { submittedAt: 'asc' }, // fila: mais antigos primeiro
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: this.userSummarySelect } },
      }),
      this.prisma.lifeProof.count({ where }),
    ]);
    return {
      items: items.map((p) => ({
        id: p.id,
        status: p.status,
        submittedAt: p.submittedAt,
        user: p.user,
      })),
      total,
      page,
      limit,
    };
  }

  /** Detalhe para validação: selfie atual, código esperado e a última selfie aprovada. */
  async detail(id: string) {
    const p = await this.prisma.lifeProof.findUnique({
      where: { id },
      include: { user: { select: this.userSummarySelect }, campaign: { select: { title: true } } },
    });
    if (!p) throw new NotFoundException('Prova de vida não encontrada');

    const reference = await this.prisma.lifeProof.findFirst({
      where: { userId: p.userId, status: 'APROVADO', id: { not: p.id } },
      orderBy: { submittedAt: 'desc' },
    });

    return {
      id: p.id,
      status: p.status,
      campaignTitle: p.campaign?.title ?? null,
      user: p.user,
      expectedCode: p.challengeCode,
      selfieUrl: this.selfieUrl(p),
      referenceSelfieUrl: reference ? this.selfieUrl(reference) : null,
      referenceDate: reference?.submittedAt ?? null,
      location:
        p.latitude != null && p.longitude != null
          ? { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy }
          : null,
      platform: p.devicePlatform,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
      reviewNote: p.reviewNote,
    };
  }

  async review(id: string, reviewer: AuthUser, dto: ReviewDto) {
    if (dto.decision === 'REJEITADO' && !dto.note?.trim()) {
      throw new BadRequestException('Indique o motivo da rejeição para o efetivo poder corrigir');
    }
    const p = await this.prisma.lifeProof.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Prova de vida não encontrada');
    if (p.status !== 'PENDENTE') throw new ConflictException('Esta prova de vida já foi decidida');
    if (p.userId === reviewer.id) {
      throw new BadRequestException('Não pode validar a sua própria prova de vida');
    }

    const updated = await this.prisma.lifeProof.update({
      where: { id },
      data: {
        status: dto.decision,
        reviewNote: dto.note?.trim() || null,
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
      },
    });

    await this.notifier.notify({
      senderId: reviewer.id,
      userId: p.userId,
      title: dto.decision === 'APROVADO' ? 'Prova de vida validada' : 'Prova de vida rejeitada',
      message:
        dto.decision === 'APROVADO'
          ? 'A sua prova de vida foi validada. Obrigado.'
          : `A sua prova de vida foi rejeitada: ${dto.note}. Abra o ELO e submeta novamente.`,
      urgency: dto.decision === 'APROVADO' ? UrgencyLevel.BAIXA : UrgencyLevel.ALTA,
    });

    return { id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt };
  }

  // ---------------------------------------------------------------- auxiliares

  private readonly userSummarySelect = {
    id: true,
    nip: true,
    fullName: true,
    memberRank: true,
    department: true,
    unit: true,
    province: true,
  } satisfies Prisma.UserSelect;

  private selfieUrl(p: { selfiePublicId: string; selfieFormat: string | null }) {
    return this.media.resolveUrl({
      publicId: p.selfiePublicId,
      format: p.selfieFormat,
      resourceType: 'image',
      deliveryType: 'authenticated',
    });
  }

  private toMemberView(p: {
    id: string;
    status: ServiceRequestStatus;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewNote: string | null;
  }) {
    return {
      id: p.id,
      status: p.status,
      submittedAt: p.submittedAt,
      reviewedAt: p.reviewedAt,
      reviewNote: p.reviewNote,
    };
  }
}
