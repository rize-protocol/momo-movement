import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Entities from 'movement-gaming-model';

import { loadConfig } from '@/common/config/load';
import { getDatabaseConfig } from '@/common/database/config';
import { MetricsService } from '@/common/services/metrics.service';
import { RedisService } from '@/common/services/redis.service';
import { SecretManagerService } from '@/common/services/secret-manager.service';
import { TimeService } from '@/common/services/time.service';

@Module({
  providers: [SecretManagerService],
  exports: [SecretManagerService],
})
export class SecretManagerModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, SecretManagerModule],
      inject: [ConfigService, SecretManagerService],
      useFactory: async (configService: ConfigService, secretManagerService: SecretManagerService) => ({
        ...(await getDatabaseConfig(configService, secretManagerService)),
        entities: [`${__dirname}/../**/*.entity.ts`],
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature(Object.values(Entities)),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  providers: [ConfigService, SecretManagerService, TimeService, RedisService, MetricsService],
  exports: [ConfigService, SecretManagerService, TimeService, RedisService, MetricsService, HttpModule],
})
export class CommonModule {}
