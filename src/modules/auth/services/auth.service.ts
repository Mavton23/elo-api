import { SystemPolicyService } from '@/common/policy/system-policy.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Department, MemberRank, Prisma, SecurityLevel, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'crypto';

import { PrismaService } from '@/modules/prisma/prisma.service';
import {
  CommunicationService,
  ContactMethod,
} from '@/modules/communication/services/communication.service';
import { UserSettingsInitializerService } from '@/modules/settings/services/user-settings-initializer.service';
import { isRankAtLeast } from '@/common/constants/ranks';
import {
  AuthUserDto,
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  TokensDto,
  VerifyTwoFactorLoginDto,
} from '../dto';
import { MfaService } from './mfa.service';
import { JwtPayload } from '../types/user.types';
import { TwoFactorService } from './two-factor.service';

const USER_WITH_ADMIN = {
  adminProfile: { include: { permissions: true } },
} satisfies Prisma.UserInclude;

type UserWithAdmin = Prisma.UserGetPayload<{ include: typeof USER_WITH_ADMIN }>;

/** Hash fixo usado para equalizar o tempo de resposta quando o utilizador não existe. */
const DUMMY_HASH = '$2b$12$tbbGMOWDujFUM/3vCsmBKOckmpzfxa93lpJ7zKs9wdCZNd.COp67K';

