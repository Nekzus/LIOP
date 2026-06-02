const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, '../CHANGELOG.md');

if (!fs.existsSync(changelogPath)) {
  console.error('Error: CHANGELOG.md not found at ' + changelogPath);
  process.exit(1);
}

console.log('Sanitizing CHANGELOG.md...');

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

const formattedBlocks = [];
for (const [ver, block] of uniqueBlocks) {
  const blockContent = block.content.join('\n').trim();
  if (blockContent) {
    formattedBlocks.push(`${block.header}\n\n${blockContent}`);
  } else {
    formattedBlocks.push(block.header);
  }
}

const finalContent = [
  header.join('\n').trim(),
  '',
  formattedBlocks.join('\n\n\n'),
  ''
].join('\n');

fs.writeFileSync(changelogPath, finalContent, 'utf8');
console.log('CHANGELOG.md has been sanitized and formatted successfully!');
