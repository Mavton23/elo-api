import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Patch,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MfaService } from '@/modules/auth/services/mfa.service';
import { PASSWORD_MESSAGE, PASSWORD_REGEX } from '@/modules/auth/dto/password-policy';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersAdminService } from '../services/users-admin.service';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import { UserFilterDto } from '../dto/user-admin.dto';
import { UserCreateDataDto, UserUpdateDataDto } from '../dto/user-admin.dto';
import { Department, MemberRank, AdminLevel, SecurityLevel, AdminModule, AdminAction } from '@prisma/client';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UsersAdminController {
  constructor(
    private readonly usersAdminService: UsersAdminService,
    private readonly mfa: MfaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários com filtros' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false, enum: Department })
  @ApiQuery({ name: 'rank', required: false, enum: MemberRank })
  @ApiQuery({ name: 'unit', required: false })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'adminLevel', required: false, enum: AdminLevel })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions([AdminModule.USERS, AdminAction.VIEW])
  @UseGuards(AdminPermissionsGuard)
  async getUsers(@Query() filter: UserFilterDto) {
    return this.usersAdminService.getUsers(filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas de usuários' })
  @AdminPermissions(['USERS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getUserStats() {
    return this.usersAdminService.getUserStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um usuário' })
  @AdminPermissions(['USERS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersAdminService.getUser(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo usuário' })
  @AdminPermissions(['USERS', 'CREATE'])
  @UseGuards(AdminPermissionsGuard)
  async createUser(@Body() userData: UserCreateDataDto) {
    return this.usersAdminService.createUser(userData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() userData: UserUpdateDataDto,
  ) {
    return this.usersAdminService.updateUser(id, userData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir usuário' })
  @AdminPermissions(['USERS', 'DELETE'])
  @UseGuards(AdminPermissionsGuard)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersAdminService.deleteUser(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar/desativar usuário' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async toggleUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('active') active: boolean,
  ) {
    return this.usersAdminService.toggleUserStatus(id, active);
  }

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Resetar senha do usuário' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('newPassword') newPassword: string,
  ) {
    if (typeof newPassword !== 'string' || !PASSWORD_REGEX.test(newPassword)) {
      throw new BadRequestException(PASSWORD_MESSAGE);
    }
    return this.usersAdminService.resetPassword(id, newPassword);
  }

  /**
   * Reposição presencial do 2FA: remove telemóveis de confiança e autenticador,
   * termina as sessões e devolve 10 novos códigos de recuperação para entregar
   * em mão ao efetivo (após verificação de identidade).
   */
  @Post(':id/reset-2fa')
  @ApiOperation({ summary: 'Repor o 2FA de um efetivo que perdeu o acesso (ato presencial)' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async resetTwoFactor(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    if (id === req.user.id) {
      throw new ForbiddenException('Não pode repor o seu próprio 2FA. Peça a outro administrador.');
    }
    const codes = await this.mfa.resetAllFactors(id);
    return {
      codes,
      message: 'Entregue estes códigos ao efetivo em mão. Ele deve configurar um novo telemóvel de confiança no primeiro acesso.',
    };
  }

  @Patch(':id/security-level')
  @ApiOperation({ summary: 'Atualizar nível de segurança' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateSecurityLevel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('securityLevel') securityLevel: SecurityLevel,
  ) {
    return this.usersAdminService.updateSecurityLevel(id, securityLevel);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Obter atividade do usuário' })
  @AdminPermissions(['USERS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getUserActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersAdminService.getUserActivity(id, limit);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Exportar usuários para CSV' })
  @AdminPermissions(['USERS', 'EXPORT'])
  @UseGuards(AdminPermissionsGuard)
  async exportUsers(@Query() filter: UserFilterDto) {
    return this.usersAdminService.exportUsers(filter);
  }
}