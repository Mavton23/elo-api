import { IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityLevel, ActivityModule, TargetType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class ActivityLogDto {
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
  @Type(() => Object)
  metadata?: Record<string, any>;

  @ApiProperty()
  @Type(() => Date)
  timestamp: Date | string;

  @ApiProperty()
  @Type(() => Date)
  createdAt: Date | string;
}

export class ActivityFiltersDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: ActivityLevel })
  @IsEnum(ActivityLevel)
  @IsOptional()
  level?: ActivityLevel;

  @ApiPropertyOptional({ enum: ActivityModule })
  @IsEnum(ActivityModule)
  @IsOptional()
  module?: ActivityModule;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: TargetType })
  @IsEnum(TargetType)
  @IsOptional()
  targetType?: TargetType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  targetId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}

export class ActivityStatsDto {
  @ApiProperty()
  totalLogs: number;

  @ApiProperty()
  logsToday: number;

  @ApiProperty()
  logsThisWeek: number;

  @ApiProperty()
  logsThisMonth: number;

  @ApiProperty({ type: Object })
  byLevel: Record<string, number>;

  @ApiProperty({ type: Object })
  byModule: Record<string, number>;

  @ApiProperty({ type: Object })
  byTargetType: Record<string, number>;

  @ApiProperty({ type: () => [ActivityLogDto] })
  recentActivities: ActivityLogDto[];

  @ApiProperty({ type: () => [TopUserDto] })
  topUsers: TopUserDto[];

  @ApiProperty({ type: () => [HourlyDistributionDto] })
  hourlyDistribution: HourlyDistributionDto[];
}

export class TopUserDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  count: number;
}

export class HourlyDistributionDto {
  @ApiProperty()
  hour: number;

  @ApiProperty()
  count: number;
}

export class ExportLogsDto extends ActivityFiltersDto {
  @ApiProperty({ enum: ['csv', 'json'] })
  @IsEnum(['csv', 'json'])
  format: 'csv' | 'json';
}