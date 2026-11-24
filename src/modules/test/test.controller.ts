import { Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAdmin } from '@/modules/admin/decorators/require-admin.decorator';
import { TestService } from './test.service';

/** Utilitários de desenvolvimento. Este módulo NÃO é carregado em produção. */
@ApiTags('Desenvolvimento')
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post('init-hierarchy')
  @RequireAdmin('SYSTEM', 'CREATE')
  initHierarchy() {
    return this.testService.initializeHierarchy();
  }
}
