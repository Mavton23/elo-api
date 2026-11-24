/**
 * Políticas do sistema definidas na administração e aplicadas de facto:
 * manutenção, bloqueio por tentativas, auditoria de entradas, estrutura e fichas.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminLevel, Department, MaritalStatus, MemberRank, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { SystemPolicyService } from '../src/common/policy/system-policy.service';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { MediaCloudinaryService } from '../src/modules/social/services/media-cloudinary.service';

const sfx = (Date.now() + 11).toString().slice(-6);

describe('Políticas de administração (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let policy: SystemPolicyService;
  const ids: Record<string, string> = {};
  const tok: Record<string, string> = {};
  const api = (p: string) => `/api/v1${p}`;
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const setSetting = async (name: string, value: unknown, type = 'NUMBER') => {
    await prisma.systemSetting.upsert({
      where: { name },
      update: { value: value as any },
      create: { name, value: value as any, defaultValue: value as any, type: type as any, category: 'SECURITY' as any, description: name, order: 99, editable: true, required: false },
    });
    policy.invalidate();
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MediaCloudinaryService)
      .useValue({ resolveUrl: () => '', uploadFile: jest.fn(), deleteFile: jest.fn() })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    policy = app.get(SystemPolicyService);
    const auth = app.get(AuthService);
    const base = {
      dateOfBirth: new Date('1990-01-01'), placeOfBirth: 'Pemba', maritalStatus: MaritalStatus.SOLTEIRO, currentPosition: 'Agente',
      unitType: UnitType.ESQUADRA, entryDate: new Date('2015-01-01'), passwordHash: await bcrypt.hash('SenhaCerta2026Elo', 4),
      province: 'Cabo Delgado', department: Department.POLICIA_FRONTEIRAS,
    };
    const a = await prisma.user.create({ data: { ...base, nip: `3${sfx}`, biNumber: `1301${sfx}10C`, nuit: `3${sfx}44`, fullName: 'Política Agente', memberRank: MemberRank.GUARDA, unit: 'Posto Fronteiriço de Negomano' } });
    const adm = await prisma.user.create({
      data: { ...base, nip: `2${sfx}`, biNumber: `1301${sfx}20C`, nuit: `2${sfx}44`, fullName: 'Política Admin', memberRank: MemberRank.SUPERINTENDENTE, unit: 'Comando Cabo Delgado', adminProfile: { create: { adminLevel: AdminLevel.SUPER_ADMIN } } },
    });
    Object.assign(ids, { a: a.id, adm: adm.id });
    tok.a = (await auth.generateTokens(a)).accessToken;
    tok.adm = (await auth.generateTokens(adm)).accessToken;
  });

  afterAll(async () => {
    await setSetting('maintenance_mode', false, 'BOOLEAN');
    await setSetting('security_max_login_attempts', 5);
    await prisma.activityLog.deleteMany({ where: { userId: { in: Object.values(ids) } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await app.close();
  });

  it('modo de manutenção bloqueia o efetivo mas não os administradores', async () => {
    await http.put(api('/admin/settings/maintenance')).set(as(tok.adm)).send({ enabled: true, message: 'Atualização em curso' }).expect(200);
    policy.invalidate();
    const blocked = await http.get(api('/posts')).set(as(tok.a)).expect(503);
    expect(blocked.body.code).toBe('MAINTENANCE');
    await http.get(api('/admin/users?limit=1')).set(as(tok.adm)).expect(200);
    await http.get('/health').expect(200);
    await http.put(api('/admin/settings/maintenance')).set(as(tok.adm)).send({ enabled: false }).expect(200);
    policy.invalidate();
    await http.get(api('/posts')).set(as(tok.a)).expect(200);
  });

  it('o bloqueio segue a política configurada e fica na auditoria', async () => {
    await setSetting('security_max_login_attempts', 3);
    for (let i = 0; i < 2; i++) await http.post(api('/auth/login')).send({ identifier: `3${sfx}`, password: 'Errada123' }).expect(401);
    await http.post(api('/auth/login')).send({ identifier: `3${sfx}`, password: 'Errada123' }).expect(403);
    const u = await prisma.user.findUnique({ where: { id: ids.a } });
    expect(u!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    await new Promise((r) => setTimeout(r, 200));
    const actions = (await prisma.activityLog.findMany({ where: { userId: ids.a, module: 'AUTH' } })).map((l) => l.action);
    expect(actions.filter((a) => a === 'LOGIN_FAILED')).toHaveLength(2);
    expect(actions).toContain('ACCOUNT_LOCKED');
    await prisma.user.update({ where: { id: ids.a }, data: { lockedUntil: null, loginAttempts: 0 } });
  });

  it('entradas com sucesso ficam na auditoria', async () => {
    await http.post(api('/auth/login')).send({ identifier: `3${sfx}`, password: 'SenhaCerta2026Elo' }).expect(200);
    await new Promise((r) => setTimeout(r, 200));
    expect(await prisma.activityLog.count({ where: { userId: ids.a, action: 'LOGIN_SUCCESS' } })).toBe(1);
  });

  it('a ficha aceita alterações parciais', async () => {
    await http.put(api(`/admin/users/${ids.a}`)).set(as(tok.adm)).send({ currentPosition: 'Chefe de posto' }).expect(200);
    expect((await prisma.user.findUnique({ where: { id: ids.a } }))!.currentPosition).toBe('Chefe de posto');
  });

  it('o efetivo de um departamento aparece na gestão da estrutura sem vínculo manual', async () => {
    const node = await prisma.hierarchyNode.findFirst({ where: { type: 'DEPARTAMENTO', department: Department.POLICIA_FRONTEIRAS } });
    if (!node) return; // estrutura não inicializada neste ambiente
    const res = await http.get(api(`/admin/hierarchy/${node.id}/members`)).set(as(tok.adm)).expect(200);
    expect(res.body.map((m: any) => m.id)).toEqual(expect.arrayContaining([ids.a, ids.adm]));
  });

  it('as cópias de segurança simuladas já não existem na API', async () => {
    await http.post(api('/admin/settings/backup/create')).set(as(tok.adm)).send({}).expect(404);
  });
});
