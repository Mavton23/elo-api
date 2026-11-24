import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional,
  IsString, IsUUID, Matches, MaxLength, Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Department, UnitType, MemberRank } from '@prisma/client';
import { OrgChartLinkDto } from './org-chart.dto';

export class HierarchyNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  type: UnitType;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  code?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  parentId?: string;

  @ApiProperty({ type: () => Object, required: false })
  data?: Record<string, any>;

  @ApiProperty({ required: false })
  department?: Department;

  @ApiProperty({ required: false })
  province?: string;

  @ApiProperty({ required: false })
  municipality?: string;

  @ApiProperty({ required: false })
  district?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  commander?: {
    id: string;
    name: string;
    rank: MemberRank;
    position?: string;
  };

  @ApiProperty({ required: false })
  operationalHours?: string;

  @ApiProperty({ required: false })
  jurisdiction?: string;

  @ApiProperty({ required: false })
  capacity?: number;

  @ApiProperty({ required: false })
  memberCount?: number;

  @ApiProperty({ required: false })
  activeMemberCount?: number;

  @ApiProperty({ type: () => [MemberDto], required: false })
  topMembers?: MemberDto[];

  @ApiProperty({ type: () => [HierarchyNodeDto], required: false })
  children?: HierarchyNodeDto[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  level: number;

  @ApiProperty()
  order: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class MemberDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  rank: MemberRank;

  @ApiProperty({ required: false })
  position?: string;

  @ApiProperty({ required: false })
  department?: Department;

  @ApiProperty({ required: false })
  unit?: string;

  @ApiProperty({ required: false })
  province?: string;

  @ApiProperty({ required: false })
  isActive?: boolean;
}

export class HierarchyFiltersDto {
  @ApiProperty({ required: false, enum: Department })
  @IsOptional() @IsEnum(Department)
  department?: Department;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(50)
  province?: string;

  @ApiProperty({ required: false, enum: UnitType })
  @IsOptional() @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  municipality?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional() @IsBoolean() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  includeChildren?: boolean = true;

  @ApiProperty({ required: false, default: false })
  @IsOptional() @IsBoolean() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  includeMembers?: boolean = false;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  maxDepth?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional() @IsBoolean() @Transform(({ value }) => (value === undefined ? undefined : value === true || value === 'true'))
  onlyActive?: boolean = true;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;
}

export class OrganizationalChartDto {
  @ApiProperty()
  root: HierarchyNodeDto;

  @ApiProperty()
  totalNodes: number;

  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  departments: string[];

  @ApiProperty()
  provinces: string[];

  // @ApiProperty({ type: () => [HierarchyNodeDto], required: false })
  // nodes?: HierarchyNodeDto[];

  // @ApiProperty({ type: () => [OrgChartLinkDto], required: false })
  // links?: OrgChartLinkDto[];
}

export class CreateHierarchyNodeDto {
  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/i, { message: 'Código deve conter apenas letras, números, "_" ou "-"' })
  code: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsUUID()
  parentId?: string;

  @ApiProperty({ required: false, enum: Department })
  @IsOptional() @IsEnum(Department)
  department?: Department;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(50)
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  municipality?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  district?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(500)
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsEmail() @MaxLength(100)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsUUID()
  commanderId?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  operationalHours?: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(500)
  jurisdiction?: string;

  @ApiProperty({ required: false })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  capacity?: number;

  @ApiProperty({ required: false })
  @IsOptional() @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  order?: number;
}

export class UpdateHierarchyNodeDto extends PartialType(CreateHierarchyNodeDto) {
  @ApiProperty({ required: false })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class AssignCommanderDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsDateString()
  effectiveDate?: Date;
}

export class AddMemberToNodeDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ required: false })
  @IsOptional() @IsString() @MaxLength(100)
  role?: string;

  @ApiProperty({ required: false, default: 'active' })
  @IsOptional() @IsString() @MaxLength(20)
  status?: string;
}

export class HierarchyStatsDto {
  @ApiProperty()
  totalNodes: number;

  @ApiProperty()
  activeNodes: number;

  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  membersByDepartment: Record<string, number>;

  @ApiProperty()
  membersByProvince: Record<string, number>;

  @ApiProperty()
  nodesByType: Record<string, number>;

  @ApiProperty()
  nodesWithoutCommander: number;
}