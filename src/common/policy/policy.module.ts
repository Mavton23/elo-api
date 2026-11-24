import { Global, Module } from '@nestjs/common';
import { SystemPolicyService } from './system-policy.service';

@Global()
@Module({ providers: [SystemPolicyService], exports: [SystemPolicyService] })
export class PolicyModule {}
