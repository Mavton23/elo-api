/**
 * Diretório de efetivos (privacidade), comunicados (relatório do emissor),
 * definições pessoais, senha temporária e rotas administrativas.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminLevel, Department, MaritalStatus, MemberRank, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MediaCloudinaryService } from '../src/modules/social/services/media-cloudinary.service';

const sfx = (Date.now() + 7).toString().slice(-6);

describe('Diretório, comunicados e conta (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let auth: AuthService;
  const ids: Record<string, string> = {};
  const tok: Record<string, string> = {};
  const api = (p: string) => `/api/v1${p}`;
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MediaCloudinaryService)
      .useValue({ resolveUrl: () => '', uploadFile: jest.fn(), deleteFile: jest.fn() })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    auth = app.get(AuthService);

    const base = {
      dateOfBirth: new Date('1991-03-02'), placeOfBirth: 'Tete', maritalStatus: MaritalStatus.CASADO,
      currentPosition: 'Agente', unitType: UnitType.ESQUADRA, entryDate: new Date('2016-02-01'),
      passwordHash: await bcrypt.hash('SenhaAntiga2026Elo', 4),
    };
    const mk = (k: string, n: string, extra: any) =>
      prisma.user.create({
        data: { ...base, nip: `${n}${sfx}`, biNumber: `1201${sfx}${n}0B`, nuit: `${n}${sfx}33`, fullName: `Teste ${k}`, province: 'Tete', ...extra },
      });
    const a = await mk('Agente A', '7', { memberRank: MemberRank.GUARDA, department: Department.POLICIA_PROTECAO, unit: 'Esquadra Tete' });
    const b = await mk('Agente B', '6', { memberRank: MemberRank.SARGENTO, department: Department.POLICIA_TRANSITO, unit: 'Trânsito Tete' });
    const o = await mk('Oficial', '5', { memberRank: MemberRank.INSPECTOR, department: Department.POLICIA_PROTECAO, unit: 'Esquadra Tete' });
    const adm = await mk('Admin', '4', {
      memberRank: MemberRank.SUPERINTENDENTE, department: Department.POLICIA_PROTECAO, unit: 'Comando Tete',
      adminProfile: { create: { adminLevel: AdminLevel.SUPER_ADMIN } },
    });
    Object.assign(ids, { a: a.id, b: b.id, o: o.id, adm: adm.id });
    for (const [k, u] of Object.entries({ a, b, o, adm })) tok[k] = (await auth.generateTokens(u)).accessToken;
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { senderId: { in: Object.values(ids) } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await app.close();
  });

  it('colegas veem o cartão profissional, nunca BI/NUIT/NIP', async () => {
    const res = await http.get(api(`/members/${ids.a}/profile?includeNotifications=true`)).set(as(tok.b)).expect(200);
    expect(res.body.access).toBe('PUBLIC');
    for (const k of ['biNumber', 'nuit', 'nip', 'dateOfBirth', 'maritalStatus', 'unreadNotifications']) expect(res.body).not.toHaveProperty(k);
    const self = await http.get(api(`/members/${ids.a}/profile`)).set(as(tok.a)).expect(200);
    expect(self.body.access).toBe('FULL');
    expect(self.body.biNumber).toBeDefined();
  });

  it('respeita "quem pode ver o meu perfil" e "mostrar contactos"', async () => {
    await http.get(api('/user/settings')).set(as(tok.a)).expect(200); // sincroniza o catálogo
    await http.put(api('/user/settings/privacy.profile_visibility')).set(as(tok.a)).send({ value: 'DEPARTAMENTO' }).expect(200);
    const outsider = await http.get(api(`/members/${ids.a}/profile`)).set(as(tok.b)).expect(200);
    expect(outsider.body.access).toBe('RESTRICTED');
    expect(outsider.body.unit).toBeUndefined();
    const colleague = await http.get(api(`/members/${ids.a}/profile`)).set(as(tok.o)).expect(200);
    expect(colleague.body.access).toBe('PUBLIC');
    const search = await http.get(api('/members/search?q=Teste Agente')).set(as(tok.b)).expect(200);
    expect(search.body.items.map((i: any) => i.id)).not.toContain(ids.a);
  });

  it('as definições só incluem opções que a plataforma respeita', async () => {
    const res = await http.get(api('/user/settings')).set(as(tok.b)).expect(200);
    const keys = res.body.settings.map((s: any) => s.key).sort();
    expect(keys).toEqual(['notifications.vibration.enabled', 'privacy.profile_visibility', 'privacy.show_contacts', 'security.login_alerts']);
    await http.put(api('/user/settings/privacy.profile_visibility')).set(as(tok.b)).send({ value: 'QUALQUER' }).expect(400);
  });

  it('o emissor acompanha quem leu e confirmou; agentes não emitem', async () => {
    expect((await http.get(api('/notifications/capabilities')).set(as(tok.a))).body.canSend).toBe(false);
    await http.post(api('/notifications')).set(as(tok.a)).send({ title: 'x', message: 'y', category: 'OPERACIONAL', urgency: 'ALTA' }).expect(403);

    const created = await http
      .post(api('/notifications'))
      .set(as(tok.o))
      .send({ title: 'Escala de sábado', message: 'Confirmem a presença.', category: 'OPERACIONAL', urgency: 'ALTA', specificUsers: [ids.a, ids.b], requiresConfirmation: true, availableActions: ['CONFIRMAR', 'NEGAR'] })
      .expect(201);
    const nid = created.body.id;
    await http.patch(api(`/notifications/${nid}/mark`)).set(as(tok.a)).send({ status: 'RESPONDIDA', response: 'CONFIRMADO' }).expect(200);

    const report = await http.get(api(`/notifications/${nid}/report`)).set(as(tok.o)).expect(200);
    expect(report.body.stats).toMatchObject({ total: 2, confirmed: 1, unread: 1 });
    expect(report.body.recipients[0].user.id).toBe(ids.b); // pendentes primeiro
    await http.get(api(`/notifications/${nid}/report`)).set(as(tok.b)).expect(403);

    const sent = await http.get(api('/notifications/sent')).set(as(tok.o)).expect(200);
    expect(sent.body.items[0]).toMatchObject({ id: nid, stats: { confirmed: 1 } });
  });

  it('senha temporária obriga a trocar antes de usar a app', async () => {
    await http.patch(api(`/admin/users/${ids.b}/reset-password`)).set(as(tok.adm)).send({ newPassword: 'Temporaria2026Elo' }).expect(200);
    const login = await http.post(api('/auth/login')).send({ identifier: `6${sfx}`, password: 'Temporaria2026Elo' }).expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);
    const t = login.body.accessToken;
    const blocked = await http.get(api('/posts')).set(as(t)).expect(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
    const changed = await http
      .put(api('/auth/password'))
      .set(as(t))
      .send({ currentPassword: 'Temporaria2026Elo', newPassword: 'NovaSenhaForte2026', confirmNewPassword: 'NovaSenhaForte2026' })
      .expect(200);
    expect(changed.body.accessToken).toBeDefined();
    await http.get(api('/posts')).set(as(changed.body.accessToken)).expect(200);
    await http.get(api('/posts')).set(as(t)).expect(401); // sessão antiga terminada
  });

  it('remover um utilizador não é confundido com retirar privilégios de admin', async () => {
    await http.delete(api(`/admin/users/${ids.o}/admin`)).set(as(tok.adm)).expect((r) => expect([200, 404]).toContain(r.status));
    expect(await prisma.user.findUnique({ where: { id: ids.o } })).not.toBeNull();
  });

  it('cada entrada deixa um aviso de segurança ao próprio', async () => {
    const before = await prisma.notificationRecipient.count({ where: { userId: ids.b, notification: { category: 'SEGURANCA' } } });
    await http.post(api('/auth/login')).send({ identifier: `6${sfx}`, password: 'NovaSenhaForte2026' }).expect(200);
    await new Promise((r) => setTimeout(r, 200));
    const after = await prisma.notificationRecipient.count({ where: { userId: ids.b, notification: { category: 'SEGURANCA' } } });
    expect(after).toBe(before + 1);
  });
});
