import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { UserService } from '@/user/user.service';

@Injectable()
export class TestService {
  constructor(
    @InjectEntityManager() public readonly entityManager: EntityManager,
    private readonly userService: UserService,
  ) {}

  async clear() {
    const entities = this.entityManager.connection.entityMetadatas;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const repo = this.entityManager.getRepository(entity.name);
      await repo.clear();
    }
  }

  async tryCreateUser(telegramId: string, referralCode: string) {
    let user = await this.userService.tryGetUserByTelegramId(telegramId, this.entityManager);
    if (!user) {
      await this.userService.createUser(telegramId, referralCode, this.entityManager);
      user = await this.userService.tryGetUserByTelegramId(telegramId, this.entityManager);
    }

    if (!user) {
      throw new Error('create user failed');
    }

    if (!user.resourceAddress) {
      user.resourceAddress = `testResourceAddress_${telegramId}`;
      await this.entityManager.save(user);
    }

    return user;
  }

  generateTelegramId(incr: number = 0) {
    const telegramId = Math.floor(new Date().getTime() / 1000);
    return (telegramId + incr).toString();
  }

  private randomFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
