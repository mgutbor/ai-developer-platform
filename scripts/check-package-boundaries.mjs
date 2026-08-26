import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rules = [
  {
    directory: resolve(scriptDirectory, '../packages/domain/src'),
    forbidden:
      /(?:from|import\s*\()["'][^"']*(?:angular|fastify|github|sqlite|openai|node:(?:fs|path|http|https|net|tls|child_process|vm)|browser)[^"']*["']/i,
    label: 'domain',
  },
  {
    directory: resolve(scriptDirectory, '../packages/github/src'),
    forbidden:
      /(?:from|import\s*\()["'][^"']*(?:angular|fastify|sqlite|openai|node:(?:fs|path|http|https|net|tls|child_process|vm)|browser)[^"']*["']/i,
    label: 'github',
  },
];

async function findTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findTypeScriptFiles(path)));
    } else if (entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

for (const rule of rules) {
  for (const file of await findTypeScriptFiles(rule.directory)) {
    const content = await readFile(file, 'utf8');
    if (rule.forbidden.test(content)) {
      throw new Error(`Forbidden infrastructure import found in ${rule.label}: ${file}`);
    }
  }
}

stdout.write('Package dependency boundary check passed\n');
