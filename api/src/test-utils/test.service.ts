import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
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

  private randomFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
