import { 
  IsEnum, 
  IsOptional, 
  IsBoolean, 
  IsDateString,
  IsString
} from 'class-validator';
import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationStatus,
  Department 
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class NotificationFiltersDto {
  @ApiProperty({ required: false, enum: NotificationCategory })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiProperty({ required: false, enum: UrgencyLevel })
  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;

  @ApiProperty({ required: false, enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiProperty({ required: false, enum: Department })
  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  requiresAction?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ 
    required: false,
    description: 'Ordenação: createdAt:asc ou createdAt:desc' 
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}