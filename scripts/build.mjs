import { mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateContent, validateForPublication } from '../src/core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const content = JSON.parse(await readFile(resolve(root, 'src/content.it.json'), 'utf8'));
const errors = process.argv.includes('--publish') ? validateForPublication(content) : validateContent(content);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const out = resolve(root, 'docs');
await rm(out, { recursive: true, force: true });
await mkdir(resolve(out, 'assets'), { recursive: true });
for (const file of ['app.mjs', 'core.mjs', 'style.css', 'content.it.json']) await copyFile(resolve(root, 'src', file), resolve(out, 'assets', file));
const pages = [['', 'story', 'Il caso Hugging Face'], ['quotes', 'quotes', 'Citazioni'], ['sources', 'sources', 'Fonti'], ['about', 'about', 'Il progetto'], ['print', 'print', 'Versione per la stampa']];
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for (const [folder, page, title] of pages) {
  const base = folder ? '../' : './';
  const nav = [['', 'Racconto'], ['quotes/', 'Citazioni'], ['sources/', 'Fonti'], ['about/', 'Il progetto']].map(([path, label]) => `<a href="${base}${path}"${(folder ? path === folder + '/' : path === '') ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const html = `<!doctype html>
<html lang="it" data-page="${page}" data-base="${base}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="robots" content="noindex,nofollow"><meta name="description" content="${esc(content.meta.description)}"><meta name="theme-color" content="#090c0f"><title>${esc(title)} · Edizione italiana in preparazione</title><link rel="stylesheet" href="${base}assets/style.css"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23090c0f'/%3E%3Cpath d='M8 8h6v6H8zm10 0h6v6h-6zM8 18h6v6H8zm10 0h6v6h-6z' fill='%23a9d7ec'/%3E%3C/svg%3E"><script type="module" src="${base}assets/app.mjs"></script></head>
<body><a class="skip" href="#main">Vai al contenuto</a><div class="notice"><span class="status-dot" aria-hidden="true"></span><span>${esc(content.meta.notice)}</span><a href="${base}about/">Dettagli <span aria-hidden="true">↗</span></a></div><header class="header"><a class="brand" href="${base}" aria-label="Il caso Hugging Face, pagina iniziale"><span class="brand-mark" aria-hidden="true">▦</span><span>Hugging Face <em>/ italiano</em></span></a><nav aria-label="Navigazione principale">${nav}</nav><a class="original-link" href="https://huggingface.wtf/" target="_blank" rel="noopener noreferrer" aria-label="Apri il sito originale in inglese in una nuova scheda">Originale <span aria-hidden="true">↗</span></a></header><main id="main"><div class="loading" role="status">Caricamento…</div></main><footer class="footer"><p>Progetto originale: <a href="https://www.lightconeinfrastructure.com/" target="_blank" rel="noopener noreferrer">Lightcone Infrastructure</a>.</p><p>Edizione italiana non ufficiale · Anteprima tecnica · 24 ottobre 2026</p></footer><noscript><p class="noscript">Questa anteprima interattiva richiede JavaScript. Puoi consultare <a href="https://huggingface.wtf/">il sito originale</a>.</p></noscript></body></html>`;
  await mkdir(resolve(out, folder), { recursive: true });
  await writeFile(resolve(out, folder, 'index.html'), html);
}
await writeFile(resolve(out, '.nojekyll'), '');
console.log('Esportate 5 pagine statiche in docs/. Stato: anteprima tecnica.');
