import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { MediaCloudinaryModule } from '@/modules/cloudinary/cloudinary.module';
import { DataUpdateAdminController, DataUpdateController } from './controllers/data-update.controller';
import { LifeProofAdminController, LifeProofController } from './controllers/life-proof.controller';
import { DataUpdateService } from './services/data-update.service';
import { LifeProofService } from './services/life-proof.service';
import { MemberNotifier } from './services/member-notifier.service';

/** Serviços ao efetivo: prova de vida e atualização de dados sem filas. */
@Module({
  imports: [AuthModule, MediaCloudinaryModule],
  controllers: [
    LifeProofController,
    LifeProofAdminController,
    DataUpdateController,
    DataUpdateAdminController,
  ],
  providers: [LifeProofService, DataUpdateService, MemberNotifier],
})
export class MemberServicesModule {}
