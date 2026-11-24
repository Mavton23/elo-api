import { HierarchyNodeDto } from '../dto/hierarchy-node.dto';
import { HierarchyStatsDto } from '../dto/hierarchy-stats.dto';
import { Department, UnitType, MemberRank } from '@prisma/client';

export const HIERARCHY_DATA: HierarchyNodeDto = {
  id: 'mint-root',
  type: 'MINISTERIO',
  name: 'Ministério do Interior',
  description: 'Órgão central de coordenação das forças de segurança em Moçambique',
  data: {
    minister: 'Ministro Actual',
    viceMinister: 'Vice-Ministro Actual',
  },
  children: [
    {
      id: 'dept-ordem-publica',
      type: 'DEPARTAMENTO',
      name: 'Ordem Pública',
      description: 'Responsável pela manutenção da ordem e segurança pública',
      data: {
        department: 'POLICIA_PROTECAO',
        director: 'Director da Ordem Pública',
        deputyDirector: 'Subdirector da Ordem Pública',
      },
      children: [
        {
          id: 'unit-maputo-cidade',
          type: 'UNIDADE',
          name: 'Comando Provincial de Maputo Cidade',
          data: {
            unitType: 'COMANDO_PROVINCIAL',
            province: 'Maputo Cidade',
            commander: 'Comandante Provincial',
            memberCount: 1250,
          },
          children: [
            {
              id: 'unit-esquadra-matola',
              type: 'UNIDADE',
              name: 'Esquadra da Matola',
              data: {
                unitType: 'ESQUADRA',
                province: 'Maputo Cidade',
                commander: 'Comandante da Esquadra',
                memberCount: 85,
              },
            },
            {
              id: 'unit-esquadra-zimpeto',
              type: 'UNIDADE',
              name: 'Esquadra de Zimpeto',
              data: {
                unitType: 'ESQUADRA',
                province: 'Maputo Cidade',
                commander: 'Comandante da Esquadra',
                memberCount: 72,
              },
            },
          ],
        },
      ],
    },
    // ... outros departamentos conforme seu mock data
  ],
};

export const HIERARCHY_STATS: HierarchyStatsDto = {
  totalMembers: 8500,
  totalDepartments: 11,
  totalUnits: 156,
  activeMembers: 8200,
  membersByRank: {
    'GUARDA': 2500,
    'SEGUNDO_CABO': 1800,
    'PRIMEIRO_CABO': 1500,
    'SARGENTO': 1200,
    'SARGENTO_PRINCIPAL': 800,
    'SUBINSPECTOR': 400,
    'INSPECTOR': 250,
    'INSPECTOR_PRINCIPAL': 120,
    'ADJUNTO_SUPERINTENDENTE': 60,
    'SUPERINTENDENTE': 35,
    'SUPERINTENDENTE_PRINCIPAL': 20,
    'PRIMEIRO_ADJUNTO_COMISSARIO': 12,
    'COMISSARIO': 8,
    'INSPECTOR_GERAL': 1,
  },
  membersByDepartment: {
    'POLICIA_PROTECAO': 0,
    'POLICIA_TRANSITO': 0,
    'POLICIA_FRONTEIRAS': 0,
    'POLICIA_COSTEIRA_LACUSTRE_FLUVIAL': 0,
    'UNIDADE_CANINA': 0,
    'UNIDADE_INTERVENCAO_RAPIDA': 0,
    'UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES': 0,
    'GRUPO_OPERACOES_ESPECIAIS': 0
  },
  membersByProvince: {
    'Maputo Cidade': 2500,
    'Maputo Província': 1200,
    'Gaza': 850,
    'Inhambane': 750,
    'Sofala': 800,
    'Manica': 700,
    'Tete': 650,
    'Zambézia': 900,
    'Nampula': 950,
    'Cabo Delgado': 850,
    'Niassa': 450,
  },
};

export const RANK_DISPLAY_NAMES: Record<MemberRank, string> = {
  'GUARDA': 'Guarda',
  'SEGUNDO_CABO': '2º Cabo',
  'PRIMEIRO_CABO': '1º Cabo',
  'SARGENTO': 'Sargento',
  'SARGENTO_PRINCIPAL': 'Sargento Principal',
  'SUBINSPECTOR': 'Subinspector',
  'INSPECTOR': 'Inspector',
  'INSPECTOR_PRINCIPAL': 'Inspector Principal',
  'ADJUNTO_SUPERINTENDENTE': 'Adjunto Superintendente',
  'SUPERINTENDENTE': 'Superintendente',
  'SUPERINTENDENTE_PRINCIPAL': 'Superintendente Principal',
  'PRIMEIRO_ADJUNTO_COMISSARIO': 'Primeiro Adjunto Comissário',
  'COMISSARIO': 'Comissário',
  'INSPECTOR_GERAL': 'Inspector Geral',
};

export const DEPARTMENT_DISPLAY_NAMES: Record<Department, string> = {
  'POLICIA_PROTECAO': 'Polícia de Proteção',
  'UNIDADE_CANINA': 'Unidade Canina',
  'POLICIA_FRONTEIRAS': 'Polícia de Fronteiras',
  'POLICIA_COSTEIRA_LACUSTRE_FLUVIAL': 'Polícia Costeira, Lacustre e Fluvial',
  'POLICIA_TRANSITO': 'Polícia de Trânsito',
  'UNIDADE_INTERVENCAO_RAPIDA': 'Unidade de Intervenção Rápida (UIR)',
  'UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES':
    'Unidade de Proteção de Altas Individualidades (UPAI)',
  'GRUPO_OPERACOES_ESPECIAIS': 'Grupo de Operações Especiais (GOE)',
};

export const UNIT_TYPE_DISPLAY_NAMES: Record<UnitType, string> = {
  'ESQUADRA': 'Esquadra',
  'COMANDO_DISTRITAL': 'Comando Distrital',
  'COMANDO_PROVINCIAL': 'Comando Provincial',
  'DIRECCAO_NACIONAL': 'Direcção Nacional',
  'QUARTEL': 'Quartel',
  'SUBUNIDADE': 'Subunidade',
  'DEPARTAMENTO': 'Departamento',
  'SECCAO': 'Secção',
  'COMPANHIA': 'Companhia'
};

export const PROVINCES = [
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