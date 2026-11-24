import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Department, UnitType } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function initializeHierarchy() {
  console.log('Inicializando estrutura hierárquica...');

  // Verificar se já existe nó raiz
  const existingRoot = await prisma.hierarchyNode.findFirst({
    where: { parentId: null },
  });

  if (existingRoot) {
    console.log('Estrutura hierárquica já existe.');
    return;
  }

  // Criar nó raiz do Ministério
  const ministry = await prisma.hierarchyNode.create({
    data: {
      type: UnitType.DIRECCAO_NACIONAL,
      name: 'Ministério do Interior',
      code: 'MINT-ROOT',
      description: 'Órgão central de coordenação das forças de segurança em Moçambique',
      level: 0,
      order: 0,
      data: {
        minister: 'Ministro',
        viceMinister: 'Vice-Ministro',
        abbreviation: 'MINT',
      },
    },
  });

  console.log('Nó raiz criado:', ministry.name);

  // Criar departamentos
  const departments: {
    type: UnitType;
    name: string;
    code: string;
    department: Department;
  }[] = [
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Polícia de Protecção',
        code: 'PP-001',
        department: Department.POLICIA_PROTECAO,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Polícia de Trânsito',
        code: 'PT-001',
        department: Department.POLICIA_TRANSITO,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Polícia de Fronteiras',
        code: 'PF-001',
        department: Department.POLICIA_FRONTEIRAS,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Polícia Costeira, Lacustre e Fluvial',
        code: 'PCLF-001',
        department: Department.POLICIA_COSTEIRA_LACUSTRE_FLUVIAL,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Polícia Canina',
        code: 'PCAN-001',
        department: Department.UNIDADE_CANINA,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Unidade de Intervenção Rápida',
        code: 'UIR-001',
        department: Department.UNIDADE_INTERVENCAO_RAPIDA,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Unidade de Protecção de Altas Individualidades',
        code: 'UPAI-001',
        department: Department.UNIDADE_PROTECAO_ALTAS_INDIVIDUALIDADES,
    },
    {
        type: UnitType.DEPARTAMENTO,
        name: 'Grupo de Operações Especiais',
        code: 'GOE-001',
        department: Department.GRUPO_OPERACOES_ESPECIAIS,
    },
  ];


  for (const [index, dept] of departments.entries()) {
    await prisma.hierarchyNode.create({
      data: {
        ...dept,
        parentId: ministry.id,
        level: 1,
        order: index + 1,
        description: `Departamento de ${dept.name}`,
      },
    });
  }

  console.log(`${departments.length} departamentos criados.`);

  // Criar comandos provinciais para cada província
  const provinces = [
    'Maputo Cidade', 'Maputo Província', 'Gaza', 'Inhambane',
    'Sofala', 'Manica', 'Tete', 'Zambézia',
    'Nampula', 'Cabo Delgado', 'Niassa'
  ];

  for (const province of provinces) {
    await prisma.hierarchyNode.create({
      data: {
        type: 'COMANDO_PROVINCIAL',
        name: `Comando Provincial de ${province}`,
        code: `CP-${province.toUpperCase().replace(/\s+/g, '-')}`,
        province: province,
        level: 1,
        order: 100 + provinces.indexOf(province),
        description: `Comando Provincial da Polícia em ${province}`,
        parentId: ministry.id,
      },
    });
  }

  console.log(`${provinces.length} comandos provinciais criados.`);

  console.log('Estrutura hierárquica inicializada com sucesso!');
}

initializeHierarchy()
  .catch((e) => {
    console.error('Erro ao inicializar hierarquia:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });