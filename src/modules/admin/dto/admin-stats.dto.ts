import { IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AdminActivityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  adminId: string;

  @ApiProperty()
  adminName: string;

  @ApiProperty()
  action: string;

  @ApiProperty({ enum: ['USER', 'HIERARCHY', 'MEMBER', 'NOTIFICATION', 'SYSTEM'] })
  targetType: string;

  @ApiProperty()
  targetId: string;

  @ApiProperty({ required: false })
  targetName?: string;

  @ApiProperty()
  timestamp: string;

  @ApiProperty({ required: false })
  ipAddress?: string;

  @ApiProperty({ required: false })
  details?: Record<string, any>;
}

export class AdminStatsDto {
  @ApiProperty()
  @IsNumber()
  totalUsers: number;

  @ApiProperty()
  @IsNumber()
  activeUsers: number;

  @ApiProperty()
  @IsNumber()
  pendingApprovals: number;

  @ApiProperty()
  @IsNumber()
  totalHierarchyNodes: number;

  @ApiProperty({ type: [AdminActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminActivityDto)
  @IsOptional()
  recentActivity?: AdminActivityDto[];
}