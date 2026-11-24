import { Controller, Get, Post, Req, Body, Patch, Param, Delete, UseGuards, Query , ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import { AdminStatsDto } from '../dto/admin-stats.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { AuthUserDto } from '@/modules/auth/dto';
import type { RequestWithUser } from '@/shared';
import { CreateMemberDto } from '../dto/user-admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('add-member')
  @ApiOperation({ summary: 'Adicionar um membro ao banco de pré-membros do ministério' })
  @ApiResponse({ status: 201, description: 'Membro criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Membro já existe na base de dados' })
  @AdminPermissions(['USERS', 'CREATE'])
  @UseGuards(AdminPermissionsGuard)
  async addMinistryMember(@Body() createMemberDto: CreateMemberDto) {
    return this.adminService.addMinistryMember(createMemberDto)
  }
  
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Obter estatísticas do dashboard admin' })
  @ApiResponse({ status: 200, type: AdminStatsDto })
  @AdminPermissions(['SYSTEM', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users/me')
  @ApiOperation({ summary: 'Obter perfil admin do usuário atual' })
  async getMyAdminProfile(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.adminService.getAdminProfile(userId);
  }

  @Post('users/:userId/admin')
  @ApiOperation({ summary: 'Promover usuário a admin' })
  @AdminPermissions(['USERS', 'CREATE'])
  @UseGuards(AdminPermissionsGuard)
  async promoteToAdmin(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() createAdminDto: CreateAdminDto,
  ) {
    return this.adminService.promoteToAdmin(userId, createAdminDto);
  }

  @Patch('users/:userId/admin')
  @ApiOperation({ summary: 'Atualizar perfil admin' })
  @AdminPermissions(['USERS', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateAdminProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.updateAdminProfile(userId, updateAdminDto);
  }

  @Delete('users/:userId/admin')
  @ApiOperation({ summary: 'Remover privilégios admin' })
  @AdminPermissions(['USERS', 'DELETE'])
  @UseGuards(AdminPermissionsGuard)
  async removeAdmin(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.removeAdmin(userId);
  }

  @Get('users/admins')
  @ApiOperation({ summary: 'Listar todos os administradores' })
  @AdminPermissions(['USERS', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async listAdmins(@Query() filter: any) {
    return this.adminService.listAdmins(filter);
  }
}