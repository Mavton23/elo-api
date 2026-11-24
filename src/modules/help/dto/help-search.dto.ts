import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpType, HelpAudience } from '@prisma/client';
import { IsBoolean, IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export class HelpSearchDto {
  @ApiProperty({ required: false, description: 'Termo de busca' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ enum: HelpCategory, required: false, description: 'Filtrar por categoria' })
  @IsEnum(HelpCategory)
  @IsOptional()
  category?: HelpCategory;

  @ApiProperty({ enum: HelpType, required: false, description: 'Filtrar por tipo' })
  @IsEnum(HelpType)
  @IsOptional()
  type?: HelpType;

  @ApiProperty({ enum: HelpAudience, required: false, description: 'Filtrar por público-alvo' })
  @IsEnum(HelpAudience)
  @IsOptional()
  audience?: HelpAudience;

  @ApiProperty({ required: false, description: 'Filtrar por tag' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiProperty({ required: false, description: 'Apenas artigos em destaque' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === true || value === 'true'))
  @IsBoolean()
  onlyFeatured?: boolean;

  @ApiProperty({ required: false, description: 'Página atual', default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, description: 'Itens por página', default: 10 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Campo para ordenação' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiProperty({ required: false, description: 'Direção da ordenação', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}