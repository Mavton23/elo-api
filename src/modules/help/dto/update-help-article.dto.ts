import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateHelpArticleDto } from './create-help-article.dto';
import { IsEnum, IsOptional, IsUUID, IsDateString } from 'class-validator';

export enum HelpArticleStatus {
  RASCUNHO = 'RASCUNHO',
  PUBLICADO = 'PUBLICADO',
  ARQUIVADO = 'ARQUIVADO',
  EM_REVISAO = 'EM_REVISAO',
}

export class UpdateHelpArticleDto extends PartialType(CreateHelpArticleDto) {
  @ApiProperty({
    enum: HelpArticleStatus,
    required: false,
  })
  @IsEnum(HelpArticleStatus)
  @IsOptional()
  status?: HelpArticleStatus;

  @ApiProperty({ required: false, description: 'Data de publicação' })
  @IsDateString()
  @IsOptional()
  publishedAt?: Date;

  @ApiProperty({ required: false, description: 'ID do revisor' })
  @IsUUID()
  @IsOptional()
  reviewerId?: string;
}