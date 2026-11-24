import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

import {
  AuthUserDto,
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterDto,
  TokensDto,
  TwoFactorCodeDto,
  VerifyTwoFactorLoginDto,
  ChallengeDto,
  PasswordConfirmDto,
  RegisterDeviceDto,
} from './dto';
import { MfaService } from './services/mfa.service';
import { ApiLogin, ApiRegister } from './decorators/swagger.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { AuthService } from './services/auth.service';
import { TwoFactorService } from './services/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';

// Limites mais apertados para endpoints sensíveis (por IP)
const STRICT = { default: { limit: 5, ttl: 60_000 } };
const MODERATE = { default: { limit: 20, ttl: 60_000 } };

class EligibilityDto {
  @IsString() @Matches(/^\d{6,10}$/, { message: 'NIP inválido' })
  nip: string;

  @IsString() @MaxLength(14) @Matches(/^[0-9A-Z]+$/i, { message: 'BI inválido' })
  biNumber: string;

  @IsString() @Matches(/^\d{9}$/, { message: 'NUIT inválido' })
  nuit: string;
}

class AvailabilityDto {
  @IsIn(['nip', 'biNumber', 'nuit', 'institutionalEmail'])
  field: 'nip' | 'biNumber' | 'nuit' | 'institutionalEmail';

  @IsString() @IsNotEmpty() @MaxLength(100)
  value: string;
}

class GenericLoginDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  identifier: string;

  @IsString() @IsNotEmpty() @MaxLength(128)
  password: string;
}

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly mfa: MfaService,
  ) {}

  // --- Registo ---------------------------------------------------------------

  @Post('check-eligibility')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @ApiOperation({ summary: 'Verificar se o membro consta da base pré-registada' })
  checkEligibility(@Body() body: EligibilityDto) {
    return this.authService.checkMemberEligibility(body.nip, body.biNumber.toUpperCase(), body.nuit);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(STRICT)
  @ApiRegister()
  register(@Body() dto: RegisterDto): Promise<TokensDto> {
    return this.authService.register(dto);
  }

  /**
   * Verifica disponibilidade de um identificador.
   * Limitado e só responde a formatos válidos, para dificultar enumeração.
   */
  @Post('check-availability')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  async checkAvailability(@Body() { field, value }: AvailabilityDto) {
    const formats: Record<AvailabilityDto['field'], RegExp> = {
      nip: /^\d{6,10}$/,
      biNumber: /^[0-9A-Z]{10,14}$/i,
      nuit: /^\d{9}$/,
      institutionalEmail: /@(mint|policia|prisoes|migracao)\.gov\.mz$/i,
    };
    if (!formats[field].test(value)) {
      return { available: false, message: 'Formato inválido' };
    }
    const existing = await this.prisma.user.findFirst({
      where: { [field]: value },
      select: { id: true },
    });
    return { available: !existing };
  }

  // --- Login -----------------------------------------------------------------

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @ApiLogin()
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  /** Login com identificador genérico (NIP, BI, NUIT ou email institucional). */
  @Post('login/generic')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  loginGeneric(@Body() body: GenericLoginDto): Promise<LoginResponseDto> {
    return this.authService.login({ identifier: body.identifier, password: body.password });
  }

  @Post('verify-2fa-login')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @ApiOperation({ summary: 'Segunda etapa do login (código 2FA)' })
  verifyTwoFactorLogin(@Body() dto: VerifyTwoFactorLoginDto) {
    return this.authService.verifyTwoFactorLogin(dto);
  }

  @Post('2fa/send-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300_000 } })
  @ApiOperation({ summary: 'Último recurso: enviar código por SMS/email durante o login' })
  sendLoginOtp(@Body() dto: ChallengeDto) {
    return this.authService.sendLoginOtp(dto.challengeToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(MODERATE)
  @UseGuards(JwtRefreshGuard)
  refreshTokens(@Req() req: any): Promise<TokensDto> {
    return this.authService.refreshTokens(req.user.id, req.user.refreshToken);
  }

  // --- Sessão ----------------------------------------------------------------

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.id);
    return { message: 'Sessão terminada com sucesso' };
  }

  @Delete('session/all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async invalidateAllSessions(@Req() req: any) {
    await this.authService.logout(req.user.id);
    return { message: 'Todas as sessões foram terminadas' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getProfile(@Req() req: any): AuthUserDto {
    const u = req.user;
    return {
      id: u.id,
      nip: u.nip,
      fullName: u.fullName,
      memberRank: u.memberRank,
      currentPosition: u.currentPosition,
      department: u.department,
      unit: u.unit,
      province: u.province,
      securityLevel: u.securityLevel,
      mustChangePassword: !!u.mustChangePassword,
      admin: u.admin,
    };
  }

  @Get('session/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  checkSessionStatus(@Req() req: any) {
    return { valid: true, user: this.getProfile(req) };
  }

  @Post('validate-token')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  validateToken(@Req() req: any) {
    return { valid: true, user: this.getProfile(req) };
  }

  @Put('password')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const session = await this.authService.changePassword(req.user.id, dto);
    return { message: 'Senha alterada. As sessões noutros aparelhos foram terminadas.', ...session };
  }

  // --- Segurança da conta: fatores próprios do ELO ---------------------------

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Telemóveis de confiança, autenticador e códigos de recuperação' })
  mfaStatus(@Req() req: any) {
    return this.mfa.status(req.user.id);
  }

  @Post('2fa/devices')
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registar este telemóvel como de confiança (exige a senha)' })
  registerDevice(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    return this.mfa.registerDevice(req.user.id, dto.password, dto);
  }

  @Delete('2fa/devices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async revokeDevice(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.mfa.revokeDevice(req.user.id, id);
    return { message: 'Telemóvel removido' };
  }

  @Post('2fa/totp/setup')
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gerar segredo do código de verificação (exige a senha)' })
  setupTotp(@Req() req: any, @Body() dto: PasswordConfirmDto) {
    return this.mfa.setupTotp(req.user, dto.password);
  }

  @Post('2fa/totp/confirm')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async confirmTotp(@Req() req: any, @Body() { code }: TwoFactorCodeDto) {
    await this.mfa.confirmTotp(req.user.id, code);
    return { message: 'Código de verificação ativado' };
  }

  @Post('2fa/totp/disable')
  @HttpCode(HttpStatus.OK)
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async disableTotp(@Req() req: any, @Body() dto: PasswordConfirmDto) {
    await this.mfa.disableTotp(req.user.id, dto.password);
    return { message: 'Código de verificação desativado' };
  }

  @Post('2fa/recovery-codes')
  @Throttle(STRICT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gerar 10 códigos de recuperação (mostrados uma única vez)' })
  async recoveryCodes(@Req() req: any, @Body() dto: PasswordConfirmDto) {
    const codes = await this.mfa.generateRecoveryCodes(req.user.id, dto.password);
    return { codes, message: 'Guarde estes códigos em papel, num local seguro. Cada um só pode ser usado uma vez.' };
  }

  // --- Recuperação de senha --------------------------------------------------
  // A recuperação é feita presencialmente/pelo administrador (reset-password no
  // módulo admin), por política de segurança institucional.
}
