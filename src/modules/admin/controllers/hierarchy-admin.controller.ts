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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HierarchyAdminService } from '../services/hierarchy-admin.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import {
  HierarchyFilterDto,
  HierarchyCreateDataDto,
  HierarchyUpdateDataDto,
  HierarchyMoveDataDto,
  AddMembersDto,
  RemoveMembersDto,
  HierarchyStatsDto,
} from '../dto/hierarchy-admin.dto';
import { UnitType, Department, MemberRank } from '@prisma/client';

@ApiTags('Admin - Hierarchy')
@ApiBearerAuth()
@Controller('admin/hierarchy')
@UseGuards(JwtAuthGuard, AdminGuard)
export class HierarchyAdminController {
  constructor(private readonly hierarchyAdminService: HierarchyAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Listar nós hierárquicos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false, enum: UnitType })
  @ApiQuery({ name: 'department', required: false, enum: Department })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'commanderId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getNodes(@Query() filter: HierarchyFilterDto) {
    return this.hierarchyAdminService.getNodes(filter);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Obter árvore hierárquica completa' })
  @ApiQuery({ name: 'rootId', required: false })
  @ApiQuery({ name: 'maxDepth', required: false, type: Number })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getTree(
    @Query('rootId') rootId?: string,
    @Query('maxDepth') maxDepth?: number,
  ) {
    return this.hierarchyAdminService.getTree(rootId, maxDepth);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas da hierarquia' })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getStats(): Promise<HierarchyStatsDto> {
    return this.hierarchyAdminService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um nó' })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getNode(@Param('id', ParseUUIDPipe) id: string) {
    return this.hierarchyAdminService.getNode(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo nó hierárquico' })
  @AdminPermissions(['HIERARCHY', 'CREATE'])
  @UseGuards(AdminPermissionsGuard)
  async createNode(@Body() nodeData: HierarchyCreateDataDto) {
    return this.hierarchyAdminService.createNode(nodeData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar nó hierárquico' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async updateNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() nodeData: HierarchyUpdateDataDto,
  ) {
    return this.hierarchyAdminService.updateNode(id, nodeData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir nó hierárquico' })
  @AdminPermissions(['HIERARCHY', 'DELETE'])
  @UseGuards(AdminPermissionsGuard)
  async deleteNode(@Param('id', ParseUUIDPipe) id: string) {
    return this.hierarchyAdminService.deleteNode(id);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Mover nó na hierarquia' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async moveNode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() moveData: HierarchyMoveDataDto,
  ) {
    return this.hierarchyAdminService.moveNode(id, moveData);
  }

  @Get('search/members')
  @ApiOperation({ summary: 'Buscar membros para vinculação' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false, enum: Department })
  @ApiQuery({ name: 'rank', required: false, enum: MemberRank })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async searchMembers(@Query() filter: any) {
    return this.hierarchyAdminService.searchMembers(filter);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar membros do nó' })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getNodeMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.hierarchyAdminService.getNodeMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar membros ao nó' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async addMembers(
    @Param('id', ParseUUIDPipe) nodeId: string,
    @Body() addMembersDto: AddMembersDto,
  ) {
    return this.hierarchyAdminService.addMembers(nodeId, addMembersDto.members);
  }

  @Delete(':id/members')
  @ApiOperation({ summary: 'Remover membros do nó' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async removeMembers(
    @Param('id', ParseUUIDPipe) nodeId: string,
    @Body() removeMembersDto: RemoveMembersDto,
  ) {
    return this.hierarchyAdminService.removeMembers(nodeId, removeMembersDto.userIds);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Ativar/desativar nó' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async toggleNodeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('active') active: boolean,
  ) {
    return this.hierarchyAdminService.toggleNodeStatus(id, active);
  }

  @Get(':id/children')
  @ApiOperation({ summary: 'Obter filhos diretos do nó' })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getNodeChildren(@Param('id', ParseUUIDPipe) id: string) {
    return this.hierarchyAdminService.getNodeChildren(id);
  }

  @Get(':id/path')
  @ApiOperation({ summary: 'Obter caminho do nó até a raiz' })
  @AdminPermissions(['HIERARCHY', 'VIEW'])
  @UseGuards(AdminPermissionsGuard)
  async getNodePath(@Param('id', ParseUUIDPipe) id: string) {
    return this.hierarchyAdminService.getNodePath(id);
  }

  @Post('bulk/update-order')
  @ApiOperation({ summary: 'Atualizar ordem de múltiplos nós' })
  @AdminPermissions(['HIERARCHY', 'EDIT'])
  @UseGuards(AdminPermissionsGuard)
  async bulkUpdateOrder(@Body() updates: Array<{ id: string; order: number }>) {
    return this.hierarchyAdminService.bulkUpdateOrder(updates);
  }
}