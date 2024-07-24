import { Controller, Get, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { Registration } from '@/common/decorators/auth.decorator';
import { CurrentTelegramId, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserService } from '@/user/user.service';

@Controller('user')
export class UserController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly userService: UserService,
  ) {}

  @Get('info')
  async userInfo(@CurrentUser() telegramId: number) {
    return telegramId;
  }

  @Registration()
  @Post('create')
  async createUser(@CurrentTelegramId() telegramId: number) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.userService.createUser(telegramId, entityManager);
    });
  }
}