import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationTasksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationTasksService.name);
  private dailyCleanupInterval: NodeJS.Timeout;
  private hourlyRemindersInterval: NodeJS.Timeout;
  private wsCleanupInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('Inicializando tarefas agendadas...');
    
    // Agendar limpeza diária à meia-noite
    this.scheduleDailyCleanup();
    
    // Agendar lembretes a cada hora
    this.startHourlyReminders();
    
    // Agendar limpeza de WebSocket a cada 5 minutos
    this.startWsCleanup();
  }

  onModuleDestroy() {
    this.logger.log('Parando tarefas agendadas...');
    
    if (this.dailyCleanupInterval) {
      clearInterval(this.dailyCleanupInterval);
    }
    if (this.hourlyRemindersInterval) {
      clearInterval(this.hourlyRemindersInterval);
    }
    if (this.wsCleanupInterval) {
      clearInterval(this.wsCleanupInterval);
    }
  }

  /**
   * Agenda a execução diária à meia-noite
   */
  private scheduleDailyCleanup() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Próxima meia-noite
    
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    this.logger.log(`Agendando limpeza diária em ${msUntilMidnight}ms (${Math.round(msUntilMidnight/1000/60)} minutos)`);
    
    // Executar na próxima meia-noite
    setTimeout(() => {
      // Executar imediatamente
      this.cleanUpExpiredNotifications();
      
      // Agendar para rodar a cada 24 horas
      this.dailyCleanupInterval = setInterval(() => {
        this.cleanUpExpiredNotifications();
      }, 24 * 60 * 60 * 1000); // 24 horas
      
    }, msUntilMidnight);
  }

  /**
   * Inicia lembretes a cada hora
   */
  private startHourlyReminders() {
    this.logger.log('Iniciando lembretes horários...');
    
    // Calcular até a próxima hora cheia
    const now = new Date();
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    
    const msUntilNextHour = nextHour.getTime() - now.getTime();
    
    setTimeout(() => {
      // Executar na próxima hora cheia
      this.sendConfirmationReminders();
      
      // Agendar para rodar a cada hora
      this.hourlyRemindersInterval = setInterval(() => {
        this.sendConfirmationReminders();
      }, 60 * 60 * 1000); // 1 hora
      
    }, msUntilNextHour);
  }

  /**
   * Inicia limpeza de WebSocket a cada 5 minutos
   */
  private startWsCleanup() {
    this.logger.log('Iniciando limpeza de WebSocket (a cada 5 minutos)...');
    
    // Executar imediatamente
    this.cleanupDisconnectedWebSockets();
    
    // Agendar para rodar a cada 5 minutos
    this.wsCleanupInterval = setInterval(() => {
      this.cleanupDisconnectedWebSockets();
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Limpa notificações expiradas
   */
  async cleanUpExpiredNotifications() {
    this.logger.log('Iniciando limpeza de notificações expiradas...');
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.notification.deleteMany({
        where: {
          AND: [
            { expiresAt: { not: null } },
            { expiresAt: { lt: new Date() } },
            { createdAt: { lt: thirtyDaysAgo } },
          ],
        },
      });

      this.logger.log(`Limpeza concluída: ${result.count} notificações expiradas removidas`);
    } catch (error) {
      this.logger.error(`Erro na limpeza de notificações: ${error.message}`, error.stack);
    }
  }

  /**
   * Envia lembretes de confirmação
   */
  async sendConfirmationReminders() {
    this.logger.log('Enviando lembretes de confirmação...');

    try {
      const twentyFourHoursFromNow = new Date();
      twentyFourHoursFromNow.setHours(twentyFourHoursFromNow.getHours() + 24);

      const notificationsNeedingReminder = await this.prisma.notification.findMany({
        where: {
          requiresConfirmation: true,
          confirmationDeadline: {
            lte: twentyFourHoursFromNow,
            gt: new Date(),
          },
        },
        include: {
          recipients: {
            where: {
              status: 'NAO_LIDA',
            },
            include: {
              user: true,
            },
          },
        },
      });

      // TODO: Implementar envio de emails ou notificações push
      if (notificationsNeedingReminder.length > 0) {
        this.logger.log(
          `Encontradas ${notificationsNeedingReminder.length} notificações necessitando de lembretes`
        );
        
        // Exemplo: log detalhado para debug
        notificationsNeedingReminder.forEach((notification, index) => {
          this.logger.debug(
            `Notificação ${index + 1}: ID ${notification.id}, ` +
            `Prazo: ${notification.confirmationDeadline}, ` +
            `Recipientes: ${notification.recipients.length}`
          );
        });
      } else {
        this.logger.log('Nenhuma notificação precisa de lembrete no momento.');
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar lembretes: ${error.message}`, error.stack);
    }
  }

  /**
   * Limpa conexões WebSocket antigas
   */
  async cleanupDisconnectedWebSockets() {
    try {
      this.logger.debug('Verificando conexões WebSocket...');
      
      // TODO: Implementar lógica de limpeza de WebSocket
      // Exemplo: Verificar conexões inativas há mais de X minutos
      // const inactiveThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos
      
      this.logger.debug('Verificação de WebSocket concluída');
    } catch (error) {
      this.logger.error(`Erro na limpeza de WebSocket: ${error.message}`, error.stack);
    }
  }

  /**
   * Métodos para controle manual (opcional)
   */
  async triggerManualCleanup() {
    this.logger.log('Limpeza manual acionada...');
    await this.cleanUpExpiredNotifications();
  }

  async triggerManualReminders() {
    this.logger.log('Lembretes manuais acionados...');
    await this.sendConfirmationReminders();
  }

  // getNextDailyCleanupTime(): Date {
  //   if (!this.dailyCleanupInterval) {
  //     return null;
  //   }
    
  //   const now = new Date();
  //   const nextMidnight = new Date();
  //   nextMidnight.setHours(24, 0, 0, 0);
    
  //   return nextMidnight;
  // }
}