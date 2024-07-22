// eslint-disable-next-line import/no-extraneous-dependencies
import { esbuildDecorators } from '@anatine/esbuild-decorators';
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  splitting: false,
  sourcemap: true,
  target: 'es2022',
  esbuildPlugins: [esbuildDecorators()],
});
