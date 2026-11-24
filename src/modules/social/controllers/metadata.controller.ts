import {
  Controller,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CategoryService } from '../services/category.service';
import { VisibilityService } from '../services/visibility.service';

@ApiTags('Social - Metadata')
@ApiBearerAuth()
@Controller('social/metadata')
@UseGuards(JwtAuthGuard)
export class SocialMetadataController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly visibilityService: VisibilityService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Obter todas as categorias de posts' })
  @ApiResponse({ status: 200, description: 'Lista de categorias' })
  getCategories() {
    return this.categoryService.getAllCategories();
  }

  @Get('visibility-levels')
  @ApiOperation({ summary: 'Obter níveis de visibilidade disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de níveis de visibilidade' })
  getVisibilityLevels(@Req() req) {
    const user = req.user;
    return this.categoryService.getAvailableVisibilityLevels(user.memberRank);
  }

  @Get('my-visibility-options')
  @ApiOperation({ summary: 'Obter opções de visibilidade disponíveis para o usuário atual' })
  @ApiResponse({ status: 200, description: 'Opções de visibilidade disponíveis' })
  getMyVisibilityOptions(@Req() req) {
    const user = req.user;
    const userContext = {
      id: user.id,
      memberRank: user.memberRank,
      department: user.department,
      unit: user.unit,
      province: user.province,
      securityLevel: user.securityLevel,
    };
    
    const availableOptions = this.visibilityService.getAvailableVisibilityOptions(userContext);
    
    // Obter informações completas das opções disponíveis
    const allLevels = this.categoryService.getAllVisibilityLevels();
    return allLevels.filter(level => availableOptions.includes(level.value));
  }

  @Get('rank-hierarchy')
  @ApiOperation({ summary: 'Obter hierarquia de patentes' })
  @ApiResponse({ status: 200, description: 'Hierarquia de patentes' })
  getRankHierarchy() {
    const hierarchy = [
      { value: 'GUARDA', label: 'Guarda', level: 1 },
      { value: 'SEGUNDO_CABO', label: '2º Cabo', level: 2 },
      { value: 'PRIMEIRO_CABO', label: '1º Cabo', level: 3 },
      { value: 'SARGENTO', label: 'Sargento', level: 4 },
      { value: 'SARGENTO_PRINCIPAL', label: 'Sargento Principal', level: 5 },
      { value: 'SUBINSPECTOR', label: 'Subinspector', level: 6 },
      { value: 'INSPECTOR', label: 'Inspector', level: 7 },
      { value: 'INSPECTOR_PRINCIPAL', label: 'Inspector Principal', level: 8 },
      { value: 'ADJUNTO_SUPERINTENDENTE', label: 'Adjunto Superintendente', level: 9 },
      { value: 'SUPERINTENDENTE', label: 'Superintendente', level: 10 },
      { value: 'SUPERINTENDENTE_PRINCIPAL', label: 'Superintendente Principal', level: 11 },
      { value: 'PRIMEIRO_ADJUNTO_COMISSARIO', label: 'Primeiro Adjunto Comissário', level: 12 },
      { value: 'COMISSARIO', label: 'Comissário', level: 13 },
      { value: 'INSPECTOR_GERAL', label: 'Inspector Geral', level: 14 },
    ];

    return hierarchy;
  }

  @Get('departments')
  @ApiOperation({ summary: 'Obter lista de departamentos' })
  @ApiResponse({ status: 200, description: 'Lista de departamentos' })
  getDepartments() {
    const departments = [
      { value: 'ORDEM_PUBLICA', label: 'Ordem Pública' },
      { value: 'INVESTIGACAO_CRIMINAL', label: 'Investigação Criminal' },
      { value: 'POLICIA_FRONTEIRAS', label: 'Polícia de Fronteiras' },
      { value: 'POLICIA_COSTEIRA', label: 'Polícia Costeira' },
      { value: 'POLICIA_TRANSITO', label: 'Polícia de Trânsito' },
      { value: 'UIR', label: 'UIR (Unidade de Intervenção Rápida)' },
      { value: 'UPAI', label: 'UPAI (Unidade de Proteção de Altas Individualidades)' },
      { value: 'K9', label: 'K9 (Unidade Cinotécnica)' },
      { value: 'CAVALARIA', label: 'Cavalaria' },
      { value: 'UDEE', label: 'UDEE (Unidade de Operações Especiais)' },
      { value: 'OPERACOES_ESPECIAIS', label: 'Operações Especiais' },
    ];

    return departments;
  }

  @Get('unit-types')
  @ApiOperation({ summary: 'Obter tipos de unidades' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de unidades' })
  getUnitTypes() {
    const unitTypes = [
      { value: 'ESQUADRA', label: 'Esquadra' },
      { value: 'COMANDO_DISTRITAL', label: 'Comando Distrital' },
      { value: 'COMANDO_PROVINCIAL', label: 'Comando Provincial' },
      { value: 'DIRECCAO_NACIONAL', label: 'Direção Nacional' },
      { value: 'QUARTEL', label: 'Quartel' },
      { value: 'SUBUNIDADE', label: 'Subunidade' },
    ];

    return unitTypes;
  }

  @Get('provinces')
  @ApiOperation({ summary: 'Obter lista de províncias de Moçambique' })
  @ApiResponse({ status: 200, description: 'Lista de províncias' })
  getProvinces() {
    const provinces = [
      'Maputo Cidade',
      'Maputo Província',
      'Gaza',
      'Inhambane',
      'Sofala',
      'Manica',
      'Tete',
      'Zambézia',
      'Nampula',
      'Cabo Delgado',
      'Niassa',
    ];

    return provinces.map(province => ({ value: province, label: province }));
  }
}