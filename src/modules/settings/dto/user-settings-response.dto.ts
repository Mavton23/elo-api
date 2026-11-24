import { ApiProperty } from '@nestjs/swagger';
import { UserSettingDto } from './user-setting.dto';

export class UserSettingsResponseDto {
  @ApiProperty({ type: [UserSettingDto] })
  settings: UserSettingDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  byCategory: Record<string, number>;
}

export class UserSettingValueDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  value: any;

  @ApiProperty({ required: false })
  label?: string;

  @ApiProperty({ required: false })
  description?: string;
}