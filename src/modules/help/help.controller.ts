import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  BadRequestException,
  Request
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
// import { Request } from 'express';

import { HelpService } from './help.service';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';
import { CreateHelpFAQDto } from './dto/create-help-faq.dto';
import { HelpSearchDto } from './dto/help-search.dto';
import { HelpArticleResponseDto } from './dto/help-article-response.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

// Interface baseada no seu padrão
interface RequestWithUser extends Request {
  user: {
    id: string;
    nip: string;
    fullName: string;
    memberRank: string;
    department: string;
    unit: string;
    province: string;
    securityLevel: string;
    // Adicione outros campos que você tem no user
  };
}

@ApiTags('Ajuda')
@Controller('help')
@UseGuards(JwtAuthGuard)
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  // ============ ARTIGOS DE AJUDA ============

  @Post('articles')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10)) // Máximo 10 arquivos
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Criar um novo artigo de ajuda' })
  @ApiResponse({ status: 201, description: 'Artigo criado com sucesso', type: HelpArticleResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou slug já existe' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async createArticle(
    @Body() createHelpArticleDto: CreateHelpArticleDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.createArticle(createHelpArticleDto, userId, files);
  }

  @Get('articles')
  @ApiOperation({ summary: 'Buscar artigos de ajuda' })
  @ApiQuery({ name: 'query', required: false, description: 'Termo de busca' })
  @ApiQuery({ name: 'category', required: false, enum: ['GERAL', 'AUTENTICACAO', 'PERFIL', 'HIERARQUIA', 'MEMBROS', 'NOTIFICACOES', 'CONFIGURACOES', 'SOCIAL', 'ADMINISTRACAO', 'SEGURANCA'] })
  @ApiQuery({ name: 'type', required: false, enum: ['MANUAL', 'TUTORIAL', 'FAQ', 'VIDEO', 'GUIA_RAPIDO', 'ARTIGO'] })
  @ApiQuery({ name: 'audience', required: false, enum: ['TODOS_USUARIOS', 'MEMBROS', 'COMANDANTES', 'ADMINISTRADORES', 'NOVOS_USUARIOS'] })
  @ApiQuery({ name: 'tag', required: false })
  @ApiQuery({ name: 'onlyFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Lista de artigos retornada com sucesso' })
  async findAllArticles(
    @Query() searchDto: HelpSearchDto,
    @Req() req: Request,
  ) {
    const userId = (req as RequestWithUser).user?.id;
    return this.helpService.findAllArticles(searchDto, userId);
  }

  @Get('articles/:identifier')
  @ApiOperation({ summary: 'Buscar artigo por ID ou slug' })
  @ApiParam({ name: 'identifier', description: 'ID ou slug do artigo' })
  @ApiResponse({ status: 200, description: 'Artigo retornado com sucesso', type: HelpArticleResponseDto })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado para este artigo' })
  async findArticleByIdOrSlug(
    @Param('identifier') identifier: string,
    @Req() req: Request,
  ) {
    const userId = (req as RequestWithUser).user?.id;
    return await this.helpService.findArticleByIdOrSlug(identifier, userId);
  }

  @Put('articles/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar artigo' })
  @ApiParam({ name: 'id', description: 'ID do artigo' })
  @ApiResponse({ status: 200, description: 'Artigo atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para editar' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async updateArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHelpArticleDto: UpdateHelpArticleDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.updateArticle(id, updateHelpArticleDto, userId);
  }

  @Delete('articles/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir artigo' })
  @ApiParam({ name: 'id', description: 'ID do artigo' })
  @ApiResponse({ status: 200, description: 'Artigo excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para excluir' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async deleteArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.deleteArticle(id, userId);
  }

  @Post('articles/:id/attachments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('file', 1)) // Apenas 1 arquivo por vez
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Adicionar anexo a artigo' })
  @ApiParam({ name: 'id', description: 'ID do artigo' })
  @ApiResponse({ status: 201, description: 'Anexo adicionado com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para adicionar anexos' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async addAttachment(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    const file = files?.[0];
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    return this.helpService.addAttachmentToArticle(id, file, userId);
  }

  // ============ INTERAÇÕES DO USUÁRIO ============

  @Post('articles/:id/vote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Votar se artigo foi útil ou não' })
  @ApiParam({ name: 'id', description: 'ID do artigo' })
  @ApiQuery({ name: 'helpful', required: true, type: Boolean, description: 'true para útil, false para não útil' })
  @ApiResponse({ status: 200, description: 'Voto registrado com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async voteArticle(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('helpful') helpful: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    const isHelpful = helpful === 'true';
    return this.helpService.voteArticle(id, userId, isHelpful);
  }

  @Post('articles/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adicionar/remover artigo dos bookmarks' })
  @ApiParam({ name: 'id', description: 'ID do artigo' })
  @ApiResponse({ status: 200, description: 'Bookmark atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Artigo não encontrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async toggleBookmark(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.toggleBookmark(id, userId);
  }

  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar artigos bookmarkados pelo usuário' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Bookmarks retornados com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getUserBookmarks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.getUserBookmarks(userId, page, limit);
  }

  // ============ FAQs ============

  @Post('faqs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar novo FAQ (apenas admin)' })
  @ApiResponse({ status: 201, description: 'FAQ criado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas administradores' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async createFAQ(
    @Body() createHelpFAQDto: CreateHelpFAQDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.createFAQ(createHelpFAQDto, userId);
  }

  @Get('faqs')
  @ApiOperation({ summary: 'Buscar FAQs' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'audience', required: false })
  @ApiQuery({ name: 'onlyFeatured', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'FAQs retornados com sucesso' })
  async findAllFAQs(
    @Query('category') category?: string,
    @Query('audience') audience?: string,
    @Query('onlyFeatured') onlyFeatured?: boolean,
  ) {
    return this.helpService.findAllFAQs({
      category: category as any,
      audience: audience as any,
      onlyFeatured,
    });
  }

  @Put('faqs/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar FAQ (apenas admin)' })
  @ApiParam({ name: 'id', description: 'ID do FAQ' })
  @ApiResponse({ status: 200, description: 'FAQ atualizado com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas administradores' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'FAQ não encontrado' })
  async updateFAQ(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<CreateHelpFAQDto>,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.updateFAQ(id, updateData, userId);
  }

  @Delete('faqs/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Excluir FAQ (apenas admin)' })
  @ApiParam({ name: 'id', description: 'ID do FAQ' })
  @ApiResponse({ status: 200, description: 'FAQ excluído com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas administradores' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 404, description: 'FAQ não encontrado' })
  async deleteFAQ(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.deleteFAQ(id, userId);
  }

  // ============ ESTATÍSTICAS ============

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter estatísticas do módulo de ajuda (apenas admin)' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas com sucesso' })
  @ApiResponse({ status: 403, description: 'Apenas administradores' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getHelpStats(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.helpService.getHelpStats(userId);
  }

  // ============ PESQUISA ============

  @Get('search')
  @ApiOperation({ summary: 'Pesquisar na ajuda' })
  @ApiQuery({ name: 'q', required: true, description: 'Termo de busca' })
  @ApiResponse({ status: 200, description: 'Resultados da pesquisa' })
  async search(
    @Query('q') query: string,
    @Req() req: Request,
  ) {
    // Registrar log da busca
    const userId = (req as RequestWithUser).user?.id;
    const userAgent = req.headers['user-agent'];
    // const ipAddress = req.ip;

    const results = await this.helpService.findAllArticles(
      { query, limit: 20 },
      userId,
    );

    // Log da busca (assíncrono, não bloqueia a resposta)
    this.helpService.logSearch(
      query,
      results.meta.total,
      userId,
      undefined,
      userAgent,
    //   ipAddress,
    ).catch(console.error);

    return results;
  }

  // ============ ARTIGOS POPULARES ============

  @Get('popular')
  @ApiOperation({ summary: 'Obter artigos populares' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número de artigos (padrão: 5)' })
  @ApiResponse({ status: 200, description: 'Artigos populares retornados' })
  async getPopularArticles(
    @Query('limit') limit: number = 5,
  ) {
    const searchDto: HelpSearchDto = {
      limit,
      sortBy: 'views',
      sortOrder: 'desc',
    };
    return this.helpService.findAllArticles(searchDto);
  }

  // ============ ARTIGOS POR CATEGORIA ============

  @Get('categories/:category')
  @ApiOperation({ summary: 'Obter artigos por categoria' })
  @ApiParam({ name: 'category', description: 'Categoria dos artigos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Artigos da categoria retornados' })
  async getArticlesByCategory(
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const searchDto: HelpSearchDto = {
      category: category as any,
      page,
      limit,
    };
    return this.helpService.findAllArticles(searchDto);
  }

  // ============ ARTIGOS RECOMENDADOS ============

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter artigos recomendados para o usuário' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número de artigos (padrão: 5)' })
  @ApiResponse({ status: 200, description: 'Artigos recomendados retornados' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getRecommendedArticles(
    @Query('limit') limit: number = 5,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.helpService.getRecommendedArticles(userId, limit);
  }
}