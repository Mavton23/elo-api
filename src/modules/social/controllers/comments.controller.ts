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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CommentsService } from '../services/comments.service';
import { CreateCommentDto, UpdateCommentDto, CommentResponseDto } from '../dto';
import { UserContext } from '../services/visibility.service';

@ApiTags('Social - Comments')
@ApiBearerAuth()
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('post/:postId')
  @ApiOperation({ summary: 'Criar comentário em um post' })
  @ApiResponse({ status: 201, description: 'Comentário criado', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Post não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  async create(
    @Req() req,
    @Param('postId') postId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const user: UserContext = req.user;
    return this.commentsService.create(postId, user, createCommentDto);
  }

  @Get('post/:postId')
  @ApiOperation({ summary: 'Buscar comentários de um post' })
  @ApiResponse({ status: 200, description: 'Lista de comentários' })
  async findAllByPost(
    @Req() req,
    @Param('postId') postId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const user: UserContext = req.user;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return this.commentsService.findAllByPost(postId, user, pageNum, limitNum);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar comentário' })
  @ApiResponse({ status: 200, description: 'Comentário atualizado', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comentário não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const user: UserContext = req.user;
    return this.commentsService.update(id, user, updateCommentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir comentário' })
  @ApiResponse({ status: 204, description: 'Comentário excluído' })
  @ApiResponse({ status: 404, description: 'Comentário não encontrado' })
  @ApiResponse({ status: 403, description: 'Permissão negada' })
  async remove(@Req() req, @Param('id') id: string) {
    const user: UserContext = req.user;
    return this.commentsService.remove(id, user);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Buscar comentários de um usuário' })
  @ApiResponse({ status: 200, description: 'Lista de comentários do usuário' })
  async findByUser(
    @Req() req,
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const currentUser: UserContext = req.user;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return this.commentsService.findByUser(userId, currentUser, pageNum, limitNum);
  }

  @Get('my-comments')
  @ApiOperation({ summary: 'Buscar meus comentários' })
  @ApiResponse({ status: 200, description: 'Lista dos meus comentários' })
  async findMyComments(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const user: UserContext = req.user;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;

    return this.commentsService.findByUser(user.id, user, pageNum, limitNum);
  }
}