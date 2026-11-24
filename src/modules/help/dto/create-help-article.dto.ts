import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpType, HelpAudience } from '@prisma/client';
import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsArray, 
  IsOptional, 
  IsBoolean, 
  IsNumber, 
  Min, 
  Max,
  IsUrl 
} from 'class-validator';

export class CreateHelpArticleDto {
  @ApiProperty({ description: 'Título do artigo' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Slug para URL amigável' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ description: 'Resumo do artigo' })
  @IsString()
  @IsNotEmpty()
  excerpt: string;

  @ApiProperty({ enum: HelpCategory, description: 'Categoria do artigo' })
  @IsEnum(HelpCategory)
  category: HelpCategory;

  @ApiProperty({ enum: HelpType, description: 'Tipo de conteúdo' })
  @IsEnum(HelpType)
  type: HelpType;

  @ApiProperty({ type: [String], description: 'Tags do artigo', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ enum: HelpAudience, description: 'Público-alvo', default: 'TODOS_USUARIOS' })
  @IsEnum(HelpAudience)
  @IsOptional()
  audience?: HelpAudience;

  @ApiProperty({ description: 'Conteúdo em formato markdown/HTML' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ required: false, description: 'URL do vídeo' })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ required: false, description: 'Imagem destacada' })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiProperty({ required: false, description: 'Artigo em destaque', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiProperty({ required: false, description: 'Artigo fixado', default: false })
  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @ApiProperty({ required: false, description: 'Ordem de exibição', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ required: false, description: 'Tempo de leitura em minutos' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  readingTime?: number;

  @ApiProperty({ required: false, description: 'Nível de dificuldade (1-5)', default: 1, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficulty?: number;
}