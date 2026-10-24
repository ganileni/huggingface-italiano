/* Italian localisation glue. All historical rendering remains the original site’s. */
(() => {
  'use strict';
  const BASE = '/huggingface-italiano';
  const VERSION='__BUILD_TAG__';
  const cached=path=>BASE+'/mirror-data/'+path+'?it='+VERSION;
  const fetchOriginal = window.fetch.bind(window);
  const beaconOriginal=navigator.sendBeacon?.bind(navigator);
  if(beaconOriginal)navigator.sendBeacon=(url,data)=>new URL(url,location.href).pathname.replace(BASE,'')==='/api/activity'?true:beaconOriginal(url,data);
  let documentsPromise;
  const loadDocuments = () => documentsPromise ||= fetchOriginal(cached('documents.json')).then(r => r.json());
  const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8'}});
  window.fetch = async (input, options) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input), location.href);
    const method = (options?.method || request?.method || 'GET').toUpperCase();
    let path = url.pathname;
    if (path.startsWith(BASE + '/')) path = path.slice(BASE.length);
    if (url.origin === location.origin && path.startsWith('/api/')) {
      if (path === '/api/activity') return new Response(null,{status:204});
      if (path === '/api/pangram') return new Response(null,{status:304});
      if (method !== 'GET' && method !== 'HEAD') return json({error:'Questa edizione è una copia di sola lettura.'},405);
      if (path === '/api/sources') return fetchOriginal(cached('sources-index.json'),options);
      const source = path.match(/^\/api\/sources\/([^/]+)(\/pdf)?$/);
      if (source) return fetchOriginal(cached(source[2] ? 'pdf/' + source[1] + '.pdf' : 'sources/' + source[1] + '.json'),options);
      const document = path.match(/^\/api\/documents\/([^/]+)$/);
      if (document) {
        const id=decodeURIComponent(document[1]);
        const docs=await loadDocuments();
        return id in docs ? json({document:{id,html:docs[id],updatedAt:'2026-10-24T00:00:00Z'}}) : json({error:'Documento non disponibile in questa copia.'},404);
      }
      return json({error:'Funzione riservata al sito originale.'},404);
    }
    // Pages is static: original Next.js prefetches can reuse its translated Flight snapshot.
    if (url.origin === location.origin && url.searchParams.has('_rsc')) {
      const local=path.replace(/^\/+|\/+$/g,'')||'home';
      return fetchOriginal(cached('flight/'+local+'.txt'),options);
    }
    return fetchOriginal(input,options);
  };

  // The upstream links use client routing; full navigation is reliable on GitHub Pages.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link=event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || link.target === '_blank') return;
    const url=new URL(link.href,location.href);
    if (url.origin !== location.origin) return;
    if (!url.pathname.startsWith(BASE+'/') && /^\/(about|quotes|sources|print)\/?$/.test(url.pathname)) url.pathname=BASE+url.pathname;
    if (!url.pathname.startsWith(BASE+'/')) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    event.preventDefault(); event.stopImmediatePropagation();
    location.assign(url.href);
  },true);

  function mount() {
    document.documentElement.lang='it';
    const bar=document.querySelector('.it-edition-bar')||document.createElement('div');bar.className='it-edition-bar';bar.setAttribute('aria-label','Edizione italiana');
    const message=document.createElement('span');message.textContent='Versione italiana non ufficiale';
    const original=document.createElement('a');original.href='https://huggingface.wtf/';original.target='_blank';original.rel='noopener noreferrer';original.textContent='Originale Lightcone ↗';
    if(!bar.children.length)bar.append(message,original);
    const storyPage=location.pathname.replace(/\/$/,'')===BASE;
    if (storyPage && 'speechSynthesis' in window) {
      const button=bar.querySelector('.it-speech-button')||document.createElement('button');button.hidden=false;button.type='button';button.textContent='Ascolta in italiano';button.setAttribute('aria-pressed','false');
      let playing=false;
      document.addEventListener('click',event=>{
        const button=event.target.closest?.('.it-speech-button');if(!button)return;
        if (playing) {speechSynthesis.cancel();playing=false;button.textContent='Ascolta in italiano';button.setAttribute('aria-pressed','false');return;}
        document.querySelectorAll('audio').forEach(a=>a.pause());
        const story=document.querySelector('.story-outline')||document.querySelector('[aria-label="The story"]')||document.querySelector('[aria-label="Il racconto"]')||document.querySelector('main');
        if (!story)return;
        const text=story.innerText.replace(/\n{3,}/g,'\n\n');
        const chunks=text.match(/[^.!?\n]+[.!?\n]*/g)||[text];
        const queue=[];let chunk='';
        for (const sentence of chunks) {if(chunk.length+sentence.length>1600&&chunk){queue.push(chunk);chunk='';}chunk+=sentence;}if(chunk)queue.push(chunk);
        playing=true;button.textContent='Interrompi lettura';button.setAttribute('aria-pressed','true');
        const next=()=>{if(!playing)return;const phrase=queue.shift();if(!phrase){playing=false;button.textContent='Ascolta in italiano';button.setAttribute('aria-pressed','false');return;}const utterance=new SpeechSynthesisUtterance(phrase);utterance.lang='it-IT';const voice=speechSynthesis.getVoices().find(v=>v.lang.toLowerCase().startsWith('it'));if(voice)utterance.voice=voice;utterance.onend=next;utterance.onerror=()=>{playing=false;button.textContent='Ascolta in italiano';button.setAttribute('aria-pressed','false');};speechSynthesis.speak(utterance);};next();
      });
      if(!button.parentNode)bar.append(button);
    } else {const button=bar.querySelector('.it-speech-button');if(button)button.hidden=true;}
    if(!bar.parentNode)document.body.append(bar);
    new ResizeObserver(()=>document.documentElement.style.setProperty('--it-bar-height',bar.offsetHeight+'px')).observe(bar);
    const isSources=location.pathname.includes('/sources');
    if(isSources){const note=document.createElement('p');note.className='it-sources-note';note.textContent='I documenti delle fonti sono consultabili nella lingua originale. Il racconto e le citazioni degli agenti sono tradotti in italiano; il testo originale delle citazioni resta disponibile.';document.body.append(note);}
    // Public readers do not edit the source site or submit analytics from this mirror.
    const tidy=()=>{
      const currentBar=document.querySelector('.it-edition-bar');if(currentBar)document.documentElement.style.setProperty('--it-bar-height',currentBar.offsetHeight+'px');
      for(const button of document.querySelectorAll('button')){
        const label=(button.getAttribute('aria-label')||button.textContent||'').trim();
        if(['Start editing','Inizia a modificare','Inizia modifica','Modifica la pagina','Start editing this page','Modifica questa pagina'].includes(label))button.hidden=true;
        if(/Listen to this page|Ascolta questa pagina/.test(label)){button.setAttribute('aria-label','Audio originale in inglese, 37 minuti');button.title='Audio originale in inglese';}
      }
      for(const audio of document.querySelectorAll('audio[src]'))if(audio.getAttribute('src').startsWith('/'))audio.src='https://huggingface.wtf/audio/hugging-face-incident.mp3';
      for(const link of document.querySelectorAll('a[href*="/pdf/the-hugging-face-incident.pdf"]'))link.href=BASE+'/print/?pdf=1';
    };
    window.addEventListener('resize',tidy);tidy();let pending=false;new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;tidy();});}}).observe(document.body,{childList:true,subtree:true});
  }
  if(new URLSearchParams(location.search).has('pdf'))window.addEventListener('load',()=>{document.fonts.ready.then(()=>window.print());},{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
