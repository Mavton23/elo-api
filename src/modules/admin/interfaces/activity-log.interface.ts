export interface ActivityLog {
  id: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'SECURITY';
  module: 'AUTH' | 'USERS' | 'HIERARCHY' | 'NOTIFICATIONS' | 'SYSTEM' | 'ADMIN';
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  targetType?: 'USER' | 'NODE' | 'MEMBER' | 'NOTIFICATION' | 'SYSTEM' | 'POST' | 'COMMENT';
  targetId?: string;
  targetName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
}

export interface ActivityStats {
  totalLogs: number;
  logsToday: number;
  logsThisWeek: number;
  logsThisMonth: number;
  byLevel: Record<string, number>;
  byModule: Record<string, number>;
  byTargetType: Record<string, number>;
  recentActivities: ActivityLog[];
  topUsers: Array<{
    userId: string;
    userName: string;
    count: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
}

export interface DashboardOverview {
  today: number;
  yesterday: number;
  changePercent: number;
  recentErrors: ActivityLog[];
  recentSecurity: ActivityLog[];
  topModulesToday: Array<{
    module: string;
    count: number;
    percentage: string;
  }>;
}

export interface DailyTimeline {
  date: string;
  total: number;
  byLevel: Record<string, number>;
  byModule: Record<string, number>;
}