import { ApiProperty } from '@nestjs/swagger';

export class OrgChartNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: ['MINISTERIO', 'DEPARTAMENTO', 'UNIDADE', 'MEMBRO'] })
  type: 'MINISTERIO' | 'DEPARTAMENTO' | 'UNIDADE' | 'MEMBRO';

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ required: false })
  position?: string;

  @ApiProperty({ required: false })
  data?: any;
}

export class OrgChartLinkDto {
  @ApiProperty()
  source: string;

  @ApiProperty()
  target: string;

  @ApiProperty({ required: false })
  type?: string;

  @ApiProperty({ required: false })
  description?: string;
}

export class OrganizationalChartDto {
  @ApiProperty({ type: [OrgChartNodeDto] })
  nodes: OrgChartNodeDto[];

  @ApiProperty({ type: [OrgChartLinkDto] })
  links: OrgChartLinkDto[];
}