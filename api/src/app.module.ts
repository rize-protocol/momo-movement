import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { CommonModule } from '@/common/common.module';
import { UserModule } from '@/user/user.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CommonModule, AuthModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
