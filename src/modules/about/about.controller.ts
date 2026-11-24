import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AboutService } from './about.service';
import { AboutResponseDto } from './dto/about.dto';

@ApiTags('Sistema')
@Controller()
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  @Get('about')
  @UseGuards(JwtAuthGuard) // contém estatísticas internas (efetivos, etc.)
  @ApiOperation({ 
    summary: 'Obter informações sobre a API',
    description: 'Retorna informações como versão, autor, status e estatísticas da API'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Informações da API retornadas com sucesso',
    type: AboutResponseDto
  })
  async getAbout(): Promise<AboutResponseDto> {
    return this.aboutService.getAboutInfo();
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Verificar saúde da API',
    description: 'Endpoint de health check para monitoramento'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'API está saudável',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2024-01-29T14:30:00.000Z',
        uptime: 12345.67
      }
    }
  })
  @SkipThrottle()
  async getHealth() {
    const health = await this.aboutService.getHealth();
    if (health.status !== 'healthy') {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }

  @Get('version')
  @ApiOperation({ 
    summary: 'Obter versão da API',
    description: 'Retorna informações de versão e build'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Versão retornada com sucesso',
    schema: {
      example: {
        version: '1.0.0',
        build: '123',
        environment: 'production'
      }
    }
  })
  async getVersion() {
    return this.aboutService.getVersion();
  }

  @Get('ping')
  @ApiOperation({ 
    summary: 'Ping simples',
    description: 'Endpoint simples para verificar se a API está respondendo'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Pong!',
    schema: {
      example: {
        message: 'pong',
        timestamp: '2024-01-29T14:30:00.000Z'
      }
    }
  })
  async ping() {
    return {
      message: 'pong',
      timestamp: new Date()
    };
  }
}