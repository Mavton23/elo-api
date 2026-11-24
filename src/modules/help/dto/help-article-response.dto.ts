import { ApiProperty } from '@nestjs/swagger';
import { HelpCategory, HelpType, HelpStatus, HelpAudience } from '@prisma/client';

export class HelpArticleResponseDto {
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

  @ApiProperty({ description: 'Conteúdo' })
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

  @ApiProperty({ description: 'Informações do autor' })
  author: {
    id: string;
    fullName: string;
    memberRank: string;
  };

  @ApiProperty({ required: false, description: 'Informações do revisor' })
  reviewer?: {
    id: string;
    fullName: string;
  };

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

  @ApiProperty({ description: 'Seções do artigo' })
  sections: Array<{
    id: string;
    title: string;
    content: string;
    order: number;
  }>;

  @ApiProperty({ description: 'Anexos do artigo' })
  attachments: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    downloads: number;
  }>;

  @ApiProperty({ description: 'Interação do usuário atual (se autenticado)' })
  userInteraction?: {
    hasViewed: boolean;
    wasHelpful?: boolean;
    isBookmarked: boolean;
    rating?: number;
  };

  @ApiProperty({ description: 'Data de criação' })
  createdAt: Date;

  @ApiProperty({ description: 'Data de atualização' })
  updatedAt: Date;
}