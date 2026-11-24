import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Department, UnitType } from '@prisma/client';

@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async initializeHierarchy() {
    this.logger.log('Inicializando estrutura hierárquica...');

    // Verificar se já existe nó raiz
    const existingRoot = await this.prisma.hierarchyNode.findFirst({
      where: { parentId: null },
    });

    if (existingRoot) {
      this.logger.warn('Estrutura hierárquica já existe.');
      return {
        initialized: false,
        message: 'Estrutura hierárquica já existe.',
      };
    }

    // Criar nó raiz do Ministério
    const ministry = await this.prisma.hierarchyNode.create({
      data: {
        type: UnitType.DIRECCAO_NACIONAL,
        name: 'Ministério do Interior',
        code: 'MINT-ROOT',
        description:
          'Órgão central de coordenação das forças de segurança em Moçambique',
        level: 0,
        order: 0,
        data: {
          minister: 'Ministro',
          viceMinister: 'Vice-Ministro',
          abbreviation: 'MINT',
        },
      },
    });

    this.logger.log(`Nó raiz criado: ${ministry.name}`);

    // Departamentos nacionais
    const departments: {
      name: string;
      code: string;
      department: Department;
    }[] = [
      {
        name: 'Polícia de Proteção',
        code: 'PP-001',
        department: Department.POLICIA_PROTECAO,
      },
      {
        name: 'Polícia de Trânsito',
        code: 'PT-001',
        department: Department.POLICIA_TRANSITO,
      },
      {
        name: 'Polícia de Fronteiras',
        code: 'PF-001',
        department: Department.POLICIA_FRONTEIRAS,
      },
      {
        name: 'Polícia Costeira, Lacustre e Fluvial',
        code: 'PCLF-001',
        department: Department.POLICIA_COSTEIRA_LACUSTRE_FLUVIAL,
      },
      {
        name: 'Polícia Canina',
        code: 'PCAN-001',
        department: Department.UNIDADE_CANINA,
      },
      {
        name: 'Unidade de Intervenção Rápida',
        code: 'UIR-001',
        department: Department.UNIDADE_INTERVENCAO_RAPIDA,
      },
      {
        name: 'Unidade de Proteção de Altas Individualidades',
        code: 'UPAI-001',
        department:
          Department.UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES,
      },
      {
        name: 'Grupo de Operações Especiais',
        code: 'GOE-001',
        department: Department.GRUPO_OPERACOES_ESPECIAIS,
      },
    ];

    for (const [index, dept] of departments.entries()) {
      await this.prisma.hierarchyNode.create({
        data: {
          type: UnitType.DEPARTAMENTO,
          name: dept.name,
          code: dept.code,
          department: dept.department,
          parentId: ministry.id,
          level: 1,
          order: index + 1,
          description: `Departamento de ${dept.name}`,
        },
      });
    }

    this.logger.log(`${departments.length} departamentos criados.`);

    // Comandos provinciais
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

    for (const [index, province] of provinces.entries()) {
      await this.prisma.hierarchyNode.create({
        data: {
          type: UnitType.COMANDO_PROVINCIAL,
          name: `Comando Provincial de ${province}`,
          code: `CP-${province.toUpperCase().replace(/\s+/g, '-')}`,
          province,
          level: 1,
          order: 100 + index,
          description: `Comando Provincial da Polícia em ${province}`,
          parentId: ministry.id,
        },
      });
    }

    this.logger.log(`${provinces.length} comandos provinciais criados.`);

    return {
      initialized: true,
      ministryId: ministry.id,
      departments: departments.length,
      provinces: provinces.length,
    };
  }
}
