import { forwardRef, Module } from '@nestjs/common';
import { UserSettingsService } from './services/user-settings.service';
import { UserSettingsInitializerService } from './services/user-settings-initializer.service';
import { UserSettingsController } from './controllers/user-settings.controller';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserSettingsController],
  providers: [
    UserSettingsService,
    UserSettingsInitializerService,
  ],
  exports: [UserSettingsService, UserSettingsInitializerService],
})
export class SettingsModule {}