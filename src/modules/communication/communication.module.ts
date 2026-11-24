import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommunicationService } from './services/communication.service';
import { TwilioService } from './services/twilio.service';
import { SendGridService } from './services/sendgrid.service';

@Module({
  imports: [ConfigModule],
  providers: [CommunicationService, TwilioService, SendGridService],
  exports: [CommunicationService]
})
export class CommunicationModule {}
