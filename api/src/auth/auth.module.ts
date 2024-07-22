import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from '@/auth/auth.service';
import { CommonModule } from '@/common/common.module';
import { UserModule } from '@/user/user.module';

import { AuthGuard } from './auth.guard';

@Module({
  imports: [CommonModule, UserModule],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
