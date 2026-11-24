import { 
  IsEnum, 
  IsString, 
  IsArray, 
  IsOptional, 
  IsBoolean, 
  IsDateString,
  MaxLength,
  MinLength,
  ArrayNotEmpty,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationAction, 
  Department, 
  MemberRank 
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Operação Conjunta na Costa do Sol' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Operação de apreensão realizada com sucesso.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;

  @ApiProperty({ enum: NotificationCategory })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({ enum: UrgencyLevel })
  @IsEnum(UrgencyLevel)
  urgency: UrgencyLevel;

  @ApiProperty({ 
    required: false,
    description: 'Departamentos alvo (vazio = broadcast)' 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Department, { each: true })
  targetDepartments?: Department[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(MemberRank, { each: true })
  targetRanks?: MemberRank[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetProvinces?: string[];

  @ApiProperty({ 
    required: false,
    description: 'IDs de usuários específicos' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificUsers?: string[];

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresConfirmation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  confirmationDeadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ 
    type: [String],
    enum: NotificationAction,
    default: ['VER_DETALHES'] 
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationAction, { each: true })
  availableActions?: NotificationAction[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationAttachmentDto)
  attachments?: NotificationAttachmentDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  relatedTo?: {
    type: 'POST' | 'MEMBER' | 'UNIT' | 'DOCUMENT' | 'OPERATION';
    id: string;
    reference?: string;
  };
}

export class NotificationAttachmentDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  size?: number;
}