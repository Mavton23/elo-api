import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AboutModuleStatus, AboutModuleCategory } from '@prisma/client';

export class AboutModuleDto {
  @ApiProperty({ description: 'Nome do módulo' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Categoria do módulo' })
  @IsEnum(AboutModuleCategory)
  category: AboutModuleCategory;

  @ApiProperty({ description: 'Status do módulo' })
  @IsEnum(AboutModuleStatus)
  status: AboutModuleStatus;

  @ApiProperty({ description: 'Versão do módulo' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Descrição do módulo' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Módulo está habilitado?' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'URL base do módulo' })
  @IsString()
  @IsOptional()
  basePath?: string;
}

export class AboutStatsDto {
  @ApiProperty({ description: 'Total de usuários' })
  totalUsers: number;

  @ApiProperty({ description: 'Total de membros' })
  totalMembers: number;

  @ApiProperty({ description: 'Total de nós hierárquicos' })
  totalHierarchyNodes: number;

  @ApiProperty({ description: 'Total de posts' })
  totalPosts: number;

  @ApiProperty({ description: 'Total de notificações' })
  totalNotifications: number;

  @ApiProperty({ description: 'Uptime da API (em segundos)' })
  uptime: number;

  @ApiProperty({ description: 'Média de requisições por minuto' })
  requestsPerMinute: number;
}

export class AboutResponseDto {
  @ApiProperty({ description: 'Nome da API' })
  name: string;

  @ApiProperty({ description: 'Versão da API' })
  version: string;

  @ApiProperty({ description: 'Descrição da API' })
  description: string;

  @ApiProperty({ description: 'Autor/Responsável' })
  author: string;

  @ApiProperty({ description: 'Ambiente (development, production, etc)' })
  environment: string;

  @ApiProperty({ description: 'Status geral da API' })
  @IsEnum(AboutModuleStatus)
  status: AboutModuleStatus;

  @ApiProperty({ description: 'Data de build/última atualização' })
  lastUpdated: Date;

  @ApiProperty({ description: 'URL da documentação' })
  documentationUrl: string;

  @ApiProperty({ description: 'URL do repositório' })
  repositoryUrl: string;

  @ApiProperty({ description: 'Contato de suporte' })
  supportContact: string;

  @ApiProperty({ description: 'Módulos disponíveis e seus status' })
  modules: AboutModuleDto[];

  @ApiProperty({ description: 'Estatísticas básicas' })
  stats: AboutStatsDto;

  @ApiProperty({ description: 'Dependências e versões' })
  dependencies: Record<string, string>;
}