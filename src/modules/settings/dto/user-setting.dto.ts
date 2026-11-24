import { ApiProperty } from '@nestjs/swagger';
import { UserSettingCategory, UserSettingType } from '@prisma/client';

export class UserSettingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  key: string;

  @ApiProperty({ enum: UserSettingCategory })
  category: UserSettingCategory;

  @ApiProperty({ enum: UserSettingType })
  type: UserSettingType;

  @ApiProperty()
  value: any;

  @ApiProperty()
  defaultValue: any;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  options?: any[];

  @ApiProperty()
  order: number;

  @ApiProperty()
  isRequired: boolean;

  @ApiProperty()
  isEditable: boolean;

  @ApiProperty()
  isVisible: boolean;

  @ApiProperty({ required: false })
  minValue?: any;

  @ApiProperty({ required: false })
  maxValue?: any;

  @ApiProperty({ required: false })
  regex?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty({ required: false })
  lastModifiedAt?: string;
}