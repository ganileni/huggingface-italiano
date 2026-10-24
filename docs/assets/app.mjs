import { filterQuotes, safeExternalUrl, validateContent } from './core.mjs';

const root = document.querySelector('#main');
const base = document.documentElement.dataset.base;
const page = document.documentElement.dataset.page;
const h = (tag, attrs = {}, ...children) => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else if (key.startsWith('on')) element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== null && value !== false) element.setAttribute(key, String(value));
  }
  for (const child of children.flat(Infinity)) if (child !== null && child !== undefined) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  return element;
};
const external = (url, text, attrs = {}) => {
  const safe = safeExternalUrl(url);
  return safe ? h('a', { href: safe, target: '_blank', rel: 'noopener noreferrer', ...attrs }, text) : h('span', {}, text);
};
const icon = value => h('span', { 'aria-hidden': 'true' }, value);

let content;
try {
  const response = await fetch(`${base}assets/content.it.json`);
  if (!response.ok) throw new Error('Caricamento non riuscito');
  content = await response.json();
  if (validateContent(content).length) throw new Error('Contenuti non validi');
} catch {
  root.replaceChildren(h('section', { class: 'page-head' }, h('p', { class: 'eyebrow' }, 'Caricamento non riuscito'), h('h1', {}, 'La pagina non è disponibile.'), h('p', {}, 'Ricarica la pagina per riprovare. '), external('https://huggingface.wtf/', 'Apri il sito originale ↗')));
}

