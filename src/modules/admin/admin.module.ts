import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { UsersAdminController } from './controllers/users-admin.controller';
import { HierarchyAdminController } from './controllers/hierarchy-admin.controller';
import { ActivityAdminController } from './controllers/activity-admin.controller';
import { SettingsAdminController } from './controllers/settings-admin.controller';
import { AdminService } from './services/admin.service';
import { UsersAdminService } from './services/users-admin.service';
import { HierarchyAdminService } from './services/hierarchy-admin.service';
import { ActivityAdminService } from './services/activity-admin.service';
import { SettingsAdminService } from './services/settings-admin.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { HierarchyModule } from '../hierarchy/hierarchy.module';

@Module({
  imports: [AuthModule, UsersModule, HierarchyModule],
  controllers: [
    AdminController,
    UsersAdminController,
    HierarchyAdminController,
    ActivityAdminController,
    SettingsAdminController,
  ],
  providers: [
    AdminService,
    UsersAdminService,
    HierarchyAdminService,
    ActivityAdminService,
    SettingsAdminService,
  ],
  exports: [
    AdminService,
    HierarchyAdminService,
    ActivityAdminService,
    SettingsAdminService,
  ],
})
export class AdminModule {}