import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve repository root relative to this script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');
const DOCS_ROOT = join(ROOT, 'docs');
const OUTPUT_FILE = join(ROOT, 'llms-full.txt');

// Canonical reading order matching Mintlify documentation navigation
const ORDERED_PAGES = [
  'getting-started/intro.mdx',
  'getting-started/quickstart.mdx',
  'concepts/manifesto.mdx',
  'concepts/specification.mdx',
  'concepts/logic-on-origin.mdx',
  'concepts/architecture.mdx',
  'concepts/server-concepts.mdx',
  'concepts/client-concepts.mdx',
  'concepts/wasi-sandboxing.mdx',
  'concepts/zero-trust.mdx',
  'typescript-sdk/overview.mdx',
  'typescript-sdk/agent.mdx',
  'typescript-sdk/client.mdx',
  'typescript-sdk/server.mdx',
  'typescript-sdk/gateway.mdx',
  'typescript-sdk/economy.mdx',
  'typescript-sdk/security.mdx',
  'mesh-node/overview.mdx',
  'mesh-node/compilation.mdx',
  'ROADMAP_GLOBAL_MESH.md',
];

async function generateLlmsFull(): Promise<void> {
  const sections: string[] = [];

  for (const page of ORDERED_PAGES) {
    const filePath = join(DOCS_ROOT, page);
    if (!existsSync(filePath)) {
      console.warn(`[WARN] Page not found: ${filePath}`);
      continue;
    }

    const content = await readFile(filePath, 'utf-8');
    const title = page.replace(/\.(mdx|md)$/, '').replace(/[/_-]/g, ' ').toUpperCase();

    sections.push(`\n---\n\n# SECTION: ${title} (${page})\n\n${content.trim()}\n`);
  }

  const header = `# LIOP (Logic-Injection-on-Origin Protocol) — Full Documentation Corpus

> Canonical, complete technical documentation for LIOP. This document concatenates all architectural specifications, SDK interfaces, security protocols, and operational guidelines into a single high-density context document for Large Language Models and autonomous coding agents.

- **Repository**: https://github.com/Nekzus/LIOP
- **NPM Package**: \`@nekzus/liop\` (TypeScript SDK)
- **Live Documentation**: https://nekzus-32.mintlify.app/
- **DeepWiki AI Knowledge**: https://deepwiki.com/Nekzus/LIOP
- **License**: Apache-2.0
`;

  const fullCorpus = `${header}\n${sections.join('\n')}\n`;
  await writeFile(OUTPUT_FILE, fullCorpus, 'utf-8');
  console.log(`[OK] Successfully generated ${OUTPUT_FILE} (${Buffer.byteLength(fullCorpus, 'utf-8')} bytes, ${sections.length} sections)`);
}

generateLlmsFull().catch((err) => {
  console.error('[ERROR] Failed to generate llms-full.txt:', err);
  process.exit(1);
});
