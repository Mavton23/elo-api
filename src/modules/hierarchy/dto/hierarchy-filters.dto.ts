import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Department, UnitType, MemberRank } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class HierarchyFiltersDto {
  @ApiProperty({ enum: Department, required: false })
  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ enum: UnitType, required: false })
  @IsOptional()
  @IsEnum(UnitType)
  unitType?: UnitType;

  @ApiProperty({ enum: MemberRank, required: false })
  @IsOptional()
  @IsEnum(MemberRank)
  rank?: MemberRank;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchQuery?: string;
}