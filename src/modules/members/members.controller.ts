import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Department } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembersService } from './members.service';
import { GetMemberProfileQueryDto } from './dto/get-member-profile.dto';
import { SearchMembersDto } from './dto/search-members.dto';
import { Viewer } from './member-privacy';

const viewerOf = (req: any): Viewer => ({
  id: req.user.id,
  department: req.user.department,
  unit: req.user.unit,
  memberRank: req.user.memberRank,
  isAdmin: !!req.user.isAdmin,
});

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Diretório de efetivos', description: 'Pesquisa por nome/unidade/função com filtros; respeita as preferências de privacidade.' })
  search(@Req() req: any, @Query() dto: SearchMembersDto) {
    return this.membersService.searchMembers(dto, viewerOf(req));
  }

  @Get('department/:department')
  @ApiOperation({ summary: 'Efetivos de um departamento' })
  byDepartment(@Req() req: any, @Param('department') department: Department, @Query() dto: SearchMembersDto) {
    return this.membersService.getMembersByDepartment(department, viewerOf(req), dto.page, dto.limit);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Perfil de um efetivo', description: 'Completo para o próprio e administradores; cartão profissional para os restantes.' })
  profile(@Req() req: any, @Param('id', ParseUUIDPipe) id: string, @Query() query: GetMemberProfileQueryDto) {
    return this.membersService.getMemberProfile(id, viewerOf(req), query);
  }
}
