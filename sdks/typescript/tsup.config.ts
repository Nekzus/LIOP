import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.ts',
    server: 'src/server/index.ts',
    types: 'src/types.ts',
    bridge: 'src/bridge/index.ts',
    gateway: 'src/gateway/hybrid.ts',
    mesh: 'src/mesh/index.ts',
    'bin/agent': 'src/bin/agent.ts',
    'workers/logic-execution': 'src/workers/logic-execution.ts',
    'workers/zk-verifier': 'src/workers/zk-verifier.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: true,
  target: 'node20',
  splitting: true,
  treeshake: true,
  shims: true,
  skipNodeModulesBundle: true,
  outDir: 'dist',
});
