import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from '../auth/auth.module';

// Services
import { HierarchyService } from './services/hierarchy.service';
import { StatsService } from './services/stats.service';
import { OrgChartService } from './services/org-chart.service';

// Controllers
import { HierarchyController } from './controllers/hierarchy.controller';
import { StatsController } from './controllers/stats.controller';

// Helpers
import { HierarchyHelpers } from './helpers/hierarchy.helpers';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    AuthModule,
  ],
  controllers: [
    HierarchyController,
    StatsController,
  ],
  providers: [
    // Services
    HierarchyService,
    StatsService,
    OrgChartService,
    
    // Helpers
    {
      provide: 'HIERARCHY_HELPERS',
      useValue: HierarchyHelpers,
    },
  ],
  exports: [
    HierarchyService,
    StatsService,
    OrgChartService,
    'HIERARCHY_HELPERS',
  ],
})
export class HierarchyModule {}