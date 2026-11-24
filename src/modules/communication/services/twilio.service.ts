import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {Twilio} from 'twilio';

@Injectable()
export class TwilioService implements OnModuleInit {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: Twilio;
  private twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER')!;

    if (!accountSid || !authToken || !this.twilioPhoneNumber) {
      this.logger.warn('Twilio configuration is incomplete. SMS service will be disabled.');
      return; // Serviço fica desabilitado, mas não quebra a aplicação
    }

    this.twilioClient = new Twilio(accountSid, authToken);
    this.logger.log('Twilio SMS service initialized.');
  }

  async sendSms(toPhoneNumber: string, message: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.error('Twilio client is not initialized. Check your environment variables.');
      return false;
    }

    try {
      // Formatar número para E.164, se necessário [citation:10]
      const formattedTo = toPhoneNumber.startsWith('+') ? toPhoneNumber : `+${toPhoneNumber}`;

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: formattedTo,
      });
      this.logger.log(`SMS sent successfully to ${formattedTo}. SID: ${result.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${toPhoneNumber}:`, error.message);
      return false;
    }
  }
}