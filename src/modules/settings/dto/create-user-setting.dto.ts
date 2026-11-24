import { 
  IsEnum, 
  IsString, 
  IsOptional, 
  IsBoolean, 
  IsNumber,
  IsArray,
  MaxLength,
  MinLength,
  ValidateIf,
  IsJSON,
} from 'class-validator';
import { IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserSettingCategory, UserSettingType } from '@prisma/client';

export class CreateUserSettingDto {
  @ApiProperty({ example: 'notifications.enabled' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  key: string;

  @ApiProperty({ enum: UserSettingCategory })
  @IsEnum(UserSettingCategory)
  category: UserSettingCategory;

  @ApiProperty({ enum: UserSettingType })
  @IsEnum(UserSettingType)
  type: UserSettingType;

  @ApiProperty()
  @IsOptional()
  value?: any;

  @ApiProperty()
  @IsDefined()
  defaultValue: any;

  @ApiProperty({ example: 'Notificações ativadas' })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  options?: any[];

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isEditable?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  minValue?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  maxValue?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  regex?: string;

  // Validação condicional baseada no tipo
  @ValidateIf(o => o.type === 'SELECT' || o.type === 'ARRAY')
  @IsOptional()
  @IsArray()
  validateOptions?: boolean;
}