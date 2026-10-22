import { defineConfig } from 'tsup';
import swc from 'unplugin-swc';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Bundle workspace packages; keep node_modules dependencies external.
  noExternal: [/^@fit\//],
  // esbuild lacks emitDecoratorMetadata; swc provides it for Nest DI.
  plugins: [
    swc.esbuild({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
      module: { type: 'es6' },
    }),
  ],
});
