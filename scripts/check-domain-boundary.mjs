import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { stdout } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const domainSource = resolve(scriptDirectory, '../packages/domain/src');
const forbiddenImport =
  /(?:from|import\s*\()["'][^"']*(?:angular|fastify|github|sqlite|openai|node:fs|node:path|node:http|browser)[^"']*["']/i;

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

const files = await findTypeScriptFiles(domainSource);
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (forbiddenImport.test(content)) {
    throw new Error(`Forbidden infrastructure import found in ${file}`);
  }
}

stdout.write('Domain dependency boundary check passed\n');
