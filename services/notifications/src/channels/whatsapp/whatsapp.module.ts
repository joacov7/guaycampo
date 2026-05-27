import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { EvolutionProvider } from './evolution.provider';
import { TwilioProvider } from './twilio.provider';

@Module({
  providers: [WhatsAppService, EvolutionProvider, TwilioProvider],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
