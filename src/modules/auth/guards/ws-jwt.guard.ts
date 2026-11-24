import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromClient(client);
      
      if (!token) {
        throw new UnauthorizedException('Token não fornecido');
      }

      // Verificar e decodificar o token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Adicionar payload do usuário ao socket
      client.data.user = payload;
      client.data.userId = payload.sub;

      // Adicionar token à autenticação para reutilização
      client.handshake.auth = {
        ...client.handshake.auth,
        token,
        userId: payload.sub,
      };

      this.logger.debug(`Usuário autenticado via WebSocket: ${payload.sub}`);
      return true;
    } catch (error) {
      this.logger.error('Erro na autenticação WebSocket:', error);
      
      // Lançar exceção específica para WebSocket
      if (error instanceof UnauthorizedException) {
        throw new WsException('Autenticação falhou: ' + error.message);
      }
      
      throw new WsException('Erro de autenticação');
    }
  }

  private extractTokenFromClient(client: Socket): string | null {
    // Tentar obter o token de várias formas:
    
    // 1. Do cabeçalho de autorização
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Do objeto de autenticação do handshake
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    return null;
  }
}