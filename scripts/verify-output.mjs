import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../docs/', import.meta.url));
for (const page of ['index.html', 'quotes/index.html', 'sources/index.html', 'about/index.html', 'print/index.html']) {
  const path = resolve(root, page);
  const html = await readFile(path, 'utf8');
  assert(html.includes('lang="it"'), `${page}: lingua mancante`);
  assert(html.includes('noindex,nofollow'), `${page}: stato di bozza mancante`);
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (/^(https?:|data:|#)/.test(match[1])) continue;
    let target = resolve(dirname(path), match[1].split('#')[0]);
    const info = await stat(target);
    if (info.isDirectory()) target = resolve(target, 'index.html');
    assert((await stat(target)).isFile(), `${page}: collegamento non valido ${match[1]}`);
  }
}
console.log('Verificate le 5 pagine: lingua, stato di bozza e collegamenti interni.');
