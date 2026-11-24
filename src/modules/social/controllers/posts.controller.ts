import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PostsService } from '../services/posts.service';
import { MediaCloudinaryService } from '../services/media-cloudinary.service';
import { CreatePostDto, UpdatePostDto, SocialFiltersDto, PostResponseDto } from '../dto';
import { UserContext } from '../services/visibility.service';

@ApiTags('Social - Posts')
@ApiBearerAuth()
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly mediaCloudinaryService: MediaCloudinaryService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo post' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Post criado com sucesso', type: PostResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 403, description: 'Permissão negada para esta visibilidade' })
  @UseInterceptors(FilesInterceptor('media', 5)) // Máximo 5 arquivos
  async create(
    @Req() req,
    @Body() createPostDto: CreatePostDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|mp4|mov|avi|mkv|wmv|mp3|wav|txt)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: Express.Multer.File[],
  ) {
    const user: UserContext = req.user;
    const uploads = files?.length
      ? await this.mediaCloudinaryService.uploadMultipleFiles(files, user.id)
      : [];
    return this.postsService.create(user, createPostDto, uploads);
  }

  @Get()
  @ApiOperation({ summary: 'Buscar todos os posts (com filtros)' })
  @ApiResponse({ status: 200, description: 'Lista de posts', type: [PostResponseDto] })
  async findAll(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    return this.postsService.findAll(user, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar post por ID' })
  @ApiResponse({ status: 200, description: 'Post encontrado', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada para ver este post' })
  async findOne(@Req() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.postsService.findOne(id, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar post' })
  @ApiResponse({ status: 200, description: 'Post atualizado', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada para modificar este post' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    const user: UserContext = req.user;
    return this.postsService.update(id, user, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir post' })
  @ApiResponse({ status: 204, description: 'Post excluído com sucesso' })
  @ApiResponse({ status: 404, description: 'Post não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada para excluir este post' })
  async remove(@Req() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.postsService.remove(id, user);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Curtir/Descurtir post' })
  @ApiResponse({ status: 200, description: 'Like atualizado' })
  async toggleLike(@Req() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.postsService.toggleLike(id, userId);
  }

  @Post(':id/bookmark')
  @ApiOperation({ summary: 'Adicionar/Remover bookmark' })
  @ApiResponse({ status: 200, description: 'Bookmark atualizado' })
  async toggleBookmark(@Req() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.postsService.toggleBookmark(id, userId);
  }

  @Get('user/liked')
  @ApiOperation({ summary: 'Buscar posts curtidos pelo usuário' })
  @ApiResponse({ status: 200, description: 'Posts curtidos', type: [PostResponseDto] })
  async findLikedPosts(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    return this.postsService.findLikedPosts(user.id, user, filters);
  }

  @Get('user/bookmarked')
  @ApiOperation({ summary: 'Buscar posts com bookmark' })
  @ApiResponse({ status: 200, description: 'Posts com bookmark', type: [PostResponseDto] })
  async findBookmarkedPosts(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    return this.postsService.findBookmarkedPosts(user.id, user, filters);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar post (para administradores)' })
  @ApiResponse({ status: 200, description: 'Post aprovado', type: PostResponseDto })
  @ApiResponse({ status: 403, description: 'Permissão negada para aprovar posts' })
  async approvePost(@Req() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.postsService.approvePost(id, user);
  }

  @Get('feed/home')
  @ApiOperation({ summary: 'Feed principal (posts relevantes para o usuário)' })
  @ApiResponse({ status: 200, description: 'Feed de posts', type: [PostResponseDto] })
  async getHomeFeed(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    
    // Feed personalizado baseado no usuário
    const adjustedFilters: SocialFiltersDto = {
      ...filters,
      department: user.department, // Priorizar posts do departamento
      limit: filters.limit || '20',
    };

    return this.postsService.findAll(user, adjustedFilters);
  }

  @Get('feed/department')
  @ApiOperation({ summary: 'Feed do departamento' })
  @ApiResponse({ status: 200, description: 'Posts do departamento', type: [PostResponseDto] })
  async getDepartmentFeed(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    
    const departmentFilters: SocialFiltersDto = {
      ...filters,
      department: user.department,
      limit: filters.limit || '20',
    };

    return this.postsService.findAll(user, departmentFilters);
  }

  @Get('feed/unit')
  @ApiOperation({ summary: 'Feed da unidade' })
  @ApiResponse({ status: 200, description: 'Posts da unidade', type: [PostResponseDto] })
  async getUnitFeed(@Req() req, @Query() filters: SocialFiltersDto) {
    const user: UserContext = req.user;
    
    const unitFilters: SocialFiltersDto = {
      ...filters,
      unit: user.unit,
      limit: filters.limit || '20',
    };

    return this.postsService.findAll(user, unitFilters);
  }
}