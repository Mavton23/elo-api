import { ApiProperty } from '@nestjs/swagger';
import { 
  MemberRank, 
  Department, 
  UnitType, 
  MaritalStatus, 
  SecurityLevel, 
  TrainingCourse
} from '@prisma/client';

export class MemberResponseDto {
  @ApiProperty({ description: 'ID único do membro' })
  id: string;

  @ApiProperty({ description: 'Número de Identificação Policial (NIP)' })
  nip: string;

  @ApiProperty({ description: 'Número do Bilhete de Identidade' })
  biNumber: string;

  @ApiProperty({ description: 'Número de Identificação Fiscal (NUIT)' })
  nuit: string;

  @ApiProperty({ description: 'Nome completo do membro' })
  fullName: string;

  @ApiProperty({ description: 'Data de nascimento' })
  dateOfBirth: Date;

  @ApiProperty({ description: 'Local de nascimento' })
  placeOfBirth: string;

  @ApiProperty({ description: 'Nacionalidade', default: 'Moçambicana' })
  nationality: string;

  @ApiProperty({ enum: MaritalStatus, description: 'Estado civil' })
  maritalStatus: MaritalStatus;

  @ApiProperty({ enum: MemberRank, description: 'Patente do membro' })
  memberRank: MemberRank;

  @ApiProperty({ description: 'Cargo atual' })
  currentPosition: string;

  @ApiProperty({ enum: Department, description: 'Departamento' })
  department: Department;

  @ApiProperty({ description: 'Unidade' })
  unit: string;

  @ApiProperty({ enum: UnitType, description: 'Tipo de unidade' })
  unitType: UnitType;

  @ApiProperty({ description: 'Província' })
  province: string;

  @ApiProperty({ description: 'Data de entrada' })
  entryDate: Date;

  @ApiProperty({ 
    description: 'Email institucional', 
    required: false 
  })
  institutionalEmail?: string;

  @ApiProperty({ 
    description: 'Telefone oficial', 
    required: false 
  })
  officialPhone?: string;

  @ApiProperty({ 
    description: 'Curso do membro', 
    required: false 
  })
  trainingCourse?: TrainingCourse;

  @ApiProperty({ 
    description: 'Local de treinamento', 
    required: false 
  })
  trainingSchool?: string;

  @ApiProperty({ 
    description: 'Ano de formação', 
    required: false 
  })
  graduationYear?: number;


  @ApiProperty({ description: 'Status de atividade' })
  isActive: boolean;

  @ApiProperty({ enum: SecurityLevel, description: 'Nível de segurança' })
  securityLevel: SecurityLevel;

  @ApiProperty({ 
    description: 'Último acesso', 
    required: false 
  })
  lastAccess?: Date;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;

  // constructor(partial: Partial<MemberResponseDto>) {
  //   Object.assign(this, partial);
  // }
}