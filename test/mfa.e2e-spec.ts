/**
 * Testes e2e do 2FA próprio do ELO: telemóvel de confiança (Ed25519),
 * código TOTP, códigos de recuperação, uso único dos desafios e reposição.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminLevel, Department, MaritalStatus, MemberRank, UnitType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateKeyPairSync, sign as cryptoSign, KeyObject } from 'crypto';
import { authenticator } from 'otplib';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { MfaService, deviceLoginMessage } from '../src/modules/auth/services/mfa.service';
import { CommunicationService } from '../src/modules/communication/services/communication.service';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const PASSWORD = 'SenhaForte2026Elo';
const suffix = Date.now().toString().slice(-6);

function newDeviceKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url');
  return { publicKey: raw.toString('base64'), privateKey };
}
const signNonce = (key: KeyObject, nonce: string) =>
  cryptoSign(null, Buffer.from(deviceLoginMessage(nonce)), key).toString('base64');

describe('2FA próprio (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: ReturnType<typeof request>;
  let userId: string;
  let nip: string;
  let recoveryCodes: string[];
  let accessToken: string;
  const device = newDeviceKey();
  let deviceId: string;

  const api = (p: string) => `/api/v1${p}`;
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = () =>
    http.post(api('/auth/login')).send({ nip, password: PASSWORD }).expect(200).then((r) => r.body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CommunicationService)
      .useValue({ sendOtp: jest.fn(async () => ({ success: false, methodsUsed: [] })) })
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);

    nip = `7${suffix}`;
    const user = await prisma.user.create({
      data: {
        nip,
        biNumber: `1102${suffix}03A`,
        nuit: `6${suffix}33`,
        fullName: 'Inspector de Teste 2FA',
        dateOfBirth: new Date('1985-01-01'),
        placeOfBirth: 'Maputo',
        maritalStatus: MaritalStatus.CASADO,
        memberRank: MemberRank.INSPECTOR, // 2FA obrigatório
        currentPosition: 'Chefe de Secção',
        department: Department.POLICIA_PROTECAO,
        unit: 'Comando da Cidade',
        unitType: UnitType.COMANDO_PROVINCIAL,
        province: 'Maputo Cidade',
        entryDate: new Date('2008-01-01'),
        passwordHash: await bcrypt.hash(PASSWORD, 4),
      },
    });
    userId = user.id;
    recoveryCodes = await app.get(MfaService).generateRecoveryCodes(userId);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await app.close();
  });

  it('com SMS/email em baixo, o login continua possível com um código de recuperação', async () => {
    const l = await login();
    expect(l.requiresTwoFactor).toBe(true);
    expect(l.methods).toContain('recovery');
    expect(l.hint).toMatch(/recuperação/);

    const r = await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l.challengeToken, method: 'recovery', code: recoveryCodes[0].toLowerCase() })
      .expect(200);
    expect(r.body.accessToken).toBeTruthy();
    expect(r.body.recoveryCodesRemaining).toBe(9);
    accessToken = r.body.accessToken;
  });

  it('um código de recuperação só funciona uma vez', async () => {
    const l = await login();
    await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l.challengeToken, method: 'recovery', code: recoveryCodes[0] })
      .expect(401);
  });

  it('registar o telemóvel de confiança exige a senha', async () => {
    await http
      .post(api('/auth/2fa/devices'))
      .set(as(accessToken))
      .send({ password: 'errada', publicKey: device.publicKey, name: 'Samsung A15', platform: 'android' })
      .expect(401);
    const r = await http
      .post(api('/auth/2fa/devices'))
      .set(as(accessToken))
      .send({ password: PASSWORD, publicKey: device.publicKey, name: 'Samsung A15', platform: 'android' })
      .expect(201);
    deviceId = r.body.deviceId;
    const st = await http.get(api('/auth/2fa/status')).set(as(accessToken)).expect(200);
    expect(st.body.devices).toHaveLength(1);
  });

  it('o telemóvel de confiança assina o desafio e entra sem códigos', async () => {
    const l = await login();
    expect(l.methods[0]).toBe('device');
    expect(l.deviceNonce).toBeTruthy();
    const body = {
      challengeToken: l.challengeToken,
      method: 'device',
      deviceId,
      signature: signNonce(device.privateKey, l.deviceNonce),
    };
    await http.post(api('/auth/verify-2fa-login')).send(body).expect(200);
    // O mesmo desafio + assinatura não pode ser reutilizado
    await http.post(api('/auth/verify-2fa-login')).send(body).expect(401);
  });

  it('rejeita a assinatura de outro telemóvel', async () => {
    const intruder = newDeviceKey();
    const l = await login();
    await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l.challengeToken, method: 'device', deviceId, signature: signNonce(intruder.privateKey, l.deviceNonce) })
      .expect(401);
  });

  it('um novo login invalida o desafio anterior', async () => {
    const first = await login();
    await login();
    await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: first.challengeToken, method: 'device', deviceId, signature: signNonce(device.privateKey, first.deviceNonce) })
      .expect(401);
  });

  it('TOTP: configurar, confirmar e entrar com o código gerado no telemóvel', async () => {
    const l = await login();
    const s = await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l.challengeToken, method: 'device', deviceId, signature: signNonce(device.privateKey, l.deviceNonce) })
      .expect(200);
    const token = s.body.accessToken;

    const setup = await http.post(api('/auth/2fa/totp/setup')).set(as(token)).send({ password: PASSWORD }).expect(201);
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    await http.post(api('/auth/2fa/totp/confirm')).set(as(token)).send({ code: '000000' }).expect(400);
    await http
      .post(api('/auth/2fa/totp/confirm'))
      .set(as(token))
      .send({ code: authenticator.generate(setup.body.secret) })
      .expect(200);

    const l2 = await login();
    expect(l2.methods).toEqual(expect.arrayContaining(['device', 'totp', 'recovery']));
    await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l2.challengeToken, method: 'totp', code: authenticator.generate(setup.body.secret) })
      .expect(200);
    accessToken = token;
  });

  it('remover o telemóvel tira o método "device" do login', async () => {
    const l0 = await login();
    const s = await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l0.challengeToken, method: 'recovery', code: recoveryCodes[1] })
      .expect(200);
    await http.delete(api(`/auth/2fa/devices/${deviceId}`)).set(as(s.body.accessToken)).expect(200);
    const l = await login();
    expect(l.methods).not.toContain('device');
    expect(l.deviceNonce).toBeUndefined();
  });

  it('o administrador repõe o 2FA e entrega novos códigos; não pode repor o próprio', async () => {
    const admin = await prisma.user.create({
      data: {
        nip: `6${suffix}`,
        biNumber: `1102${suffix}04A`,
        nuit: `3${suffix}44`,
        fullName: 'Administrador de Teste 2FA',
        dateOfBirth: new Date('1980-01-01'),
        placeOfBirth: 'Maputo',
        maritalStatus: MaritalStatus.CASADO,
        memberRank: MemberRank.SUPERINTENDENTE,
        currentPosition: 'Administrador',
        department: Department.POLICIA_PROTECAO,
        unit: 'Direcção Nacional',
        unitType: UnitType.DIRECCAO_NACIONAL,
        province: 'Maputo Cidade',
        entryDate: new Date('2000-01-01'),
        passwordHash: 'x',
        adminProfile: { create: { adminLevel: AdminLevel.SUPER_ADMIN } },
      },
    });
    const adminToken = (await app.get(AuthService).generateTokens(admin)).accessToken;

    await http.post(api(`/admin/users/${admin.id}/reset-2fa`)).set(as(adminToken)).expect(403);

    const r = await http.post(api(`/admin/users/${userId}/reset-2fa`)).set(as(adminToken)).expect(201);
    expect(r.body.codes).toHaveLength(10);

    // As sessões antigas do efetivo foram terminadas
    await http.get(api('/auth/me')).set(as(accessToken)).expect(401);

    const l = await login();
    expect(l.methods).not.toContain('totp');
    await http
      .post(api('/auth/verify-2fa-login'))
      .send({ challengeToken: l.challengeToken, method: 'recovery', code: r.body.codes[0] })
      .expect(200);

    await prisma.user.delete({ where: { id: admin.id } });
  });
});
