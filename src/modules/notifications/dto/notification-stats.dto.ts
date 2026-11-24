import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory, UrgencyLevel } from '@prisma/client';

export class NotificationStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  unread: number;

  @ApiProperty()
  byCategory: Record<NotificationCategory, number>;

  @ApiProperty()
  byUrgency: Record<UrgencyLevel, number>;

  @ApiProperty()
  requiresAction: number;

  @ApiProperty()
  today: number;

  @ApiProperty()
  read: number;

  @ApiProperty()
  archived: number;

  @ApiProperty()
  responded: number;
}