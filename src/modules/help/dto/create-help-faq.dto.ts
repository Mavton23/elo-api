import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpAudience } from '@prisma/client';
import { 
  IsString, 
  IsNotEmpty, 
  IsEnum, 
  IsArray, 
  IsOptional, 
  IsBoolean, 
  IsNumber 
} from 'class-validator';

export class CreateHelpFAQDto {
  @ApiProperty({ description: 'Pergunta do FAQ' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'Resposta do FAQ' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({ enum: HelpCategory, description: 'Categoria do FAQ' })
  @IsEnum(HelpCategory)
  category: HelpCategory;

  @ApiProperty({ type: [String], description: 'Tags do FAQ', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ enum: HelpAudience, description: 'Público-alvo', default: 'TODOS_USUARIOS' })
  @IsEnum(HelpAudience)
  @IsOptional()
  audience?: HelpAudience;

  @ApiProperty({ required: false, description: 'Ordem de exibição', default: 0 })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiProperty({ required: false, description: 'FAQ em destaque', default: false })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;
}