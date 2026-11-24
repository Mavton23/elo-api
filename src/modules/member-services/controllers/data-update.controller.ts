import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RequireAdmin } from '@/modules/admin/decorators/require-admin.decorator';
import {
  CreateDataUpdateRequestDto,
  ListRequestsQueryDto,
  ReviewDto,
} from '../dto/member-services.dto';
import { DataUpdateService } from '../services/data-update.service';

@ApiTags('Atualização de dados')
@ApiBearerAuth()
@Controller('data-updates')
@UseGuards(JwtAuthGuard)
export class DataUpdateController {
  constructor(private readonly service: DataUpdateService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Os meus dados editáveis e as regras de cada campo' })
  profile(@Req() req) {
    return this.service.editableProfile(req.user.id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('document', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Pedir atualização de dados (contactos aplicados de imediato)' })
  create(@Req() req, @Body() dto: CreateDataUpdateRequestDto, @UploadedFile() document?: Express.Multer.File) {
    return this.service.create(req.user, dto, document);
  }

  @Get()
  @ApiOperation({ summary: 'Os meus pedidos' })
  mine(@Req() req) {
    return this.service.mine(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar um pedido pendente' })
  cancel(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, req.user.id);
  }
}

@ApiTags('Admin — Atualização de dados')
@Controller('admin/data-updates')
export class DataUpdateAdminController {
  constructor(private readonly service: DataUpdateService) {}

  @Get()
  @RequireAdmin('USERS', 'APPROVE')
  list(@Query() q: ListRequestsQueryDto) {
    return this.service.list(q);
  }

  @Get(':id')
  @RequireAdmin('USERS', 'APPROVE')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }

  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @RequireAdmin('USERS', 'APPROVE')
  review(@Req() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewDto) {
    return this.service.review(id, req.user, dto);
  }
}
