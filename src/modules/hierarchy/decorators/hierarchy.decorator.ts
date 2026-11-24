import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

// Decorator para endpoints de hierarquia
export function HierarchyEndpoint(operation: string) {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiOperation({ summary: operation }),
  );
}

// Decorator para endpoints com filtros
export function HierarchyFilters() {
  return applyDecorators(
    ApiQuery({ name: 'department', required: false, enum: [
      'ORDEM_PUBLICA', 'INVESTIGACAO_CRIMINAL', 'POLICIA_FRONTEIRAS',
      'POLICIA_COSTEIRA', 'POLICIA_TRANSITO', 'UIR', 'UPAI', 'K9',
      'CAVALARIA', 'UDEE', 'OPERACOES_ESPECIAIS'
    ]}),
    ApiQuery({ name: 'province', required: false }),
    ApiQuery({ name: 'unitType', required: false, enum: [
      'ESQUADRA', 'COMANDO_DISTRITAL', 'COMANDO_PROVINCIAL',
      'DIRECCAO_NACIONAL', 'QUARTEL', 'SUBUNIDADE'
    ]}),
    ApiQuery({ name: 'rank', required: false, enum: [
      'GUARDA', 'SEGUNDO_CABO', 'PRIMEIRO_CABO', 'SARGENTO',
      'SARGENTO_PRINCIPAL', 'SUBINSPECTOR', 'INSPECTOR',
      'INSPECTOR_PRINCIPAL', 'ADJUNTO_SUPERINTENDENTE',
      'SUPERINTENDENTE', 'SUPERINTENDENTE_PRINCIPAL',
      'PRIMEIRO_ADJUNTO_COMISSARIO', 'COMISSARIO', 'INSPECTOR_GERAL'
    ]}),
    ApiQuery({ name: 'searchQuery', required: false }),
  );
}