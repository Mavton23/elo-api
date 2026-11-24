import {
  Body,
  Controller,
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
  CreateLifeProofCampaignDto,
  ListRequestsQueryDto,
  ReviewDto,
  SubmitLifeProofDto,
  UpdateLifeProofCampaignDto,
} from '../dto/member-services.dto';
import { LifeProofService } from '../services/life-proof.service';

const SELFIE_UPLOAD = FileInterceptor('selfie', {
  storage: memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

@ApiTags('Prova de vida')
@ApiBearerAuth()
@Controller('life-proof')
@UseGuards(JwtAuthGuard)
export class LifeProofController {
  constructor(private readonly service: LifeProofService) {}

  @Get('status')
  @ApiOperation({ summary: 'Estado da minha prova de vida na campanha em curso' })
  status(@Req() req) {
    return this.service.status(req.user);
  }

  @Post('challenge')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Pedir código de desafio (válido 10 min) para a selfie' })
  challenge(@Req() req) {
    return this.service.createChallenge(req.user);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(SELFIE_UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Submeter prova de vida (selfie + código + localização)' })
  submit(@Req() req, @Body() dto: SubmitLifeProofDto, @UploadedFile() selfie?: Express.Multer.File) {
    return this.service.submit(req.user, dto, selfie);
  }

  @Get('history')
  @ApiOperation({ summary: 'O meu histórico de provas de vida' })
  history(@Req() req) {
    return this.service.history(req.user.id);
  }
}

@ApiTags('Admin — Prova de vida')
@Controller('admin/life-proof')
export class LifeProofAdminController {
  constructor(private readonly service: LifeProofService) {}

  @Post('campaigns')
  @RequireAdmin('USERS', 'CREATE')
  createCampaign(@Req() req, @Body() dto: CreateLifeProofCampaignDto) {
    return this.service.createCampaign(req.user.id, dto);
  }

  @Get('campaigns')
  @RequireAdmin('USERS', 'VIEW')
  listCampaigns() {
    return this.service.listCampaigns();
  }

  @Patch('campaigns/:id')
  @RequireAdmin('USERS', 'EDIT')
  updateCampaign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLifeProofCampaignDto) {
    return this.service.updateCampaign(id, dto);
  }

  @Get('campaigns/:id/compliance')
  @RequireAdmin('USERS', 'VIEW')
  @ApiOperation({ summary: 'Taxa de cumprimento da campanha' })
  compliance(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.compliance(id);
  }

  @Get()
  @RequireAdmin('USERS', 'APPROVE')
  @ApiOperation({ summary: 'Fila de validação' })
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
