import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetMemberProfileQueryDto {
  @ApiProperty({ 
    required: false, 
    default: false,
    description: 'Incluir posts do membro' 
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includePosts?: boolean = false;

  @ApiProperty({ 
    required: false, 
    default: false,
    description: 'Incluir notificações do membro' 
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeNotifications?: boolean = false;
}