/** Departamentos onde o 2FA é sempre obrigatório. */
const SENSITIVE_DEPARTMENTS: Department[] = [
  Department.UNIDADE_INTERVENCAO_RAPIDA,
  Department.UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES,
  Department.GRUPO_OPERACOES_ESPECIAIS,
];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly twoFactorService: TwoFactorService,
    private readonly mfa: MfaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly communicationService: CommunicationService,
    @Inject(forwardRef(() => UserSettingsInitializerService))
    private readonly userSettingsInitializerService: UserSettingsInitializerService,
    private readonly policy: SystemPolicyService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registo
  // ---------------------------------------------------------------------------

  /**
   * Verifica se o membro consta da base pré-registada pelo Ministério.
   * Exige os três identificadores em simultâneo (NIP + BI + NUIT).
   */
  async checkMemberEligibility(nip: string, biNumber: string, nuit: string) {
    const member = await this.prisma.member.findFirst({
      where: { nip, biNumber, nuit },
      select: { fullName: true, memberRank: true, department: true, isVerified: true },
    });

    // Mensagem única para "não existe" e "já registado": evita enumeração.
    const notEligible = {
      eligible: false,
      message: 'Não foi possível confirmar a elegibilidade. Verifique os dados ou contacte a sua unidade.',
    };
    if (!member || member.isVerified) return notEligible;

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ nip }, { biNumber }, { nuit }] },
      select: { id: true },
    });
    if (existingUser) return notEligible;

    return {
      eligible: true,
      message: 'Membro elegível para registo',
      member: {
        fullName: member.fullName,
        memberRank: member.memberRank,
        department: member.department,
      },
    };
  }

  async register(dto: RegisterDto): Promise<TokensDto> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('As senhas não coincidem');
    }

    const member = await this.prisma.member.findFirst({
      where: { nip: dto.nip, biNumber: dto.biNumber, nuit: dto.nuit },
    });
    if (!member) {
      throw new NotFoundException('Membro não encontrado na base de dados do Ministério');
    }
    if (member.isVerified) {
      throw new ConflictException('Este membro já confirmou o seu registo');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    // Transação: o utilizador e a verificação do membro são atómicos.
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          nip: member.nip,
          biNumber: member.biNumber,
          nuit: member.nuit,
          fullName: member.fullName,
          trainingCourse: member.trainingCourse,
          trainingSchool: member.trainingSchool,
          graduationYear: member.graduationYear,
          dateOfBirth: member.dateOfBirth,
          placeOfBirth: member.placeOfBirth,
          nationality: member.nationality,
          maritalStatus: member.maritalStatus,
          memberRank: member.memberRank,
          currentPosition: member.currentPosition,
          department: member.department,
          unit: member.unit,
          unitType: member.unitType,
          province: member.province,
          entryDate: member.entryDate,
          institutionalEmail: member.institutionalEmail,
          officialPhone: member.officialPhone,
          passwordHash,
          passwordChangedAt: new Date(),
          securityLevel: this.initialSecurityLevel(member.memberRank),
          isActive: true,
          lastAccess: new Date(),
        },
        include: USER_WITH_ADMIN,
      });
      await tx.member.update({
        where: { id: member.id },
        data: { isVerified: true, verifiedAt: new Date() },
      });
      return created;
    });

    try {
      await this.userSettingsInitializerService.initializeUserSettings(user.id);
    } catch (error) {
      this.logger.error(`Falha ao inicializar definições do utilizador ${user.id}`, error as Error);
    }

    return this.issueSession(user);
  }

  // ---------------------------------------------------------------------------
  // Login + 2FA
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.findUserByIdentifier(dto);

    // Compara sempre um hash (mesmo inexistente) para não revelar, pelo tempo
    // de resposta, se o identificador existe.
    const passwordOk = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);

    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    this.assertAccountUsable(user);

    if (!passwordOk) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const factors = await this.mfa.hasOwnFactors(user.id);
    if (this.requiresTwoFactor(user) || factors.device || factors.totp) {
      return this.startTwoFactorChallenge(user, factors);
    }

    await this.resetLoginAttempts(user.id);
    const session = await this.issueSession(user);
    void this.loginAlert(user.id, 'senha');
    return {
      message: 'Sessão iniciada com sucesso',
      requiresTwoFactor: false,
      ...session,
    };
  }

  /**
   * Segunda etapa do login. O id do utilizador NUNCA é aceite do cliente: vem
   * do token de desafio assinado, que é de uso único (mfaChallengeId).
   *
   * Métodos: device (assinatura do telemóvel de confiança), totp, recovery
   * (código de recuperação) ou otp (código enviado por SMS/email).
   */
  async verifyTwoFactorLogin(dto: VerifyTwoFactorLoginDto): Promise<TokensDto & { recoveryCodesRemaining?: number }> {
    const { payload, user } = await this.loadChallenge(dto.challengeToken);
    const method = dto.method ?? (dto.signature ? 'device' : 'code');

    let valid = false;
    switch (method) {
      case 'device':
        valid = await this.mfa.verifyDeviceSignature(user.id, dto.deviceId, payload.nonce, dto.signature);
        break;
      case 'recovery':
        valid = await this.mfa.consumeRecoveryCode(user.id, dto.code);
        break;
      default: // totp | otp | code
        valid = !!dto.code && (await this.twoFactorService.validateTwoFactorCode(user.id, dto.code));
    }

    if (!valid) {
      await this.registerFailedAttempt(user);
      throw new UnauthorizedException(
        method === 'device'
          ? 'Não foi possível confirmar este telemóvel. Use outro método.'
          : method === 'recovery'
            ? 'Código de recuperação inválido ou já usado'
            : 'Código inválido ou expirado',
      );
    }

    // Desafio consumido: não pode voltar a ser usado
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaChallengeId: null } });
    await this.resetLoginAttempts(user.id);
    const session = await this.issueSession(user);
    void this.loginAlert(user.id, method);

    if (method === 'recovery') {
      const left = await this.prisma.recoveryCode.count({ where: { userId: user.id, usedAt: null } });
      return { ...session, recoveryCodesRemaining: left };
    }
    return session;
  }

  /**
   * Envia (a pedido) um código por SMS/email. É o último recurso: só é usado
   * quando o efetivo não tem o telemóvel de confiança nem o autenticador.
   */
  async sendLoginOtp(challengeToken: string) {
    const { user } = await this.loadChallenge(challengeToken);
    const result = await this.dispatchOtp(user);
    if (!result.success) {
      throw new BadRequestException(
        'Não foi possível enviar o código por SMS ou email. Use o telemóvel de confiança, a app autenticadora ou um código de recuperação.',
      );
    }
    return {
      sent: true,
      methodsUsed: result.methodsUsed,
      hint: result.methodsUsed.includes(ContactMethod.SMS)
        ? 'Enviámos um código por SMS'
        : 'Enviámos um código para o seu email institucional',
    };
  }

  private async loadChallenge(challengeToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(challengeToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('O pedido de verificação expirou. Inicie sessão novamente.');
    }
    if (payload.typ !== 'mfa' || !payload.sub || !payload.cid) {
      throw new UnauthorizedException('Token de verificação inválido');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: USER_WITH_ADMIN,
    });
    if (!user || user.tokenVersion !== payload.tv || user.mfaChallengeId !== payload.cid) {
      throw new UnauthorizedException('Este pedido de verificação já não é válido. Inicie sessão novamente.');
    }
    this.assertAccountUsable(user);
    return { payload, user };
  }

  private async startTwoFactorChallenge(
    user: UserWithAdmin,
    factors: { device: boolean; totp: boolean; recovery: boolean },
  ): Promise<LoginResponseDto> {
    const cid = randomUUID();
    const nonce = factors.device ? randomBytes(32).toString('base64url') : undefined;
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaChallengeId: cid } });

    const challengeToken = await this.jwtService.signAsync(
      { sub: user.id, tv: user.tokenVersion, typ: 'mfa', cid, nonce } satisfies JwtPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('jwt.mfaChallengeExpiration', '5m') as any,
      },
    );

    const fallback = !!(user.officialPhone || user.institutionalEmail);
    const methods = [
      ...(factors.device ? ['device'] : []),
      ...(factors.totp ? ['totp'] : []),
      ...(factors.recovery ? ['recovery'] : []),
      ...(fallback ? ['otp'] : []),
    ];

    const base = {
      requiresTwoFactor: true,
      challengeToken,
      methods,
      deviceNonce: nonce,
      methodsUsed: [] as ContactMethod[],
    };

    if (factors.device || factors.totp) {
      return {
        ...base,
        message: factors.device
          ? 'Confirme no seu telemóvel de confiança'
          : 'Introduza o código da sua app autenticadora',
        hint: factors.device ? 'Telemóvel de confiança' : 'Código de verificação',
      };
    }

    // Sem fatores próprios: compatibilidade com o fluxo antigo (envio automático).
    const result = await this.dispatchOtp(user);
    if (!result.success) {
      this.logger.error(`Falha no envio de OTP para utilizador ${user.id}`);
      if (this.config.get<boolean>('app.isProduction') && !factors.recovery) {
        throw new BadRequestException(
          'Não foi possível enviar o código de verificação. Peça ao administrador a reposição do acesso.',
        );
      }
    }
    return {
      ...base,
      methodsUsed: result.methodsUsed,
      message: 'Autenticação de dois fatores necessária',
      hint: !result.success
        ? 'O envio falhou. Use um código de recuperação.'
        : result.methodsUsed.includes(ContactMethod.SMS)
          ? 'Enviámos um código por SMS'
          : 'Enviámos um código para o seu email institucional',
    };
  }

  private async dispatchOtp(user: User) {
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttl = this.config.get<number>('security.otpTtlSeconds', 300);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: await bcrypt.hash(otp, 10),
        otpExpiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    if (this.config.get<boolean>('security.debugOtp')) {
      this.logger.warn(`[DEV] OTP de ${user.nip}: ${otp}`);
    }
    return this.communicationService.sendOtp(
      otp,
      user.officialPhone ?? undefined,
      user.institutionalEmail ?? undefined,
      undefined,
      user.fullName,
    );
  }

  // ---------------------------------------------------------------------------
  // Sessão
  // ---------------------------------------------------------------------------

  /** Termina a sessão em todos os dispositivos (revoga refresh e access tokens). */
  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, tokenVersion: { increment: 1 } },
    });
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<TokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_WITH_ADMIN,
    });
    if (!user?.refreshToken || !refreshToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (!this.refreshTokenMatches(refreshToken, user.refreshToken)) {
      // Reutilização de um refresh token antigo = possível roubo. Revoga tudo.
      this.logger.warn(`Reutilização de refresh token detetada para utilizador ${user.id}`);
      await this.logout(user.id);
      throw new UnauthorizedException('Sessão inválida. Inicie sessão novamente.');
    }

    return this.issueSession(user);
  }

  /** Troca a senha, termina todas as outras sessões e devolve uma sessão nova para este aparelho. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<TokensDto> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('As novas senhas não coincidem');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilizador não encontrado');

    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta');

    if (await bcrypt.compare(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('A nova senha tem de ser diferente da atual');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, this.saltRounds),
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        refreshToken: null,
        tokenVersion: { increment: 1 },
      },
    });
    const fresh = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { adminProfile: { include: { permissions: true } } } });
    return this.issueSession(fresh as any);
  }

  async findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  // ---------------------------------------------------------------------------
  // Tokens
  // ---------------------------------------------------------------------------

  /** Emite access + refresh tokens, guarda o hash do refresh e devolve o perfil. */
  /**
   * Aviso de nova entrada (definição security.login_alerts, ativa por omissão):
   * deixa um registo na caixa de comunicados do próprio, para detetar
   * acessos que não reconhece. Nunca bloqueia o login.
   */
  /** Registo de auditoria das entradas (o interceptor geral não vê pedidos anónimos). */
  private audit(userId: string, action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED', description: string) {
    this.prisma.user
      .findUnique({ where: { id: userId }, select: { fullName: true, memberRank: true } })
      .then((u) =>
        this.prisma.activityLog.create({
          data: {
            level: action === 'LOGIN_SUCCESS' ? 'INFO' : 'SECURITY',
            module: 'AUTH',
            action,
            description,
            userId,
            userName: u?.fullName?.slice(0, 200),
            userRole: u?.memberRank ?? null,
            targetType: 'USER',
            targetId: userId,
          },
        }),
      )
      .catch(() => undefined);
  }

  private async loginAlert(userId: string, method: string): Promise<void> {
    this.audit(userId, 'LOGIN_SUCCESS', `Entrada com ${method}`);
    try {
      const pref = await this.prisma.userSetting.findUnique({ where: { userId_key: { userId, key: 'security.login_alerts' } } });
      if (pref && pref.value === false) return;
      const how: Record<string, string> = {
        senha: 'senha',
        device: 'telemóvel de confiança',
        totp: 'código do autenticador',
        recovery: 'código de recuperação',
        otp: 'código enviado por SMS/email',
        code: 'código de verificação',
      };
      const when = new Date().toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', dateStyle: 'long', timeStyle: 'short' });
      await this.prisma.notification.create({
        data: {
          title: 'Nova entrada na sua conta',
          message: `A sua conta ELO iniciou sessão em ${when} (hora de Maputo), com ${how[method] ?? method}. Se não foi você, altere a senha e contacte o administrador da sua unidade.`,
          category: 'SEGURANCA',
          urgency: method === 'recovery' ? 'ALTA' : 'BAIXA',
          senderId: userId,
          availableActions: ['VER_DETALHES'],
          recipients: { create: { userId } },
        },
      });
    } catch (e) {
      this.logger?.warn?.(`Aviso de entrada não registado: ${(e as Error).message}`);
    }
  }

  private async issueSession(user: UserWithAdmin): Promise<TokensDto> {
    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastAccess: new Date() },
    });
    return { ...tokens, user: this.mapToAuthUserDto(user) };
  }

  async generateTokens(user: Pick<User, 'id' | 'tokenVersion'> & { adminProfile?: unknown }) {
    const base = { sub: user.id, tv: user.tokenVersion };
    const accessExp = this.config.get<string>('jwt.expiration', '15m');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync({ ...base, typ: 'access', jti: randomUUID() } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessExp as any,
      }),
      this.jwtService.signAsync({ ...base, typ: 'refresh', jti: randomUUID() } satisfies JwtPayload, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.config.get<string>('jwt.refreshExpiration', '7d') as any,
      }),
    ]);

    const decoded = this.jwtService.decode(accessToken) as { exp: number; iat: number };

    return {
      accessToken,
      refreshToken,
      expiresIn: decoded.exp - decoded.iat,
      tokenType: 'Bearer',
      isAdmin: !!user.adminProfile,
    };
  }

  /**
   * Guarda apenas o SHA-256 do refresh token.
   * Nota: bcrypt NÃO serve aqui — só considera os primeiros 72 bytes, e todos
   * os JWT do mesmo utilizador partilham esse prefixo (cabeçalho + id), o que
   * tornava qualquer refresh token antigo "válido".
   */
  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: this.hashToken(refreshToken) },
    });
  }

  private hashToken(token: string): string {
    return 'sha256:' + createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenMatches(token: string, stored: string): boolean {
    const a = Buffer.from(this.hashToken(token));
    const b = Buffer.from(stored);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // ---------------------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------------------

  private get saltRounds(): number {
    return this.config.get<number>('security.bcryptSaltRounds', 12);
  }

  private assertAccountUsable(user: User) {
    if (!user.isActive) {
      throw new ForbiddenException('Conta desativada. Contacte a administração.');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw new ForbiddenException(`Conta bloqueada. Tente novamente em ${minutes} minuto(s).`);
    }
  }

  private async registerFailedAttempt(user: User): Promise<void> {
    // Política definida pelos administradores (Configuração do sistema), com valores do ambiente por omissão.
    const { maxAttempts: max, lockoutMinutes: lockMinutes } = await this.policy.loginPolicy();
    const attempts = user.loginAttempts + 1;

    if (attempts >= max) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: new Date(Date.now() + lockMinutes * 60_000),
          otpCode: null,
          otpExpiresAt: null,
        },
      });
      this.logger.warn(`Conta ${user.id} bloqueada após ${attempts} tentativas falhadas`);
      this.audit(user.id, 'ACCOUNT_LOCKED', `Conta bloqueada ${lockMinutes} min após ${attempts} senhas erradas`);
      throw new ForbiddenException(
        `Conta bloqueada por ${lockMinutes} minutos devido a múltiplas tentativas falhadas.`,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: attempts },
    });
    this.audit(user.id, 'LOGIN_FAILED', `Senha errada (${attempts} de ${max})`);
  }

  private async resetLoginAttempts(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { loginAttempts: 0, lockedUntil: null },
    });
  }

  private findUserByIdentifier(dto: LoginDto): Promise<UserWithAdmin | null> {
    const where = this.resolveIdentifier(dto);
    if (!where) return Promise.resolve(null);
    return this.prisma.user.findUnique({ where, include: USER_WITH_ADMIN });
  }

  private resolveIdentifier(dto: LoginDto): Prisma.UserWhereUniqueInput | null {
    if (dto.nip) return { nip: dto.nip };
    if (dto.biNumber) return { biNumber: dto.biNumber.toUpperCase() };
    if (dto.nuit) return { nuit: dto.nuit };
    if (dto.institutionalEmail) return { institutionalEmail: dto.institutionalEmail.trim() };

    const id = dto.identifier?.trim();
    if (!id) return null;
    if (/^\d{9}$/.test(id)) return { nuit: id }; // NUIT antes de NIP (9 dígitos)
    if (/^\d{6,10}$/.test(id)) return { nip: id };
    if (/^\d{9,12}[A-Z]{1,2}\d{0,3}$/i.test(id)) return { biNumber: id.toUpperCase() };
    if (id.includes('@')) return { institutionalEmail: id };
    return null;
  }

  private initialSecurityLevel(rank: MemberRank): SecurityLevel {
    if (isRankAtLeast(rank, MemberRank.SUPERINTENDENTE)) return SecurityLevel.MAXIMO;
    if (isRankAtLeast(rank, MemberRank.INSPECTOR)) return SecurityLevel.ALTO;
    if (isRankAtLeast(rank, MemberRank.SARGENTO)) return SecurityLevel.INTERMEDIO;
    return SecurityLevel.BASICO;
  }

  /** 2FA obrigatório para oficiais, unidades sensíveis, níveis altos e administradores. */
  private requiresTwoFactor(user: UserWithAdmin): boolean {
    return (
      user.isTwoFactorEnabled ||
      !!user.adminProfile ||
      isRankAtLeast(user.memberRank, MemberRank.INSPECTOR) ||
      SENSITIVE_DEPARTMENTS.includes(user.department) ||
      user.securityLevel === SecurityLevel.ALTO ||
      user.securityLevel === SecurityLevel.MAXIMO
    );
  }

  mapToAuthUserDto(user: User & { adminProfile?: any }): AuthUserDto {
    return {
      id: user.id,
      nip: user.nip,
      fullName: user.fullName,
      currentPosition: user.currentPosition,
      memberRank: user.memberRank,
      department: user.department,
      unit: user.unit,
      province: user.province,
      securityLevel: user.securityLevel,
      mustChangePassword: !!(user as any).mustChangePassword,
      admin: user.adminProfile
        ? {
            isAdmin: true,
            adminLevel: user.adminProfile.adminLevel,
            permissions: user.adminProfile.permissions.map((p: any) => ({
              module: p.module,
              actions: p.actions,
            })),
          }
        : { isAdmin: false },
    };
  }
}
