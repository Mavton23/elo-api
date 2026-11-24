import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid from '@sendgrid/mail';

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private isInitialized = false;
  private defaultFromEmail: string;
  private defaultFromName: string;

  constructor(private configService: ConfigService) {
    this.initializeSendGrid();
  }

  private initializeSendGrid(): void {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.defaultFromEmail = this.configService.get<string>('EMAIL_GRID_FROM', 'nordinomaviedeveloper@gmail.com');
    this.defaultFromName = this.configService.get<string>('EMAIL_FROM_NAME', 'ELO');

    if (!apiKey) {
      this.logger.warn('SENDGRID_API_KEY not found. Email service will be disabled.');
      return;
    }

    try {
      sendgrid.setApiKey(apiKey);
      this.isInitialized = true;
      this.logger.log('SendGrid email service initialized successfully.');
      
      // Log para verificar configuração (apenas em desenvolvimento)
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        this.logger.log(`SendGrid config: From ${this.defaultFromName} <${this.defaultFromEmail}>`);
      }
    } catch (error) {
      this.logger.error('Failed to initialize SendGrid:', error instanceof Error ? error.message : error);
    }
  }

  async sendEmail(
    to: string, 
    subject: string, 
    htmlContent: string, 
    fromName?: string,
    fromEmail?: string
  ): Promise<boolean> {
    if (!this.isInitialized) {
      this.logger.error('SendGrid client is not initialized.');
      return false;
    }

    try {
      const fromAddress = fromEmail || this.defaultFromEmail;
      const fromNameValue = fromName || this.defaultFromName;
      const from = `${fromNameValue} <${fromAddress}>`;

      const msg = {
        to,
        from,
        subject,
        html: htmlContent,
        // Opcional: versão em texto plano para clients que não suportam HTML
        text: this.extractTextFromHtml(htmlContent),
      };

      await sendgrid.send(msg);
      
      this.logger.log('Email enviado com sucesso');
      
      
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      
      // Log detalhado do erro
      if (error.response) {
        this.logger.error('SendGrid error details:', {
          statusCode: error.response.statusCode,
          body: error.response.body,
          headers: error.response.headers
        });
      }
      
      return false;
    }
  }

  async sendOtpEmail(
    to: string,
    otpCode: string,
    userName?: string
  ): Promise<boolean> {
    const subject = 'Seu Código de Verificação (2FA) - Ministério do Interior';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f7fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .otp-code { 
            font-size: 32px; 
            font-weight: bold; 
            text-align: center; 
            letter-spacing: 5px; 
            margin: 25px 0;
            padding: 15px;
            background-color: white;
            border-radius: 5px;
            border: 2px dashed #4299e1;
          }
          .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            font-size: 12px; 
            color: #718096;
          }
          .security-note { 
            background-color: #fff5f5; 
            padding: 15px; 
            border-radius: 5px; 
            border-left: 4px solid #f56565;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Ministério do Interior</h2>
        </div>
        <div class="content">
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Você solicitou acesso ao sistema do Ministério do Interior. Use o código abaixo para completar seu login:</p>
          
          <div class="otp-code">${otpCode}</div>
          
          <p>Este código é válido por <strong>5 minutos</strong>.</p>
          
          <div class="security-note">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Nunca compartilhe este código com ninguém</li>
              <li>O Ministério do Interior nunca solicitará seu código por telefone ou email</li>
              <li>Se você não solicitou este código, ignore este email</li>
            </ul>
          </div>
          
          <p>Atenciosamente,<br>
          <strong>Equipe do Ministério do Interior</strong></p>
        </div>
        <div class="footer">
          <p>Esta é uma mensagem automática. Por favor, não responda este email.</p>
          <p>© ${new Date().getFullYear()} Ministério do Interior. Todos os direitos reservados.</p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, subject, htmlContent);
  }

  private extractTextFromHtml(html: string): string {
    // Remove tags HTML e converte entidades HTML
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isInitialized) {
      return { success: false, message: 'SendGrid não inicializado' };
    }

    try {
      // Envia um email de teste para si mesmo
      const testEmail = this.defaultFromEmail;
      const testSubject = 'Teste de Conexão SendGrid - Ministério do Interior';
      const testHtml = '<p>Este é um email de teste para verificar a conexão com SendGrid.</p>';

      const result = await this.sendEmail(testEmail, testSubject, testHtml, 'Sistema de Teste');
      
      return { 
        success: result, 
        message: result 
          ? 'Conexão com SendGrid testada com sucesso' 
          : 'Falha ao enviar email de teste' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: `Erro no teste de conexão: ${error.message}` 
      };
    }
  }
}