import { 
  NotificationCategory, 
  UrgencyLevel, 
  NotificationStatus,
  NotificationAction,
  Department,
  MemberRank 
} from '@prisma/client';

export interface NotificationWebSocketPayload {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  urgency: UrgencyLevel;
  senderId: string;
  createdAt: string;
}

export interface NotificationUpdatePayload {
  notificationId: string;
  status: NotificationStatus;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface BroadcastCriteria {
  departments?: Department[];
  ranks?: MemberRank[];
  provinces?: string[];
  unitTypes?: string[];
  units?: string[];
}

export interface NotificationAnalytics {
  totalSent: number;
  totalRead: number;
  averageReadTime: number; // em horas
  responseRate: number; // porcentagem
  categoryDistribution: Record<NotificationCategory, number>;
  urgencyDistribution: Record<UrgencyLevel, number>;
}