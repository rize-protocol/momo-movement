import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

@Injectable()
export class TestService {
  constructor(@InjectEntityManager() public readonly entityManager: EntityManager) {}

  async clear() {
    const entities = this.entityManager.connection.entityMetadatas;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const repo = this.entityManager.getRepository(entity.name);
      await repo.clear();
    }
  }

  async tryCreateUser(telegramId: number) {
    const exists = await this.entityManager.findOneBy(User, { telegramId });
    if (exists) {
      return exists;
    }

    const user: User = {
      telegramId,
      accountHash: 'hash',
      resourceAddress: `resource-${telegramId}`,
    };
    await this.entityManager.insert(User, user);
    return user;
  }

  generateTelegramId() {
    return Math.floor(new Date().getTime() / 1000);
  }

  private randomFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
