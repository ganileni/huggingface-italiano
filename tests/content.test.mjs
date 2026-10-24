import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterQuotes, safeExternalUrl, validateContent, validateForPublication } from '../src/core.mjs';

const content = JSON.parse(await readFile(new URL('../src/content.it.json', import.meta.url), 'utf8'));
const quotes = [
  {id:'test-a', agent:'DEMO-A', type:'Ragionamento interno', original:'The shared workspace is available.', italian:'Lo spazio di lavoro condiviso è disponibile.', context:'Solo un esempio per il test.', sourceId:'metr', status:'rivista'},
  {id:'test-b', agent:'DEMO-B', type:'Messaggio', original:'Please check the result.', italian:'Controlla il risultato, per favore.', context:'Richiesta di verifica.', sourceId:'openai', status:'da-rivedere'}
];

test('la base dei contenuti è valida e le citazioni non sono inventate', () => {
  assert.deepEqual(validateContent(content), []);
  assert.deepEqual(content.quotes, []);
  assert.deepEqual(content.chapters, []);
});
test('ricerca bilingue, senza distinzione di accenti, con più parole', () => {
  assert.deepEqual(filterQuotes(quotes, {search:'condiviso e disponibile'}).map(q => q.id), ['test-a']);
  assert.deepEqual(filterQuotes(quotes, {search:'shared workspace'}).map(q => q.id), ['test-a']);
  assert.deepEqual(filterQuotes(quotes, {search:'demo-b risultato'}).map(q => q.id), ['test-b']);
});
test('i filtri si combinano senza perdere i vincoli', () => {
  assert.deepEqual(filterQuotes(quotes, {agent:'DEMO-B', type:'Messaggio', source:'openai'}).map(q => q.id), ['test-b']);
  assert.deepEqual(filterQuotes(quotes, {agent:'DEMO-B', source:'metr'}), []);
  assert.deepEqual(filterQuotes(quotes, {search:'inesistente'}), []);
});
test('i collegamenti esterni escludono protocolli eseguibili o locali', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///tmp/private', '/relative', 'not a url']) assert.equal(safeExternalUrl(url), null);
  assert.equal(safeExternalUrl('https://example.org/report'), 'https://example.org/report');
});
test('l’importazione rifiuta citazioni incomplete, fonti inesistenti e ID duplicati', () => {
  const valid = structuredClone(content); valid.quotes = quotes;
  assert.deepEqual(validateContent(valid), []);
  const bad = structuredClone(valid);
  bad.quotes[0].sourceId = 'sconosciuta';
  bad.quotes[1].id = 'test-a';
  bad.quotes[1].italian = '';
  const errors = validateContent(bad);
  assert(errors.some(e => e.includes('Fonte sconosciuta')));
  assert(errors.some(e => e.includes('duplicati')));
  assert(errors.some(e => e.includes('incompleta')));
});
test('la bozza non viene presentata come traduzione completa pronta alla pubblicazione', () => {
  const errors = validateForPublication(content);
  assert(errors.some(e => e.includes('Autorizzazione')));
  assert(errors.some(e => e.includes('capitoli')));
  assert.deepEqual(validateForPublication(content, {allowPreview:true}), []);
});
test('la pubblicazione completa richiede citazioni riviste e capitoli presenti', () => {
  const ready = structuredClone(content);
  ready.meta.permission = 'concessa';
  ready.chapters = [{id:'prova',title:'Capitolo di prova',paragraphs:['Contenuto originale scritto solo per il test.']}];
  ready.quotes = [quotes[0]];
  assert.deepEqual(validateForPublication(ready), []);
  ready.quotes = quotes;
  assert(validateForPublication(ready).some(e => e.includes('rivedere')));
});
