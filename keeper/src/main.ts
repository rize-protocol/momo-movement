import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const instanceId = parseInt(process.env.INSTANCE_ID ?? '0', 10);
  console.log(`keeper runs on instance id: ${instanceId}`);
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
}
bootstrap();
