import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class MarkNotificationDto {
  @ApiProperty({ 
    enum: NotificationStatus,
    description: 'Status para marcar (LIDA ou ARQUIVADA)' 
  })
  @IsEnum(NotificationStatus)
  status: NotificationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  response?: string;
}