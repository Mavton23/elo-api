import { Injectable, Logger } from '@nestjs/common';
import { TwilioService } from './twilio.service';
import { SendGridService } from './sendgrid.service'; // Alterado para SendGrid

export enum ContactMethod {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

interface SendResult {
  method: ContactMethod;
  success: boolean;
  message?: string;
  error?: any;
}

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);

  constructor(
    private readonly twilioService: TwilioService,
    private readonly sendGridService: SendGridService, // Alterado para SendGrid
  ) {}

  async sendOtp(
    otpCode: string,
    userPhoneNumber?: string,
    userEmail?: string,
    preferredMethod?: ContactMethod,
    userName?: string // Adicionado para personalizar email
  ): Promise<{ 
    success: boolean; 
    methodsUsed: ContactMethod[];
    results: SendResult[];
    message?: string;
  }> {
    const results: SendResult[] = [];
    const methodsUsed: ContactMethod[] = [];

    const smsMessage = `Seu código de verificação do Ministério do Interior é: ${otpCode}. Não compartilhe.`;

    // Definir quais métodos usar
    const tasks: Array<{method: ContactMethod, execute: () => Promise<SendResult>}> = [];

    // Adicionar tarefa de SMS se apropriado
    if (userPhoneNumber && 
        (preferredMethod === ContactMethod.SMS || 
         preferredMethod === ContactMethod.BOTH || 
         !preferredMethod)) {
      tasks.push({
        method: ContactMethod.SMS,
        execute: async (): Promise<SendResult> => {
          try {
            const success = await this.twilioService.sendSms(userPhoneNumber, smsMessage);
            const result: SendResult = {
              method: ContactMethod.SMS,
              success,
              message: success ? 'SMS enviado com sucesso' : 'Falha ao enviar SMS'
            };
            this.logResult(result, userPhoneNumber);
            return result;
          } catch (error: any) {
            const result: SendResult = {
              method: ContactMethod.SMS,
              success: false,
              message: `Erro ao enviar SMS: ${error.message}`,
              error
            };
            this.logResult(result, userPhoneNumber);
            return result;
          }
        }
      });
    }

    // Adicionar tarefa de Email se apropriado
    if (userEmail && 
        (preferredMethod === ContactMethod.EMAIL || 
         preferredMethod === ContactMethod.BOTH || 
         !preferredMethod)) {
      tasks.push({
        method: ContactMethod.EMAIL,
        execute: async (): Promise<SendResult> => {
          try {
            // Usando o método especializado para OTP
            const success = await this.sendGridService.sendOtpEmail(
              userEmail, 
              otpCode, 
              userName
            );
            
            const result: SendResult = {
              method: ContactMethod.EMAIL,
              success,
              message: success ? 'Email enviado com sucesso' : 'Falha ao enviar email'
            };
            this.logResult(result, userEmail);
            return result;
          } catch (error: any) {
            const result: SendResult = {
              method: ContactMethod.EMAIL,
              success: false,
              message: `Erro ao enviar email: ${error.message}`,
              error
            };
            this.logResult(result, userEmail);
            return result;
          }
        }
      });
    }

    // Executar todas as tarefas em paralelo
    if (tasks.length === 0) {
      const errorMsg = 'Nenhum método de contato disponível para enviar o OTP.';
      this.logger.warn(errorMsg);
      return {
        success: false,
        methodsUsed: [],
        results: [],
        message: errorMsg
      };
    }

    // Executar em paralelo
    const executionResults = await Promise.all(tasks.map(task => task.execute()));
    
    // Coletar resultados
    executionResults.forEach(result => {
      results.push(result);
      methodsUsed.push(result.method);
    });

    const atLeastOneSuccess = results.some(r => r.success);
    const successfulMethods = results.filter(r => r.success).map(r => r.method);

    return {
      success: atLeastOneSuccess,
      methodsUsed,
      results,
      message: atLeastOneSuccess 
        ? `OTP enviado via: ${successfulMethods.join(', ')}`
        : 'Falha ao enviar OTP por todos os métodos disponíveis.'
    };
  }

  private logResult(result: SendResult, contact: string): void {
    if (result.success) {
      this.logger.log(`OTP enviado via ${result.method} para ${contact}: ${result.message}`);
      
      // Log especial para desenvolvimento
      if (process.env.NODE_ENV === 'development' && result.method === ContactMethod.EMAIL) {
      }
    } else {
      this.logger.error(`Falha no envio via ${result.method} para ${contact}: ${result.message}`, result.error);
    }
  }

  async sendOtpToAllMethods(
    otpCode: string,
    userPhoneNumber?: string,
    userEmail?: string,
    userName?: string
  ): Promise<{ 
    success: boolean; 
    methodsUsed: ContactMethod[];
    results: SendResult[];
  }> {
    return this.sendOtp(otpCode, userPhoneNumber, userEmail, ContactMethod.BOTH, userName);
  }

  // Método para testar conexão com serviços
  async testServices(): Promise<{
    sendGrid: { success: boolean; message: string };
    twilio: { success: boolean; message: string };
  }> {
    const sendGridTest = await this.sendGridService.testConnection();
    
    const twilioTest = {
      success: false,
      message: 'Twilio não configurado para testes'
    };
    
    // Você pode adicionar teste do Twilio se quiser
    
    return {
      sendGrid: sendGridTest,
      twilio: twilioTest
    };
  }
}