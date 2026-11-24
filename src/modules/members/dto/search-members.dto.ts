import { ApiPropertyOptional } from '@nestjs/swagger';
import { Department, MemberRank } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SearchMembersDto {
  @ApiPropertyOptional({ description: 'Nome ou unidade (mín. 2 caracteres)' })
  @IsOptional() @IsString() @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ enum: Department })
  @IsOptional() @IsEnum(Department)
  department?: Department;

  @ApiPropertyOptional({ enum: MemberRank })
  @IsOptional() @IsEnum(MemberRank)
  rank?: MemberRank;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  province?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit: number = 20;
}
