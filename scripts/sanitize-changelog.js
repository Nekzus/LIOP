import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const changelogPath = path.join(__dirname, '../CHANGELOG.md');

if (!fs.existsSync(changelogPath)) {
  console.error(`Error: CHANGELOG.md not found at ${changelogPath}`);
  process.exit(1);
}

// Auto-detect branch
let branch = '';
try {
  branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('Failed to detect git branch, defaulting to main.');
  branch = 'main';
}

console.log(`Sanitizing CHANGELOG.md for branch '${branch}'...`);

let content = fs.readFileSync(changelogPath, 'utf8');

// Remove git conflict markers
content = content.replace(/<<<<<<< HEAD\r?\n/g, '')
                 .replace(/<<<<<<< [a-zA-Z0-9_\-\/]+\r?\n/g, '')
                 .replace(/=======\r?\n/g, '')
                 .replace(/>>>>>>> [a-zA-Z0-9_\-\/]+\r?\n/g, '');

const lines = content.split(/\r?\n/);
const header = [];
const versionBlocks = [];
let currentBlock = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect version header format
  const isVersionHeader = line.startsWith('# [') || line.startsWith('## [') || line.startsWith('# 1.0.0') || line.startsWith('# 1.0.0-alpha');
  
  if (isVersionHeader) {
    if (currentBlock) {
      versionBlocks.push(currentBlock);
    }
    currentBlock = {
      header: line,
      content: []
    };
  } else {
    if (currentBlock) {
      currentBlock.content.push(line);
    } else {
      header.push(line);
    }
  }
}
if (currentBlock) {
  versionBlocks.push(currentBlock);
}

const uniqueBlocks = new Map();

for (const block of versionBlocks) {
  const verMatch = block.header.match(/\[([^\]]+)\]/) || block.header.match(/#\s+([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z0-9\.\-]*)/);
  if (verMatch) {
    const version = verMatch[1];
    if (!uniqueBlocks.has(version)) {
      uniqueBlocks.set(version, block);
    } else {
      console.log(`Warning: Found duplicate block for version ${version}. Merging entries...`);
      // Merge unique list items from both blocks
      const currentListItems = block.content.filter(l => l.trim().startsWith('* '));
      const existingContent = uniqueBlocks.get(version).content;
      
      for (const item of currentListItems) {
        if (!existingContent.includes(item)) {
          existingContent.push(item);
        }
      }
    }
  } else {
    uniqueBlocks.set(`unknown-${Math.random()}`, block);
  }
}

// Now filter uniqueBlocks based on the current branch
const filteredBlocks = [];
for (const [ver, block] of uniqueBlocks) {
  if (branch === 'beta') {
    // Keep only beta pre-releases
    if (ver.includes('-beta')) {
      filteredBlocks.push(block);
    }
  } else if (branch === 'alpha') {
    // Keep only alpha pre-releases
    if (ver.includes('-alpha')) {
      filteredBlocks.push(block);
    }
  } else {
    // main branch or others: keep only stable versions (no alpha, no beta)
    if (!ver.includes('-alpha') && !ver.includes('-beta')) {
      filteredBlocks.push(block);
    }
  }
}

const formattedBlocks = filteredBlocks.map(block => {
  const blockContent = block.content.join('\n').trim();
  if (blockContent) {
    return `${block.header}\n\n${blockContent}`;
  }
  return block.header;
});

const finalContent = [
  header.join('\n').trim(),
  '',
  formattedBlocks.join('\n\n\n'),
  ''
].join('\n');

fs.writeFileSync(changelogPath, finalContent, 'utf8');
console.log('CHANGELOG.md has been sanitized and formatted successfully!');
