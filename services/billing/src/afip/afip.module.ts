import { Module } from '@nestjs/common';
import { AfipService } from './afip.service';
import { AfipAuthService } from './afip-auth.service';
import { AfipBillingService } from './afip-billing.service';
import { AfipCpeService } from './afip-cpe.service';

@Module({
  providers: [AfipService, AfipAuthService, AfipBillingService, AfipCpeService],
  exports: [AfipService, AfipAuthService, AfipBillingService, AfipCpeService],
})
export class AfipModule {}
