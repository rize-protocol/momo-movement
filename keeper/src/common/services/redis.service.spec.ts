import { INestApplication } from '@nestjs/common';

import { CommonModule } from '@/common/common.module';
import { RedisService } from '@/common/services/redis.service';
import { TestHelper } from '@/test-utils/helper';

describe('cache service', () => {
  let app: INestApplication;

  let cacheService: RedisService;

  beforeAll(async () => {
    const res = await TestHelper.build({ imports: [CommonModule], providers: [RedisService] });
    app = res.app;

    cacheService = res.modules.get<RedisService>(RedisService);
    if (!cacheService) {
      throw new Error('Failed to initialize TestCacheCaller');
    }
    cacheService.flushall();
  });

  afterAll(async () => {
    await app.close();
  });

  it('test cache', async () => {
    const key1 = 'key1';
    let val1 = await cacheService.get(key1);
    expect(val1).toBeNull();

    await cacheService.set(key1, 'val1');
    val1 = await cacheService.get(key1);
    expect(val1).toBe('val1');
  });

  it('lock', async () => {
    const startTime = new Date().getTime();
    const parallelNum = 4;
    await Promise.all(
      Array.from({ length: parallelNum }).map(async () => {
        try {
          const lock = await cacheService.acquireLock('rize-uniq-id', 5000);
          await TestHelper.sleep(0.5);
          await lock.release();
        } catch (e) {
          throw new Error(`unexpected error: ${e}`);
        }
      }),
    );
    const endTime = new Date().getTime();
    const executeTime = endTime - startTime;
    expect(executeTime).toBeGreaterThan(parallelNum * 500);
  });
});
