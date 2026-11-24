import { NotificationReportService } from './services/notification-report.service';
import { Module } from '@nestjs/common';
import { NotificationsService } from './services/notifications.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationStatsService } from './services/notification-stats.service';
import { NotificationTasksService } from './tasks/notification-tasks.service';
import { NotificationsController } from './controllers/notifications.controller';
import { UserNotificationsController } from './controllers/user-notifications.controller';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [
    AuthModule,
  ],
  controllers: [NotificationsController, UserNotificationsController],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationStatsService,
    NotificationTasksService,
    NotificationsGateway,
    NotificationReportService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}