import { ArrayNotEmpty, IsArray, ValidateNested, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BulkUpdateSettingItem {
  @ApiProperty()
  key: string;

  @ApiProperty()
  value: any;

  @ApiProperty({ required: false })
  reason?: string;
}

export class BulkUpdateSettingsDto {
  @ApiProperty({ type: [BulkUpdateSettingItem] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateSettingItem)
  settings: BulkUpdateSettingItem[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}