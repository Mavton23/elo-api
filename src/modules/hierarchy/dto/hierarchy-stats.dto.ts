import { ApiProperty } from '@nestjs/swagger';
import { MemberRank, Department } from '@prisma/client';

export class HierarchyStatsDto {
  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  totalDepartments: number;

  @ApiProperty()
  totalUnits: number;

  @ApiProperty()
  activeMembers: number;

  @ApiProperty({ type: Object })
  membersByRank: Record<MemberRank, number>;

  @ApiProperty({ type: Object })
  membersByDepartment: Record<Department, number>;

  @ApiProperty({ type: Object })
  membersByProvince: Record<string, number>;
}