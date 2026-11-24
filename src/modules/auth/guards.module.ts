import { Module } from '@nestjs/common';
import { RankGuard } from './guards/rank.guard';
import { DepartmentGuard } from './guards/department.guard';
import { SecurityLevelGuard } from './guards/security-level.guard';
import { UnitGuard } from './guards/unit.guard';
import { HierarchyGuard } from './guards/hierarchy.guard';
import { VisibilityGuard } from './guards/visibility.guard';

@Module({
  providers: [
    RankGuard,
    DepartmentGuard,
    SecurityLevelGuard,
    UnitGuard,
    HierarchyGuard,
    VisibilityGuard,
  ],
  exports: [
    RankGuard,
    DepartmentGuard,
    SecurityLevelGuard,
    UnitGuard,
    HierarchyGuard,
    VisibilityGuard,
  ],
})
export class GuardsModule {}