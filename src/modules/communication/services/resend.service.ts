import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private resendClient: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resendClient = new Resend(apiKey);
      this.logger.log('Resend email service initialized.');
    } else {
      this.logger.warn('RESEND_API_KEY not found. Email service will be disabled.');
    }
  }

  async sendEmail(to: string, subject: string, htmlContent: string, fromName: string = 'Ministério do Interior'): Promise<boolean> {
  if (!this.resendClient) {
    this.logger.error('Resend client is not initialized.');
    return false;
  }

  try {
    // TEMPORÁRIO: Use seu email pessoal como remetente para testes
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
    let fromEmail: string;
    
    if (isDevelopment) {
      // Use seu email pessoal para testes
      fromEmail = 'nordinomaviedeveloper@gmail.com'; // SEU EMAIL
      this.logger.warn(`Modo desenvolvimento: enviando de ${fromEmail} para ${to}`);
    } else {
      // Em produção, use um domínio verificado
      fromEmail = 'no-reply@seu-dominio.gov.mz'; // DOMÍNIO VERIFICADO
    }
    
    const from = `${fromName} <${fromEmail}>`;

    const { data, error } = await this.resendClient.emails.send({
      from,
      to,
      subject,
      html: htmlContent,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      return false;
    }

    this.logger.log(`Email sent successfully to ${to}. ID: ${data?.id}`);
    return true;
  } catch (error) {
    this.logger.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
}
}