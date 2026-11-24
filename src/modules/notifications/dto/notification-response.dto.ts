import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationStatus,
  NotificationAction,
  Department,
  MemberRank 
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty({ enum: NotificationCategory })
  category: NotificationCategory;

  @ApiProperty({ enum: UrgencyLevel })
  urgency: UrgencyLevel;

  @ApiProperty({ enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty()
  sender: {
    id: string;
    name: string;
    rank: MemberRank;
    department: Department;
    unit?: string;
  };

  @ApiProperty()
  recipients: {
    departments?: Department[];
    ranks?: MemberRank[];
    provinces?: string[];
    specificUsers?: string[];
    isBroadcast: boolean;
  };

  @ApiProperty()
  metadata: {
    requiresConfirmation: boolean;
    confirmationDeadline?: string;
    hasAttachment: boolean;
    attachmentCount: number;
    isBroadcast: boolean;
  };

  @ApiProperty()
  availableActions: NotificationAction[];

  @ApiProperty()
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    name: string;
    size?: number;
  }>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  sentAt: string;

  @ApiProperty({ required: false })
  readAt?: string;

  @ApiProperty({ required: false })
  respondedAt?: string;

  @ApiProperty({ required: false })
  response?: string;

  @ApiProperty({ required: false })
  expiresAt?: string;

  @ApiProperty({ required: false })
  relatedTo?: {
    type: string;
    id: string;
    reference?: string;
  };
}