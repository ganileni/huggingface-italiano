export const normalise = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it');

export function filterQuotes(quotes, { search = '', agent = '', type = '', source = '' } = {}) {
  const words = normalise(search).trim().split(/\s+/).filter(Boolean);
  return quotes.filter(q => (!agent || q.agent === agent)
    && (!type || q.type === type) && (!source || q.sourceId === source)
    && words.every(word => normalise([q.original, q.italian, q.agent, q.context, ...(q.tags || [])].join(' ')).includes(word)));
}

export function safeExternalUrl(url) {
  try { const result = new URL(url); return /^https?:$/.test(result.protocol) ? result.href : null; }
  catch { return null; }
}

export function validateContent(content) {
  const errors = [];
  if (content?.meta?.language !== 'it') errors.push('La lingua deve essere it.');
  if (!content?.meta?.title) errors.push('Titolo mancante.');
  for (const key of ['milestones', 'chapters', 'quotes', 'sources', 'glossary']) {
    if (!Array.isArray(content?.[key])) errors.push(`Manca l’array ${key}.`);
  }
  if (errors.length) return errors;
  const sources = new Set(content.sources.map(s => s.id));
  for (const source of content.sources) if (!safeExternalUrl(source.url)) errors.push(`URL non valido: ${source.id}`);
  for (const key of ['quotes', 'chapters', 'milestones', 'sources']) {
    const ids = content[key].map(x => x.id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) errors.push(`Identificativi mancanti o duplicati: ${key}`);
  }
  for (const quote of content.quotes) {
    if (!sources.has(quote.sourceId)) errors.push(`Fonte sconosciuta: ${quote.id}`);
    if (!quote.original || !quote.italian || !quote.agent || !quote.type) errors.push(`Citazione incompleta: ${quote.id}`);
    if (!['da-rivedere', 'rivista'].includes(quote.status)) errors.push(`Stato di revisione mancante: ${quote.id}`);
  }
  for (const chapter of content.chapters) {
    if (!chapter.title || !Array.isArray(chapter.paragraphs) || chapter.paragraphs.some(p => typeof p !== 'string')) errors.push(`Capitolo incompleto: ${chapter.id}`);
  }
  return errors;
}

export function validateForPublication(content, { allowPreview = false } = {}) {
  const errors = validateContent(content);
  if (allowPreview) return errors;
  if (content.meta.permission !== 'concessa') errors.push('Autorizzazione alla riproduzione integrale in attesa.');
  if (!content.chapters.length) errors.push('La traduzione dei capitoli non è ancora presente.');
  if (!content.quotes.length) errors.push('L’archivio delle citazioni non è ancora presente.');
  if (content.quotes.some(q => q.status !== 'rivista')) errors.push('Esistono citazioni ancora da rivedere.');
  return errors;
}
