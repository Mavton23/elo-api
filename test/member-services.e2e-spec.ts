/**
 * Testes e2e dos serviços ao efetivo (prova de vida e atualização de dados).
 * Correm contra uma base de dados PostgreSQL real (DATABASE_URL) com as
 * migrações aplicadas. Apenas o Cloudinary é substituído por um duplo.
 *
 *   DATABASE_URL=... JWT_SECRET=... REFRESH_TOKEN_SECRET=... pnpm test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminLevel, Department, MaritalStatus, MemberRank, UnitType } from '@prisma/client';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MediaCloudinaryService } from '../src/modules/social/services/media-cloudinary.service';

const fakeMedia = {
  uploadFile: jest.fn(async (file: Express.Multer.File, userId: string, folder: string) => ({
    url: '',
    publicId: `elo/${folder}/${userId}/${Date.now()}`,
    assetId: 'x',
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    format: 'jpg',
    secureUrl: '',
    type: 'image',
    resourceType: 'image',
    deliveryType: 'authenticated',
  })),
  uploadMultipleFiles: jest.fn(),
  deleteFile: jest.fn(),
  resolveUrl: (ref: { publicId?: string }) => `signed://${ref.publicId}`,
};

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const suffix = Date.now().toString().slice(-6);

describe('Serviços ao efetivo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let memberToken: string;
  let adminToken: string;
  let memberId: string;

  const api = (path: string) => `/api/v1${path}`;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MediaCloudinaryService)
      .useValue(fakeMedia)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    const auth = app.get(AuthService);

    const base = {
      dateOfBirth: new Date('1990-05-01'),
      placeOfBirth: 'Beira',
      maritalStatus: MaritalStatus.SOLTEIRO,
      currentPosition: 'Agente',
      unitType: UnitType.ESQUADRA,
      entryDate: new Date('2015-01-01'),
      passwordHash: 'x',
    };
    const member = await prisma.user.create({
      data: {
        ...base,
        nip: `9${suffix}`,
        biNumber: `1101${suffix}01A`,
        nuit: `4${suffix}11`,
        fullName: 'Agente de Teste',
        memberRank: MemberRank.GUARDA,
        department: Department.POLICIA_PROTECAO,
        unit: '1.ª Esquadra',
        province: 'Sofala',
      },
    });
    await prisma.member.create({
      data: {
        nip: member.nip, biNumber: member.biNumber, nuit: member.nuit, fullName: member.fullName,
        dateOfBirth: base.dateOfBirth, placeOfBirth: base.placeOfBirth, maritalStatus: base.maritalStatus,
        memberRank: member.memberRank, currentPosition: base.currentPosition, department: member.department,
        unit: member.unit, unitType: base.unitType, province: member.province, entryDate: base.entryDate,
        isVerified: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        ...base,
        nip: `8${suffix}`,
        biNumber: `1101${suffix}02A`,
        nuit: `5${suffix}22`,
        fullName: 'Revisor RH de Teste',
        memberRank: MemberRank.SUPERINTENDENTE,
        department: Department.POLICIA_PROTECAO,
        unit: 'Comando Provincial',
        province: 'Sofala',
        adminProfile: { create: { adminLevel: AdminLevel.SUPER_ADMIN } },
      },
    });
    memberId = member.id;
    memberToken = (await auth.generateTokens(member)).accessToken;
    adminToken = (await auth.generateTokens(admin)).accessToken;

    // Garantir que nenhuma campanha de testes anteriores interfere
    await prisma.lifeProofCampaign.updateMany({ data: { isActive: false } });
  });

  afterAll(async () => {
    await prisma.lifeProofCampaign.updateMany({ data: { isActive: false } });
    await app.close();
  });

  describe('Prova de vida', () => {
    let code: string;
    let proofId: string;

    it('sem campanha ativa, não deixa submeter', async () => {
      const r = await http.get(api('/life-proof/status')).set(as(memberToken)).expect(200);
      expect(r.body.canSubmit).toBe(false);
      await http.post(api('/life-proof/challenge')).set(as(memberToken)).expect(400);
    });

    it('um efetivo comum não pode criar campanhas', async () => {
      await http
        .post(api('/admin/life-proof/campaigns'))
        .set(as(memberToken))
        .send({ title: 'X', startsAt: new Date().toISOString(), endsAt: new Date().toISOString() })
        .expect(403);
    });

    it('o administrador abre uma campanha para Sofala', async () => {
      const now = Date.now();
      await http
        .post(api('/admin/life-proof/campaigns'))
        .set(as(adminToken))
        .send({
          title: 'Prova de vida — teste',
          startsAt: new Date(now - 60_000).toISOString(),
          endsAt: new Date(now + 7 * 86_400_000).toISOString(),
          targetProvinces: ['Sofala'],
        })
        .expect(201);
      const r = await http.get(api('/life-proof/status')).set(as(memberToken)).expect(200);
      expect(r.body.canSubmit).toBe(true);
    });

    it('o efetivo pede o código e submete a selfie', async () => {
      const c = await http.post(api('/life-proof/challenge')).set(as(memberToken)).expect(201);
      expect(c.body.code).toMatch(/^\d{4}$/);
      code = c.body.code;

      await http
        .post(api('/life-proof'))
        .set(as(memberToken))
        .field('challengeToken', c.body.challengeToken)
        .expect(400); // sem fotografia

      const r = await http
        .post(api('/life-proof'))
        .set(as(memberToken))
        .field('challengeToken', c.body.challengeToken)
        .field('latitude', '-19.8436')
        .field('longitude', '34.8389')
        .field('platform', 'android')
        .attach('selfie', JPEG, { filename: 'selfie.jpg', contentType: 'image/jpeg' })
        .expect(201);
      expect(r.body.status).toBe('PENDENTE');
      proofId = r.body.id;
    });

    it('não aceita uma segunda submissão enquanto a primeira está pendente', async () => {
      await http.post(api('/life-proof/challenge')).set(as(memberToken)).expect(400);
    });

    it('rejeita tokens de desafio forjados', async () => {
      await http
        .post(api('/life-proof'))
        .set(as(memberToken))
        .field('challengeToken', memberToken) // um access token não é um desafio
        .attach('selfie', JPEG, { filename: 's.jpg', contentType: 'image/jpeg' })
        .expect(401);
    });

    it('o efetivo comum não vê a fila de validação', async () => {
      await http.get(api('/admin/life-proof')).set(as(memberToken)).expect(403);
    });

    it('o revisor vê a selfie assinada e o código esperado', async () => {
      const r = await http.get(api(`/admin/life-proof/${proofId}`)).set(as(adminToken)).expect(200);
      expect(r.body.expectedCode).toBe(code);
      expect(r.body.selfieUrl).toMatch(/^signed:\/\//);
      expect(r.body.location.latitude).toBeCloseTo(-19.8436);
    });

    it('rejeitar exige motivo; aprovar notifica o efetivo', async () => {
      await http
        .patch(api(`/admin/life-proof/${proofId}/review`))
        .set(as(adminToken))
        .send({ decision: 'REJEITADO' })
        .expect(400);
      const r = await http
        .patch(api(`/admin/life-proof/${proofId}/review`))
        .set(as(adminToken))
        .send({ decision: 'APROVADO' })
        .expect(200);
      expect(r.body.status).toBe('APROVADO');

      const n = await prisma.notificationRecipient.findFirst({
        where: { userId: memberId, notification: { title: 'Prova de vida validada' } },
      });
      expect(n).toBeTruthy();

      const s = await http.get(api('/life-proof/status')).set(as(memberToken)).expect(200);
      expect(s.body.current.status).toBe('APROVADO');
      expect(s.body.canSubmit).toBe(false);
    });

    it('mostra a taxa de cumprimento da campanha', async () => {
      const camps = await http.get(api('/admin/life-proof/campaigns')).set(as(adminToken)).expect(200);
      const id = camps.body.find((c: any) => c.isActive).id;
      const r = await http
        .get(api(`/admin/life-proof/campaigns/${id}/compliance`))
        .set(as(adminToken))
        .expect(200);
      expect(r.body.approved).toBeGreaterThanOrEqual(1);
      expect(r.body.targetUsers).toBeGreaterThanOrEqual(r.body.approved);
    });
  });

  describe('Atualização de dados', () => {
    let pendingId: string;

    it('contactos são aplicados de imediato', async () => {
      const r = await http
        .post(api('/data-updates'))
        .set(as(memberToken))
        .send({ changes: { personalPhone: '84 123 4567', residentialAddress: 'Bairro da Munhava, Beira' } })
        .expect(201);
      expect(r.body.status).toBe('APROVADO');
      expect(r.body.autoApproved).toBe(true);
      const u = await prisma.user.findUnique({ where: { id: memberId } });
      expect(u?.personalPhone).toBe('+258841234567');
    });

    it('recusa campos de identidade e carreira', async () => {
      const r = await http
        .post(api('/data-updates'))
        .set(as(memberToken))
        .send({ changes: { memberRank: 'COMISSARIO' } })
        .expect(400);
      expect(JSON.stringify(r.body.message)).toContain('ato administrativo');
    });

    it('estado civil exige comprovativo', async () => {
      await http
        .post(api('/data-updates'))
        .set(as(memberToken))
        .send({ changes: { maritalStatus: 'CASADO' } })
        .expect(400);

      const r = await http
        .post(api('/data-updates'))
        .set(as(memberToken))
        .field('changes', JSON.stringify({ maritalStatus: 'CASADO' }))
        .field('justification', 'Casamento registado em outubro')
        .attach('document', JPEG, { filename: 'certidao.jpg', contentType: 'image/jpeg' })
        .expect(201);
      expect(r.body.status).toBe('PENDENTE');
      expect(r.body.changes[0]).toMatchObject({ field: 'maritalStatus', from: 'SOLTEIRO', to: 'CASADO' });
      pendingId = r.body.id;
    });

    it('não aceita dois pedidos pendentes para o mesmo campo', async () => {
      await http
        .post(api('/data-updates'))
        .set(as(memberToken))
        .field('changes', JSON.stringify({ maritalStatus: 'DIVORCIADO' }))
        .attach('document', JPEG, { filename: 'c.jpg', contentType: 'image/jpeg' })
        .expect(409);
    });

    it('a aprovação atualiza o perfil e a base pré-registada', async () => {
      await http
        .patch(api(`/admin/data-updates/${pendingId}/review`))
        .set(as(memberToken))
        .send({ decision: 'APROVADO' })
        .expect(403);

      await http
        .patch(api(`/admin/data-updates/${pendingId}/review`))
        .set(as(adminToken))
        .send({ decision: 'APROVADO' })
        .expect(200);

      const u = await prisma.user.findUnique({ where: { id: memberId } });
      expect(u?.maritalStatus).toBe('CASADO');
      const m = await prisma.member.findUnique({ where: { nip: u!.nip } });
      expect(m?.maritalStatus).toBe('CASADO');
    });

    it('o efetivo vê o histórico dos seus pedidos', async () => {
      const r = await http.get(api('/data-updates')).set(as(memberToken)).expect(200);
      expect(r.body.length).toBeGreaterThanOrEqual(2);
      expect(r.body.every((x: any) => ['APROVADO', 'PENDENTE'].includes(x.status))).toBe(true);
    });
  });
});
