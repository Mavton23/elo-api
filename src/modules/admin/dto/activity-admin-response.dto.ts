import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityLevel, ActivityModule, TargetType } from '@prisma/client';

export class ActivityLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ActivityLevel })
  level: ActivityLevel;

  @ApiProperty({ enum: ActivityModule })
  module: ActivityModule;

  @ApiProperty()
  action: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  userName?: string;

  @ApiPropertyOptional()
  userRole?: string;

  @ApiPropertyOptional({ enum: TargetType })
  targetType?: TargetType;

  @ApiPropertyOptional()
  targetId?: string;

  @ApiPropertyOptional()
  targetName?: string;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  user?: {
    id: string;
    fullName: string;
    memberRank?: string;
    department?: string;
  };
}