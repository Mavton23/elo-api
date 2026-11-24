import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpAudience } from '@prisma/client';

export class HelpFAQ {
  @ApiProperty({ description: 'ID do FAQ' })
  id: string;

  @ApiProperty({ description: 'Pergunta' })
  question: string;

  @ApiProperty({ description: 'Resposta' })
  answer: string;

  @ApiProperty({ enum: HelpCategory, description: 'Categoria' })
  category: HelpCategory;

  @ApiProperty({ type: [String], description: 'Tags' })
  tags: string[];

  @ApiProperty({ enum: HelpAudience, description: 'Público-alvo' })
  audience: HelpAudience;

  @ApiProperty({ description: 'Ordem de exibição' })
  order: number;

  @ApiProperty({ description: 'FAQ em destaque' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Visualizações' })
  views: number;

  @ApiProperty({ description: 'Votos úteis' })
  helpfulVotes: number;

  @ApiProperty({ description: 'Votos não úteis' })
  notHelpfulVotes: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}