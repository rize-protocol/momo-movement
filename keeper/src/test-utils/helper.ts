import { ModuleMetadata, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TestingModuleBuilder } from '@nestjs/testing/testing-module.builder';

export class TestHelper {
  static async build(metadata: ModuleMetadata, modifier?: (modules: TestingModuleBuilder) => TestingModuleBuilder) {
    let builder = Test.createTestingModule(metadata);
    if (modifier) {
      builder = modifier(builder);
    }
    const modules = await builder.compile();

    const app = modules.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    return {
      modules,
      app,
    };
  }

  static async sleep(sec: number) {
    return new Promise((r) => {
      setTimeout(r, sec * 1000);
    });
  }
}