function makeDialog(title, body, label = 'Approfondimento') {
  const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dialog-title' });
  const close = h('button', { class: 'icon-button', type: 'button', 'aria-label': 'Chiudi finestra', onClick: () => dialog.close() }, '×');
  dialog.append(h('div', { class: 'dialog-top' }, h('p', { class: 'eyebrow' }, label), close), h('h2', { id: 'dialog-title' }, title), h('p', {}, body));
  dialog.addEventListener('click', event => { if (event.target === dialog && (event.clientX < dialog.getBoundingClientRect().left || event.clientX > dialog.getBoundingClientRect().right || event.clientY < dialog.getBoundingClientRect().top || event.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

// Original decorative grid. Its positions and colours are synthetic, not incident data.
function drawGrid(canvas, phase = 3, hero = false) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const box = canvas.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(box.width * dpr); canvas.height = Math.round(box.height * dpr);
  context.scale(dpr, dpr);
  const unit = hero ? 15 : 12;
  const cols = Math.ceil(box.width / unit);
  const rows = Math.ceil(box.height / unit);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const seed = (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
    const n = Math.abs(seed);
    const centre = Math.exp(-((x / cols - .65) ** 2 + (y / rows - .52) ** 2) * 3);
    const lit = n > 1 - (.02 + phase * .012) * centre;
    const size = n > .98 ? unit * .73 : n > .84 ? unit * .64 : unit * .49;
    const pink = y / rows > .79;
    context.fillStyle = lit ? (pink ? '#d6a8c3' : '#c2e9fb') : (pink ? '#211a22' : '#15232e');
    context.globalAlpha = lit ? .5 + n * .5 : .35 + centre * .3;
    if (lit) { context.shadowColor = pink ? '#ae6e93' : '#8fdcff'; context.shadowBlur = 12; }
    context.fillRect(x * unit, y * unit, size, size);
    context.shadowBlur = 0;
  }
  context.globalAlpha = 1;
}

function observeCanvas(canvas, getPhase = () => 3, hero = false) {
  const observer = new ResizeObserver(() => drawGrid(canvas, getPhase(), hero));
  observer.observe(canvas);
  requestAnimationFrame(() => drawGrid(canvas, getPhase(), hero));
}

function pageHead(kicker, title, description) {
  return h('section', { class: 'page-head' }, h('p', { class: 'eyebrow' }, kicker), h('h1', {}, title), description ? h('p', { class: 'page-description' }, description) : null);
}

function renderTimeline() {
  let phase = 0;
  let timer = null;
  const canvas = h('canvas', { class: 'timeline-canvas', 'aria-hidden': 'true' });
  const date = h('time', { datetime: content.milestones[0].date }, content.milestones[0].label + ' 2026');
  const title = h('h3', { id: 'milestone-title' }, content.milestones[0].title);
  const range = h('input', { type: 'range', min: 0, max: content.milestones.length - 1, step: 1, value: 0, id: 'timeline-range', 'aria-label': 'Esplora le date della cronologia' });
  const buttons = content.milestones.map((milestone, i) => h('button', { type: 'button', class: 'date-button', 'aria-pressed': i === 0, onClick: () => { stop(); update(i); } }, milestone.label));
  const play = h('button', { class: 'play-button', type: 'button', 'aria-label': 'Riproduci la cronologia', onClick: () => {
    if (timer) { stop(); return; }
    if (phase === content.milestones.length - 1) update(0);
    play.textContent = 'Ⅱ'; play.setAttribute('aria-label', 'Metti in pausa la cronologia');
    timer = setInterval(() => { if (phase >= content.milestones.length - 1) { stop(); return; } update(phase + 1); }, 1500);
  } }, '▶');
  function stop() { if (timer) clearInterval(timer); timer = null; play.textContent = '▶'; play.setAttribute('aria-label', 'Riproduci la cronologia'); }
  function update(value) {
    phase = Number(value); range.value = phase;
    const milestone = content.milestones[phase];
    date.textContent = milestone.label + ' 2026'; date.dateTime = milestone.date;
    title.textContent = milestone.title;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === phase)));
    range.setAttribute('aria-valuetext', `${milestone.label} 2026: ${milestone.title}`);
    drawGrid(canvas, phase);
  }
  range.addEventListener('input', () => { stop(); update(range.value); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  const section = h('section', { class: 'timeline-section', id: 'cronologia', 'aria-labelledby': 'timeline-title' },
    h('div', { class: 'section-heading' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Esplora le date'), h('h2', { id: 'timeline-title' }, 'La cronologia')), h('span', { class: 'outline-badge' }, 'Anteprima')),
    h('div', { class: 'timeline-panel' }, canvas, h('div', { class: 'timeline-event', 'aria-live': 'polite' }, date, title),
      h('div', { class: 'timeline-controls' }, play, h('div', { class: 'range-wrap' }, h('label', { class: 'sr-only', for: 'timeline-range' }, 'Data della cronologia'), range)), h('div', { class: 'date-buttons', 'aria-label': 'Date disponibili' }, buttons)),
    h('p', { class: 'caption' }, 'La griglia è dimostrativa: posizioni, colori e passaggi non rappresentano l’attività storica dei singoli agenti.'));
  observeCanvas(canvas, () => phase);
  update(0);
  return section;
}

function renderQuote(quote, compact = false) {
  const text = h('p', { class: 'quote-text' }, quote.italian);
  const italian = h('button', { type: 'button', class: 'seg-button', 'aria-pressed': 'true', onClick: () => change(true) }, 'Italiano');
  const original = h('button', { type: 'button', class: 'seg-button', 'aria-pressed': 'false', onClick: () => change(false) }, 'Originale');
  function change(translated) { text.textContent = translated ? quote.italian : quote.original; text.lang = translated ? 'it' : 'en'; italian.setAttribute('aria-pressed', String(translated)); original.setAttribute('aria-pressed', String(!translated)); }
  const source = content.sources.find(item => item.id === quote.sourceId);
  const link = h('a', { class: 'quote-permalink', href: `${base}quotes/#${encodeURIComponent(quote.id)}`, 'aria-label': 'Collegamento a questa citazione' }, '↗');
  return h('article', { class: compact ? 'quote-card compact' : 'quote-card', id: quote.id }, h('div', { class: 'quote-meta' }, h('span', { class: 'mono' }, quote.agent), h('span', { class: 'type-tag' }, quote.type), link), h('blockquote', {}, text), quote.context ? h('p', { class: 'quote-context' }, quote.context) : null, h('div', { class: 'quote-bottom' }, h('div', { class: 'segmented', role: 'group', 'aria-label': 'Lingua della citazione' }, italian, original), source ? external(source.url, source.publisher + ' ↗', { class: 'quote-source' }) : null));
}

function renderChapter(chapter) {
  const nodes = (chapter.paragraphs || []).map(text => h('p', {}, text));
  for (const detail of chapter.details || []) nodes.push(h('details', {}, h('summary', {}, detail.title), ...(detail.paragraphs || []).map(p => h('p', {}, p))));
  for (const quoteId of chapter.quoteIds || []) { const quote = content.quotes.find(q => q.id === quoteId); if (quote) nodes.push(renderQuote(quote, true)); }
  const citations = (chapter.sourceIds || []).map(id => content.sources.find(s => s.id === id)).filter(Boolean);
  if (citations.length) nodes.push(h('p', { class: 'chapter-sources' }, 'Fonti: ', citations.map((s, i) => [i ? ' · ' : '', external(s.url, s.publisher)])));
  return h('section', { class: 'chapter', id: chapter.id }, chapter.date ? h('time', { class: 'eyebrow', datetime: chapter.date }, new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(chapter.date + 'T12:00:00Z'))) : null, h('h2', {}, chapter.title), nodes);
}

function renderStory() {
  const canvas = h('canvas', { class: 'hero-grid', 'aria-hidden': 'true' });
  root.replaceChildren(h('section', { class: 'hero' }, canvas,
    h('div', { class: 'hero-copy' }, h('p', { class: 'eyebrow' }, 'Edizione italiana / in preparazione'), h('h1', {}, 'Il caso', h('br'), 'Hugging Face'), h('p', { class: 'hero-lead' }, content.synopsis.lead), h('div', { class: 'hero-actions' }, h('a', { class: 'button primary', href: '#cronologia' }, 'Esplora la cronologia ', icon('↓')), external(content.meta.originalUrl, 'Leggi l’originale ↗', { class: 'text-link' }))),
    h('p', { class: 'grid-caption' }, 'Anteprima visiva · disposizione illustrativa')),
    h('section', { class: 'facts-section', 'aria-labelledby': 'facts-title' }, h('p', { class: 'eyebrow', id: 'facts-title' }, 'Le cifre riportate dal sito originale'), h('div', { class: 'facts' }, content.synopsis.facts.map(fact => h('button', { class: 'fact', type: 'button', onClick: () => makeDialog(fact.label, fact.detail, 'Le cifre dell’originale') }, h('strong', {}, fact.value), h('span', {}, fact.label), h('span', { class: 'fact-more', 'aria-hidden': 'true' }, '+'))))),
    renderTimeline(),
    h('div', { class: 'story-body' }, content.chapters.length ? content.chapters.map(renderChapter) : h('section', { class: 'preparation' }, h('p', { class: 'eyebrow' }, 'Il racconto completo'), h('h2', {}, 'La traduzione è il prossimo passo.'), h('p', {}, content.synopsis.note), h('div', { class: 'preparation-links' }, h('a', { href: `${base}about/#criteri` }, 'I criteri di traduzione ', icon('→')), h('a', { href: `${base}sources/` }, 'Consulta le fonti ', icon('→'))))));
  observeCanvas(canvas, () => 4, true);
}

function renderQuotes() {
  const params = new URLSearchParams(location.search);
  const search = h('input', { type: 'search', id: 'quote-search', placeholder: 'Cerca nel testo, negli agenti e nel contesto…', value: params.get('q') || '', autocomplete: 'off' });
  const select = (key, label, values) => {
    const element = h('select', { id: `filter-${key}` }, h('option', { value: '' }, label), [...new Set(values)].sort().map(v => h('option', { value: v }, v)));
    element.value = params.get(key) || '';
    return element;
  };
  const agent = select('agent', 'Tutti gli agenti', content.quotes.map(q => q.agent));
  const type = select('type', 'Tutti i tipi', content.quotes.map(q => q.type));
  const results = h('div', { class: 'quote-results' });
  const count = h('p', { class: 'results-count', role: 'status', 'aria-live': 'polite' });
  const reset = h('button', { class: 'text-button', type: 'button', onClick: () => { search.value = ''; agent.value = ''; type.value = ''; update(); search.focus(); } }, 'Azzera filtri');
  function update() {
    const matches = filterQuotes(content.quotes, { search: search.value, agent: agent.value, type: type.value });
    const next = new URLSearchParams();
    if (search.value) next.set('q', search.value);
    if (agent.value) next.set('agent', agent.value);
    if (type.value) next.set('type', type.value);
    history.replaceState(null, '', `${location.pathname}${next.size ? '?' + next : ''}${location.hash}`);
    count.textContent = `${matches.length} ${matches.length === 1 ? 'citazione' : 'citazioni'}`;
    results.replaceChildren(...(matches.length ? matches.map(q => renderQuote(q)) : [h('div', { class: 'empty-state' }, h('span', { class: 'empty-symbol', 'aria-hidden': 'true' }, '“'), h('h2', {}, content.quotes.length ? 'Nessuna corrispondenza.' : 'Le citazioni sono in preparazione.'), h('p', {}, content.quotes.length ? 'Prova un’altra ricerca oppure azzera i filtri.' : 'L’archivio bilingue sarà aggiunto dopo l’autorizzazione. Ogni citazione avrà un riferimento alla fonte e il testo originale consultabile.'), external('https://huggingface.wtf/quotes', 'Consulta l’archivio originale ↗'))]));
  }
  root.replaceChildren(pageHead('Le parole degli agenti', 'Citazioni', 'Ricerca, filtri e confronto tra italiano e originale.'), h('section', { class: 'archive' }, h('form', { class: 'filters', role: 'search', onSubmit: event => event.preventDefault() }, h('div', { class: 'search-field' }, h('label', { for: 'quote-search' }, 'Cerca nelle citazioni'), search), h('div', { class: 'filter-row' }, h('div', {}, h('label', { for: 'filter-agent' }, 'Agente'), agent), h('div', {}, h('label', { for: 'filter-type' }, 'Tipo di citazione'), type))), h('div', { class: 'results-bar' }, count, reset), results));
  for (const control of [search, agent, type]) control.addEventListener(control === search ? 'input' : 'change', update);
  update();
  if (location.hash) requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
}

function renderSources() {
  root.replaceChildren(pageHead('Riferimenti e documentazione', 'Fonti', 'I collegamenti alla ricostruzione originale e ai rapporti che cita.'), h('section', { class: 'sources-list' }, content.sources.map((source, i) => h('article', { class: 'source-row', id: source.id }, h('span', { class: 'source-number', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')), h('div', {}, h('p', { class: 'eyebrow' }, source.publisher), h('h2', {}, external(source.url, source.label + ' ↗')), h('p', {}, source.description))))));
}

function renderAbout() {
  const glossary = h('div', { class: 'glossary-table', role: 'region', 'aria-label': 'Glossario di traduzione', tabindex: '0' }, h('table', {}, h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Termine'), h('th', { scope: 'col' }, 'Scelta in italiano'))), h('tbody', {}, content.glossary.map(item => h('tr', {}, h('th', { scope: 'row' }, item.term), h('td', {}, h('strong', {}, item.translation), h('p', {}, item.note)))))));
  root.replaceChildren(pageHead('Origine e criteri editoriali', 'Il progetto', 'Un’edizione italiana non ufficiale di huggingface.wtf, attualmente in preparazione.'), h('div', { class: 'prose' }, h('section', {}, h('h2', {}, 'L’originale'), h('p', {}, 'Il sito originale è un progetto di Lightcone Infrastructure, a cura di Raymond Arnold, con contributi di Georgia Ray e Harri Besceli e di altri collaboratori.'), external('https://huggingface.wtf/about', 'Crediti completi sul sito originale ↗')), h('section', {}, h('h2', {}, 'Stato di questa versione'), h('p', {}, 'Questa anteprima contiene codice originale per l’interfaccia, una breve sintesi e uno schema visivo dimostrativo. La riproduzione integrale dei contenuti è in attesa dell’autorizzazione degli autori. Non è un’edizione ufficiale né approvata da Lightcone.'), h('p', {}, 'La traduzione completa verrà rivista insieme a Orazio prima di essere proposta agli autori.')), h('section', { id: 'criteri' }, h('p', { class: 'eyebrow' }, 'Le scelte di lingua'), h('h2', {}, 'Italiano naturale, significato preciso.'), h('p', {}, 'I nomi propri restano invariati. I termini tecnici si conservano quando sono quelli comunemente usati nel settore; dove serve, si spiegano brevemente alla prima occorrenza. Il contesto guida le scelte, anche quando lo stesso termine inglese richiede rese diverse.'), glossary)));
}

function renderPrint() {
  root.replaceChildren(pageHead('Lettura e stampa', content.meta.title, 'Versione testuale dell’edizione italiana in preparazione.'), h('div', { class: 'print-actions' }, h('button', { class: 'button primary', type: 'button', onClick: () => window.print() }, 'Stampa / salva come PDF')), h('div', { class: 'prose' }, h('p', {}, content.synopsis.lead), content.chapters.length ? content.chapters.map(renderChapter) : h('p', { class: 'print-note' }, content.synopsis.note), h('section', {}, h('h2', {}, 'Fonti'), h('ol', {}, content.sources.map(source => h('li', {}, external(source.url, source.label), h('span', { class: 'print-url' }, ` — ${source.url}`)))))));
}

if (content) ({ story: renderStory, quotes: renderQuotes, sources: renderSources, about: renderAbout, print: renderPrint }[page] || renderStory)();
