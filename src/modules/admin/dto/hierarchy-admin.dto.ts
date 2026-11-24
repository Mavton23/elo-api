import { IsArray, IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested, isBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UnitType, Department } from '@prisma/client';

export class HierarchyNodeDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: UnitType })
  type: UnitType;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: Department })
  department?: Department;

  @ApiPropertyOptional()
  province?: string;

  @ApiPropertyOptional({ enum: UnitType })
  unitType?: UnitType;

  @ApiPropertyOptional()
  commanderId?: string;

  @ApiPropertyOptional()
  commanderName?: string;

  @ApiProperty()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive: boolean;

  @ApiProperty()
  order: number;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiPropertyOptional({ type: () => [HierarchyNodeDto] })
  children?: HierarchyNodeDto[];
}

export class HierarchyFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: UnitType })
  @IsEnum(UnitType)
  @IsOptional()
  type?: UnitType;

  @ApiPropertyOptional({ enum: Department })
  @IsEnum(Department)
  @IsOptional()
  department?: Department;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  commanderId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class HierarchyCreateDataDto {
  @ApiProperty({ enum: UnitType })
  @IsEnum(UnitType)
  type: UnitType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ enum: Department })
  @IsEnum(Department)
  @IsOptional()
  department?: Department;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ enum: UnitType })
  @IsEnum(UnitType)
  @IsOptional()
  unitType?: UnitType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  commanderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  district?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(255)
  address?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional() @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  operationalHours?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(255)
  jurisdiction?: string;

}

export class HierarchyUpdateDataDto {
  @ApiProperty()
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  commanderId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  municipality?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  district?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(255)
  address?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional() @IsEmail() @IsOptional()
  email?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(120)
  operationalHours?: string;

  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(255)
  jurisdiction?: string;

  @ApiPropertyOptional({ enum: Department }) @IsEnum(Department) @IsOptional()
  department?: Department;

  @ApiPropertyOptional() @IsString() @IsOptional()
  province?: string;

}

export class HierarchyMoveDataDto {
  @ApiProperty()
  @IsUUID()
  nodeId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  newParentId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;
}

export class HierarchyMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  role?: string;
}

export class AddMembersDto {
  @ApiProperty({ type: [HierarchyMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HierarchyMemberDto)
  members: HierarchyMemberDto[];
}

export class RemoveMembersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class HierarchyStatsDto {
  @ApiProperty()
  totalNodes: number;

  @ApiProperty()
  totalDepartments: number;

  @ApiProperty()
  totalUnits: number;

  @ApiProperty()
  totalMembers: number;

  @ApiProperty()
  activeNodes: number;

  @ApiProperty()
  inactiveNodes: number;

  @ApiProperty()
  byType: Record<string, number>;

  @ApiProperty()
  byDepartment: Record<string, number>;

  @ApiProperty()
  byProvince: Record<string, number>;
}