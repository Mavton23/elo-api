import { RequireAdmin } from '@/modules/admin/decorators/require-admin.decorator';
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
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { HierarchyService } from '../services/hierarchy.service';
import { OrgChartService } from '../services/org-chart.service';
import {
  HierarchyNodeDto,
  HierarchyFiltersDto,
  OrganizationalChartDto,
  CreateHierarchyNodeDto,
  UpdateHierarchyNodeDto,
  AssignCommanderDto,
  AddMemberToNodeDto,
  HierarchyStatsDto,
} from '../dto/hierarchy.dto';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@Controller('hierarchy')
@UseGuards(JwtAuthGuard)
export class HierarchyController {
  constructor(
    private readonly hierarchyService: HierarchyService,
    private readonly orgChartService: OrgChartService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obter hierarquia completa' })
  @ApiResponse({ status: 200, description: 'Hierarquia retornada', type: HierarchyNodeDto })
  async getHierarchy(@Query() filters: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    return this.hierarchyService.getHierarchy(filters);
  }

  @Get('filtered')
  @ApiOperation({ summary: 'Obter hierarquia filtrada' })
  @ApiResponse({ status: 200, description: 'Hierarquia filtrada', type: HierarchyNodeDto })
  async getFilteredHierarchy(@Query() filters: HierarchyFiltersDto): Promise<HierarchyNodeDto> {
    return this.hierarchyService.getFilteredHierarchy(filters);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar nós da hierarquia' })
  @ApiResponse({ status: 200, description: 'Nós encontrados', type: [HierarchyNodeDto] })
  async searchNodes(@Query() filters: HierarchyFiltersDto): Promise<HierarchyNodeDto[]> {
    return this.hierarchyService.searchNodes(filters);
  }

  @Get('node/:id')
  @ApiOperation({ summary: 'Buscar nó específico por ID' })
  @ApiResponse({ status: 200, description: 'Nó encontrado', type: HierarchyNodeDto })
  @ApiResponse({ status: 404, description: 'Nó não encontrado' })
  async getNodeById(@Param('id') id: string): Promise<HierarchyNodeDto> {
    return this.hierarchyService.findNodeById(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Buscar nó por código' })
  @ApiResponse({ status: 200, description: 'Nó encontrado', type: HierarchyNodeDto })
  @ApiResponse({ status: 404, description: 'Nó não encontrado' })
  async getNodeByCode(@Param('code') code: string): Promise<HierarchyNodeDto> {
    return this.hierarchyService.findNodeByCode(code);
  }

  @Get('departments')
  @ApiOperation({ summary: 'Obter todos os departamentos' })
  @ApiResponse({ status: 200, description: 'Lista de departamentos', type: [HierarchyNodeDto] })
  async getDepartments(): Promise<HierarchyNodeDto[]> {
    return this.hierarchyService.getDepartments();
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Obter departamento específico' })
  @ApiResponse({ status: 200, description: 'Departamento encontrado', type: HierarchyNodeDto })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  async getDepartment(@Param('id') id: string): Promise<HierarchyNodeDto> {
    return this.hierarchyService.getDepartment(id);
  }

  @Get('units')
  @ApiOperation({ summary: 'Obter todas as unidades' })
  @ApiQuery({ name: 'province', required: false })
  @ApiQuery({ name: 'unitType', required: false })
  @ApiResponse({ status: 200, description: 'Lista de unidades', type: [HierarchyNodeDto] })
  async getUnits(
    @Query('province') province?: string,
    @Query('unitType') unitType?: string,
  ): Promise<HierarchyNodeDto[]> {
    return this.hierarchyService.getUnits({ province, unitType: unitType as any });
  }

  @Get('units/:id')
  @ApiOperation({ summary: 'Obter unidade específica' })
  @ApiResponse({ status: 200, description: 'Unidade encontrada', type: HierarchyNodeDto })
  @ApiResponse({ status: 404, description: 'Unidade não encontrado' })
  async getUnit(@Param('id') id: string): Promise<HierarchyNodeDto> {
    return this.hierarchyService.getUnit(id);
  }

  @Get('org-chart')
  @ApiOperation({ summary: 'Gerar organograma completo' })
  @ApiResponse({ status: 200, description: 'Organograma gerado', type: OrganizationalChartDto })
  async getOrgChart(@Query() filters: HierarchyFiltersDto): Promise<OrganizationalChartDto> {
    return this.orgChartService.generateOrgChart(filters);
  }

  @Get('org-chart/department/:id')
  @ApiOperation({ summary: 'Gerar organograma de um departamento' })
  @ApiResponse({ status: 200, description: 'Organograma do departamento', type: OrganizationalChartDto })
  async getDepartmentOrgChart(@Param('id') id: string): Promise<OrganizationalChartDto> {
    return this.orgChartService.generateDepartmentOrgChart(id);
  }

  @Get('org-chart/unit/:id')
  @ApiOperation({ summary: 'Gerar organograma de uma unidade' })
  @ApiResponse({ status: 200, description: 'Organograma da unidade', type: OrganizationalChartDto })
  async getUnitOrgChart(@Param('id') id: string): Promise<OrganizationalChartDto> {
    return this.orgChartService.generateUnitOrgChart(id);
  }

  @Get('org-chart/simplified')
  @ApiOperation({ summary: 'Gerar organograma simplificado' })
  @ApiQuery({ name: 'maxDepth', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Organograma simplificado', type: OrganizationalChartDto })
  async getSimplifiedOrgChart(
    @Query('maxDepth') maxDepth: string = '3',
  ): Promise<OrganizationalChartDto> {
    const depth = parseInt(maxDepth, 10) || 3;
    return this.orgChartService.generateSimplifiedOrgChart(depth);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obter hierarquia de um usuário específico' })
  @ApiResponse({ status: 200, description: 'Hierarquia do usuário', type: HierarchyNodeDto })
  async getUserHierarchy(@Param('userId') userId: string): Promise<HierarchyNodeDto> {
    const hierarchy = await this.hierarchyService.getUserHierarchy(userId);
    if (!hierarchy) {
      throw new NotFoundException('Efetivo sem colocação conhecida na estrutura');
    }
    return hierarchy;
  }

  @Get('my-hierarchy')
  @ApiOperation({ summary: 'Obter minha própria hierarquia' })
  @ApiResponse({ status: 200, description: 'Minha hierarquia', type: HierarchyNodeDto })
  async getMyHierarchy(@Req() req): Promise<HierarchyNodeDto> {
    const userId = req.user.id;
    const hierarchy = await this.hierarchyService.getUserHierarchy(userId);
    if (!hierarchy) {
      throw new NotFoundException('A sua colocação ainda não está registada na estrutura');
    }
    return hierarchy;
  }

  @Get('my-command')
  @ApiOperation({ summary: 'Obter unidades que comando' })
  @ApiResponse({ status: 200, description: 'Unidades comandadas', type: [HierarchyNodeDto] })
  async getMyCommandedNodes(@Req() req): Promise<HierarchyNodeDto[]> {
    const userId = req.user.id;
    return this.hierarchyService.getUserCommandedNodes(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas da hierarquia' })
  @ApiResponse({ status: 200, description: 'Estatísticas', type: HierarchyStatsDto })
  async getStats(): Promise<HierarchyStatsDto> {
    return this.hierarchyService.getHierarchyStats();
  }

  // POST endpoints
  @Post()
  @RequireAdmin('HIERARCHY', 'CREATE')
  @ApiOperation({ summary: 'Criar novo nó na hierarquia' })
  @ApiBody({ type: CreateHierarchyNodeDto })
  @ApiResponse({ status: 201, description: 'Nó criado com sucesso', type: HierarchyNodeDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async createNode(
    @Body() dto: CreateHierarchyNodeDto,
    @Req() req,
  ): Promise<HierarchyNodeDto> {
    return this.hierarchyService.createNode(dto, req.user.id);
  }

  @Post('node/:id/commander')
  @RequireAdmin('HIERARCHY', 'EDIT')
  @ApiOperation({ summary: 'Atribuir comandante a um nó' })
  @ApiBody({ type: AssignCommanderDto })
  @ApiResponse({ status: 200, description: 'Comandante atribuído', type: HierarchyNodeDto })
  async assignCommander(
    @Param('id') id: string,
    @Body() dto: AssignCommanderDto,
  ): Promise<HierarchyNodeDto> {
    return this.hierarchyService.assignCommander(id, dto);
  }

  @Post('node/:id/members')
  @RequireAdmin('HIERARCHY', 'EDIT')
  @ApiOperation({ summary: 'Adicionar membro a um nó' })
  @ApiBody({ type: AddMemberToNodeDto })
  @ApiResponse({ status: 200, description: 'Membro adicionado' })
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberToNodeDto,
  ): Promise<void> {
    return this.hierarchyService.addMember(id, dto);
  }

  // PUT endpoints
  @Put('node/:id')
  @RequireAdmin('HIERARCHY', 'EDIT')
  @ApiOperation({ summary: 'Atualizar nó da hierarquia' })
  @ApiBody({ type: UpdateHierarchyNodeDto })
  @ApiResponse({ status: 200, description: 'Nó atualizado', type: HierarchyNodeDto })
  async updateNode(
    @Param('id') id: string,
    @Body() dto: UpdateHierarchyNodeDto,
    @Req() req,
  ): Promise<HierarchyNodeDto> {
    return this.hierarchyService.updateNode(id, dto, req.user.id);
  }

  // DELETE endpoints
  @Delete('node/:id')
  @RequireAdmin('HIERARCHY', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir nó da hierarquia' })
  @ApiResponse({ status: 204, description: 'Nó excluído' })
  async deleteNode(@Param('id') id: string, @Req() req): Promise<void> {
    // Implementar soft delete
    await this.hierarchyService.updateNode(id, { isActive: false }, req.user.id);
  }

  @Delete('node/:id/commander')
  @RequireAdmin('HIERARCHY', 'EDIT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover comandante de um nó' })
  @ApiResponse({ status: 204, description: 'Comandante removido' })
  async removeCommander(@Param('id') id: string): Promise<void> {
    await this.hierarchyService.removeCommander(id);
  }

  @Delete('node/:id/members/:userId')
  @RequireAdmin('HIERARCHY', 'EDIT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro de um nó' })
  @ApiResponse({ status: 204, description: 'Membro removido' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.hierarchyService.removeMember(id, userId);
  }

  // Metadata endpoints
  @Get('metadata/display-names')
  @ApiOperation({ summary: 'Obter nomes de exibição (ranks, departments, unitTypes)' })
  @ApiResponse({ status: 200, description: 'Nomes de exibição' })
  async getDisplayNames() {
    return this.hierarchyService.getDisplayNames();
  }

  @Get('metadata/provinces')
  @ApiOperation({ summary: 'Obter lista de províncias' })
  @ApiResponse({ status: 200, description: 'Lista de províncias' })
  async getProvinces() {
    return this.hierarchyService.getProvinces();
  }

  @Get('metadata/unit-types')
  @ApiOperation({ summary: 'Obter tipos de unidade' })
  @ApiResponse({ status: 200, description: 'Tipos de unidade' })
  async getUnitTypes() {
    return this.hierarchyService.getUnitTypes();
  }

  @Get('metadata/ranks')
  @ApiOperation({ summary: 'Obter patentes' })
  @ApiResponse({ status: 200, description: 'Lista de patentes' })
  async getRanks() {
    return this.hierarchyService.getRanks();
  }

  @Get('metadata/departments-list')
  @ApiOperation({ summary: 'Obter departamentos como lista' })
  @ApiResponse({ status: 200, description: 'Lista de departamentos' })
  async getDepartmentsList() {
    return this.hierarchyService.getDepartmentsList();
  }
}