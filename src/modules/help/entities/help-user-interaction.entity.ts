import { ApiProperty } from '@nestjs/swagger';

export class HelpUserInteraction {
  @ApiProperty({ description: 'ID da interação' })
  id: string;

  @ApiProperty({ description: 'ID do artigo' })
  articleId: string;

  @ApiProperty({ description: 'ID do usuário' })
  userId: string;

  @ApiProperty({ description: 'Usuário visualizou o artigo' })
  hasViewed: boolean;

  @ApiProperty({ required: false, description: 'Data da visualização' })
  viewedAt?: Date;

  @ApiProperty({ required: false, description: 'Artigo foi útil?' })
  wasHelpful?: boolean;

  @ApiProperty({ required: false, description: 'Data do voto' })
  votedAt?: Date;

  @ApiProperty({ description: 'Artigo está bookmarkado' })
  isBookmarked: boolean;

  @ApiProperty({ required: false, description: 'Data do bookmark' })
  bookmarkedAt?: Date;

  @ApiProperty({ required: false, description: 'Comentário do usuário' })
  comment?: string;

  @ApiProperty({ required: false, description: 'Rating (1-5)', minimum: 1, maximum: 5 })
  rating?: number;

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}