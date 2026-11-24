import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UrgencyLevel } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { MediaCloudinaryService } from '@/modules/social/services/media-cloudinary.service';
import type { AuthUser } from '@/modules/auth/types/user.types';
import {
  CreateDataUpdateRequestDto,
  ListRequestsQueryDto,
  ReviewDto,
} from '../dto/member-services.dto';
import { EDITABLE_FIELDS, FIELD_POLICIES } from './field-policy';
import { MemberNotifier } from './member-notifier.service';

type Changes = Record<string, { from: unknown; to: unknown }>;

const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const PROFILE_SELECT = Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, true])) as Record<
  string,
  true
>;

/**
 * Pedidos de atualização de dados pessoais.
 *
 * - Dados de contacto (telefone pessoal, morada, contacto de emergência) são
 *   aplicados de imediato: zero filas para o que não tem risco.
 * - Restantes campos passam por validação dos Recursos Humanos, com
 *   documento comprovativo quando a política do campo o exige.
 * - Tudo fica registado: valor anterior, valor novo, quem decidiu e quando.
 */
@Injectable()
export class DataUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaCloudinaryService,
    private readonly notifier: MemberNotifier,
  ) {}

  /** Dados atuais editáveis + descrição dos campos para o formulário da app. */
  async editableProfile(userId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT as Prisma.UserSelect,
    });
    return {
      values: current,
      fields: EDITABLE_FIELDS.map((key) => ({
        key,
        label: FIELD_POLICIES[key].label,
        autoApprove: FIELD_POLICIES[key].autoApprove,
        requiresDocument: !!FIELD_POLICIES[key].requiresDocument,
      })),
    };
  }

  async create(user: AuthUser, dto: CreateDataUpdateRequestDto, file?: Express.Multer.File) {
    const keys = Object.keys(dto.changes ?? {});
    if (keys.length === 0) throw new BadRequestException('Indique pelo menos um campo a alterar');

    const unknown = keys.filter((k) => !FIELD_POLICIES[k]);
    if (unknown.length) {
      throw new BadRequestException(
        `Estes campos não podem ser alterados por pedido: ${unknown.join(', ')}. ` +
          'Dados de identidade e carreira só mudam por ato administrativo.',
      );
    }

    // Validar e normalizar cada valor
    const parsed: Record<string, unknown> = {};
    const errors: string[] = [];
    for (const k of keys) {
      try {
        parsed[k] = FIELD_POLICIES[k].parse(dto.changes[k]);
      } catch (e) {
        errors.push(`${FIELD_POLICIES[k].label}: ${(e as Error).message}`);
      }
    }
    if (errors.length) throw new BadRequestException(errors);

    const needsDoc = keys.filter((k) => FIELD_POLICIES[k].requiresDocument);
    if (needsDoc.length && !file) {
      throw new BadRequestException(
        `Anexe um documento comprovativo para: ${needsDoc.map((k) => FIELD_POLICIES[k].label).join(', ')}`,
      );
    }
    if (file && !DOC_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('O comprovativo deve ser PDF ou imagem (JPEG, PNG, WebP)');
    }

    const current = (await this.prisma.user.findUnique({
      where: { id: user.id },
      select: PROFILE_SELECT as Prisma.UserSelect,
    })) as Record<string, unknown>;

    const changes: Changes = {};
    for (const k of keys) {
      if (JSON.stringify(current[k] ?? null) !== JSON.stringify(parsed[k])) {
        changes[k] = { from: current[k] ?? null, to: parsed[k] };
      }
    }
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Os valores indicados são iguais aos atuais');
    }

    // Um campo não pode estar em dois pedidos pendentes ao mesmo tempo
    const pending = await this.prisma.dataUpdateRequest.findMany({
      where: { userId: user.id, status: 'PENDENTE' },
      select: { changes: true },
    });
    const busy = pending
      .flatMap((p) => Object.keys(p.changes as object))
      .filter((k) => k in changes);
    if (busy.length) {
      throw new ConflictException(
        `Já tem um pedido pendente para: ${[...new Set(busy)].map((k) => FIELD_POLICIES[k].label).join(', ')}`,
      );
    }

    // Unicidade do email institucional
    if (changes.institutionalEmail) {
      const taken = await this.prisma.user.findFirst({
        where: { institutionalEmail: changes.institutionalEmail.to as string, id: { not: user.id } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Esse email institucional já está associado a outra conta');
    }

    const upload = file
      ? await this.media.uploadFile(file, user.id, 'data-updates', { private: true })
      : null;

    const autoApprove = Object.keys(changes).every((k) => FIELD_POLICIES[k].autoApprove);

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dataUpdateRequest.create({
        data: {
          userId: user.id,
          changes: changes as Prisma.InputJsonValue,
          justification: dto.justification?.trim() || null,
          documentPublicId: upload?.publicId,
          documentResourceType: upload?.resourceType,
          documentFormat: upload?.format,
          documentName: file?.originalname?.slice(0, 200),
          ...(autoApprove
            ? {
                status: 'APROVADO',
                autoApproved: true,
                reviewedAt: new Date(),
                reviewNote: 'Aprovação automática: dados de contacto',
              }
            : {}),
        },
      });
      if (autoApprove) await this.apply(tx, user.id, changes);
      return created;
    });

    return this.toView(request);
  }

  async mine(userId: string) {
    const rows = await this.prisma.dataUpdateRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.toView(r));
  }

  async cancel(id: string, userId: string) {
    const r = await this.prisma.dataUpdateRequest.findUnique({ where: { id } });
    if (!r || r.userId !== userId) throw new NotFoundException('Pedido não encontrado');
    if (r.status !== 'PENDENTE') throw new ConflictException('Só pode cancelar pedidos pendentes');
    const updated = await this.prisma.dataUpdateRequest.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
    return this.toView(updated);
  }

  // ---------------------------------------------------------------- administração

  async list(q: ListRequestsQueryDto) {
    const where: Prisma.DataUpdateRequestWhereInput = {
      status: q.status,
      user: { department: q.department, province: q.province },
    };
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.dataUpdateRequest.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, nip: true, fullName: true, memberRank: true, unit: true, province: true } } },
      }),
      this.prisma.dataUpdateRequest.count({ where }),
    ]);
    return { items: items.map((r) => ({ ...this.toView(r), user: r.user })), total, page, limit };
  }

  async detail(id: string) {
    const r = await this.prisma.dataUpdateRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nip: true, fullName: true, memberRank: true, department: true, unit: true, province: true } },
        reviewedBy: { select: { fullName: true, memberRank: true } },
      },
    });
    if (!r) throw new NotFoundException('Pedido não encontrado');
    return {
      ...this.toView(r),
      user: r.user,
      reviewedBy: r.reviewedBy,
      document: r.documentPublicId
        ? {
            name: r.documentName,
            url: this.media.resolveUrl({
              publicId: r.documentPublicId,
              resourceType: r.documentResourceType,
              format: r.documentFormat,
              deliveryType: 'authenticated',
            }),
          }
        : null,
    };
  }

  async review(id: string, reviewer: AuthUser, dto: ReviewDto) {
    if (dto.decision === 'REJEITADO' && !dto.note?.trim()) {
      throw new BadRequestException('Indique o motivo da rejeição');
    }
    const r = await this.prisma.dataUpdateRequest.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Pedido não encontrado');
    if (r.status !== 'PENDENTE') throw new ConflictException('Este pedido já foi decidido');
    if (r.userId === reviewer.id) throw new ForbiddenException('Não pode decidir os seus próprios pedidos');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.dataUpdateRequest.update({
        where: { id },
        data: {
          status: dto.decision,
          reviewNote: dto.note?.trim() || null,
          reviewedById: reviewer.id,
          reviewedAt: new Date(),
        },
      });
      if (dto.decision === 'APROVADO') await this.apply(tx, r.userId, r.changes as Changes);
      return u;
    });

    const labels = Object.keys(r.changes as object)
      .map((k) => FIELD_POLICIES[k]?.label ?? k)
      .join(', ');
    await this.notifier.notify({
      senderId: reviewer.id,
      userId: r.userId,
      title: dto.decision === 'APROVADO' ? 'Dados atualizados' : 'Pedido de atualização rejeitado',
      message:
        dto.decision === 'APROVADO'
          ? `O seu pedido foi aprovado. Atualizámos: ${labels}.`
          : `O seu pedido (${labels}) foi rejeitado: ${dto.note}`,
      urgency: dto.decision === 'APROVADO' ? UrgencyLevel.BAIXA : UrgencyLevel.MEDIA,
    });

    return this.toView(updated);
  }

  // ---------------------------------------------------------------- auxiliares

  private async apply(tx: Prisma.TransactionClient, userId: string, changes: Changes) {
    const data = Object.fromEntries(Object.entries(changes).map(([k, v]) => [k, v.to]));
    const user = await tx.user.update({ where: { id: userId }, data, select: { nip: true } });

    const memberData = Object.fromEntries(
      Object.entries(changes)
        .filter(([k]) => FIELD_POLICIES[k]?.syncMember)
        .map(([k, v]) => [k, v.to]),
    );
    if (Object.keys(memberData).length) {
      await tx.member.updateMany({ where: { nip: user.nip }, data: memberData });
    }
  }

  private toView(r: {
    id: string;
    changes: Prisma.JsonValue;
    justification: string | null;
    status: string;
    autoApproved: boolean;
    documentName: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
  }) {
    const changes = r.changes as Changes;
    return {
      id: r.id,
      status: r.status,
      autoApproved: r.autoApproved,
      changes: Object.entries(changes).map(([field, v]) => ({
        field,
        label: FIELD_POLICIES[field]?.label ?? field,
        from: v.from,
        to: v.to,
      })),
      justification: r.justification,
      hasDocument: !!r.documentName,
      reviewNote: r.reviewNote,
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    };
  }
}
