import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpType, HelpStatus, HelpAudience } from '@prisma/client';

export class HelpArticle {
  @ApiProperty({ description: 'ID do artigo' })
  id: string;

  @ApiProperty({ description: 'Título do artigo' })
  title: string;

  @ApiProperty({ description: 'Slug para URL amigável' })
  slug: string;

  @ApiProperty({ description: 'Resumo do artigo' })
  excerpt: string;

  @ApiProperty({ enum: HelpCategory, description: 'Categoria do artigo' })
  category: HelpCategory;

  @ApiProperty({ enum: HelpType, description: 'Tipo de conteúdo' })
  type: HelpType;

  @ApiProperty({ type: [String], description: 'Tags do artigo' })
  tags: string[];

  @ApiProperty({ enum: HelpAudience, description: 'Público-alvo' })
  audience: HelpAudience;

  @ApiProperty({ description: 'Conteúdo em formato markdown/HTML' })
  content: string;

  @ApiProperty({ required: false, description: 'URL do vídeo' })
  videoUrl?: string;

  @ApiProperty({ required: false, description: 'Imagem destacada' })
  featuredImage?: string;

  @ApiProperty({ enum: HelpStatus, description: 'Status do artigo' })
  status: HelpStatus;

  @ApiProperty({ description: 'Artigo em destaque' })
  isFeatured: boolean;

  @ApiProperty({ description: 'Artigo fixado' })
  isPinned: boolean;

  @ApiProperty({ description: 'Ordem de exibição' })
  order: number;

  @ApiProperty({ required: false, description: 'Tempo de leitura em minutos' })
  readingTime?: number;

  @ApiProperty({ description: 'Nível de dificuldade (1-5)' })
  difficulty: number;

  @ApiProperty({ description: 'ID do autor' })
  authorId: string;

  @ApiProperty({ required: false, description: 'ID do revisor' })
  reviewerId?: string;

  @ApiProperty({ required: false, description: 'Data da revisão' })
  reviewedAt?: Date;

  @ApiProperty({ required: false, description: 'Data de publicação' })
  publishedAt?: Date;

  @ApiProperty({ description: 'Número de visualizações' })
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