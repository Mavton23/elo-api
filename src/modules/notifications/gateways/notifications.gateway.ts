import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '@/modules/auth/guards/ws-jwt.guard';
import { Notification } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUserLoader } from '@/modules/auth/services/auth-user-loader.service';

const wsOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    // App nativa não envia Origin; navegadores só a partir de origens autorizadas
    origin: process.env.NODE_ENV === 'production' ? wsOrigins : true,
    credentials: true,
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authUserLoader: AuthUserLoader,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      // Extrair e validar token JWT
      const token = this.extractTokenFromSocket(socket);
      
      if (!token) {
        this.logger.warn('Conexão WebSocket recusada: token não fornecido');
        socket.disconnect();
        return;
      }

      // Verificar token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Mesmo controlo que o HTTP: conta ativa, token não revogado
      const authUser = await this.authUserLoader.load(payload, 'access');
      const userId = authUser.id;

      if (!userId) {
        this.logger.warn('Conexão WebSocket recusada: userId não encontrado no token');
        socket.disconnect();
        return;
      }

      // Registrar socket do usuário
      this.registerUserSocket(userId, socket.id);
      
      // Adicionar dados do usuário ao socket
      socket.data.userId = userId;
      socket.data.user = authUser;
      
      // Juntar o usuário à sua sala pessoal
      socket.join(`user:${userId}`);
      
      // Juntar também a salas baseadas em departamento/patente
      socket.join(`dept:${authUser.department}`);
      socket.join(`rank:${authUser.memberRank}`);
      
      this.logger.log(`Usuário ${userId} conectado ao WebSocket (socket: ${socket.id})`);
      
      // Enviar confirmação de conexão
      socket.emit('connected', { 
        userId, 
        timestamp: new Date().toISOString() 
      });
      
    } catch (error) {
      this.logger.error('Erro na conexão WebSocket:', error);
      socket.emit('error', { message: 'Falha na autenticação' });
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data?.userId;
    
    if (userId) {
      // Encontrar e remover socket
      const socketIds = this.userSockets.get(userId);
      if (socketIds) {
        const index = socketIds.indexOf(socket.id);
        if (index > -1) {
          socketIds.splice(index, 1);
          
          if (socketIds.length === 0) {
            this.userSockets.delete(userId);
          }
          
          this.logger.log(`Usuário ${userId} desconectado (socket: ${socket.id})`);
        }
      }
    } else {
      this.logger.log(`Socket desconectado sem userId: ${socket.id}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket) {
    socket.emit('pong', { 
      timestamp: new Date().toISOString(),
      userId: socket.data.userId 
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() socket: Socket) {
    const userId = socket.data.userId;
    
    // Aqui você pode buscar do banco ou manter em cache
    // Por simplicidade, vamos retornar um valor mock
    socket.emit('unread-count', {
      userId,
      count: 0, // Seria buscado do banco
      timestamp: new Date().toISOString(),
    });
  }

  async sendToRecipients(notification: Notification, recipientIds: string[]) {
    const notificationData = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      urgency: notification.urgency,
      senderId: notification.senderId,
      createdAt: notification.createdAt.toISOString(),
      requiresConfirmation: notification.requiresConfirmation,
    };

    // Enviar para cada destinatário conectado
    for (const userId of recipientIds) {
      const userSockets = this.userSockets.get(userId);
      if (userSockets && userSockets.length > 0) {
        this.server.to(`user:${userId}`).emit('new-notification', {
          ...notificationData,
          recipientId: userId,
        });
        
        this.logger.debug(
          `Notificação ${notification.id} enviada para usuário ${userId}`
        );
      }
    }
  }

  async emitNotificationUpdate(userId: string, notificationId: string, status: string) {
    this.server.to(`user:${userId}`).emit('notification-updated', {
      notificationId,
      status,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async emitAllRead(userId: string) {
    this.server.to(`user:${userId}`).emit('all-notifications-read', {
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  async sendToDepartment(department: string, data: any) {
    this.server.to(`dept:${department}`).emit('department-notification', {
      ...data,
      department,
      timestamp: new Date().toISOString(),
    });
  }

  async sendToRank(rank: string, data: any) {
    this.server.to(`rank:${rank}`).emit('rank-notification', {
      ...data,
      rank,
      timestamp: new Date().toISOString(),
    });
  }

  private extractTokenFromSocket(socket: Socket): string | null {
    // Tentar obter o token de várias formas:
    
    // 1. Do cabeçalho de autorização
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. Do objeto de autenticação do handshake
    if (socket.handshake.auth?.token) {
      return socket.handshake.auth.token;
    }

    // 3. Do query string
    if (socket.handshake.query?.token) {
      return socket.handshake.query.token as string;
    }

    return null;
  }

  private registerUserSocket(userId: string, socketId: string): void {
    let socketIds = this.userSockets.get(userId);

    if (!socketIds) {
      socketIds = [];
      this.userSockets.set(userId, socketIds);
    }

    socketIds.push(socketId);
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  getUserSockets(userId: string): string[] {
    return this.userSockets.get(userId) || [];
  }

  isUserConnected(userId: string): boolean {
    const socketIds = this.userSockets.get(userId);
    return !!socketIds && socketIds.length > 0;
  }
}