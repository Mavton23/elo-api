import { ApiProperty } from '@nestjs/swagger';
import { Department, UnitType } from '@prisma/client';

export class HierarchyNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ['MINISTERIO', 'DEPARTAMENTO', 'UNIDADE', 'MEMBRO'] })
  type: 'MINISTERIO' | 'DEPARTAMENTO' | 'UNIDADE' | 'MEMBRO';

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ type: () => [HierarchyNodeDto], required: false })
  children?: HierarchyNodeDto[];

  @ApiProperty({ required: false })
  data?: {
    minister?: string;
    viceMinister?: string;
    department?: Department;
    director?: string;
    deputyDirector?: string;
    unitType?: UnitType;
    province?: string;
    commander?: string;
    memberCount?: number;
    activeMembers?: number;
    member?: any;
  };
}