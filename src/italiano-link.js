/* Optional, reversible Google Translate routing for external web pages. */
(() => {
  'use strict';
  const BASE='/huggingface-italiano',VERSION='__BUILD_TAG__';
  const KEY='hf-italiano.translate-external-links';
  const LINK_STATE=new WeakMap(), OBSERVED_BARS=new WeakSet();
  const SOURCE_URLS=new Map();
  const FILE=/\.(?:pdf|docx?|pptx?|xlsx?|od[tpst]|zip|gz|tgz|tar|7z|rar|csv|json|txt|mp3|mp4|webm|wav|ogg|png|jpe?g|gif|webp|svg|woff2?|ttf|exe|dmg)$/i;
  let enabled=true,scheduled=false;
  try { const saved=localStorage.getItem(KEY);if(saved==='off')enabled=false; } catch (_) {}
  const isTranslation=url=>/^translate\.google\.[a-z.]+$/i.test(url.hostname)||url.hostname.endsWith('.translate.goog');
  const translatedUrl=url=>{
    const destination=new URL('https://translate.google.com/translate');
    destination.searchParams.set('sl','auto');destination.searchParams.set('tl','it');destination.searchParams.set('hl','it');destination.searchParams.set('u',url.href);
    return destination.href;
  };
  const isFile=url=>FILE.test(url.pathname)||/^\/pdf\//i.test(url.pathname)&&/(?:^|\.)arxiv\.org$/i.test(url.hostname);
  const sourceUrl=url=>{
    if(url.origin!==location.origin||!['/sources','/sources/',BASE+'/sources',BASE+'/sources/'].includes(url.pathname))return null;
    const destination=SOURCE_URLS.get(url.searchParams.get('source'));
    return destination&&!isFile(destination)?destination:null;
  };
  // A numbered footnote opens the Italian excerpt first. Its source-title link
  // opens the complete article and is the part that should use Google Translate.
  const isFootnotePreview=anchor=>anchor.classList.contains('document-footnote');
  const setAttribute=(node,key,value)=>{
    if(value===null){if(node.hasAttribute(key))node.removeAttribute(key);}
    else if(node.getAttribute(key)!==value)node.setAttribute(key,value);
  };
  function reset(anchor,state){
    if(!state)return;
    if(anchor.getAttribute('title')===state.appliedTitle)setAttribute(anchor,'title',state.title);
    if(anchor.getAttribute('target')===state.appliedTarget)setAttribute(anchor,'target',state.target);
    if(anchor.getAttribute('rel')===state.appliedRel)setAttribute(anchor,'rel',state.rel);
    anchor.removeAttribute('data-it-original-href');anchor.removeAttribute('data-it-link-translation');
    LINK_STATE.delete(anchor);
  }
  function processLink(anchor){
    let state=LINK_STATE.get(anchor),raw=anchor.getAttribute('href');
    if(state&&raw===state.appliedHref){
      raw=state.raw;
      // A native rerender may update the title independently of the href.
      if(anchor.getAttribute('title')!==state.appliedTitle)state.title=anchor.getAttribute('title');
      if(anchor.getAttribute('target')!==state.appliedTarget)state.target=anchor.getAttribute('target');
      if(anchor.getAttribute('rel')!==state.appliedRel)state.rel=anchor.getAttribute('rel');
    } else {
      reset(anchor,state);state=null;
    }
    let url;
    try {url=new URL(raw,location.href);}catch(_){reset(anchor,state);return;}
    const source=isFootnotePreview(anchor)?null:sourceUrl(url);
    const eligible=raw!==null&&/^https?:$/.test(url.protocol)&&!url.username&&!url.password&&(url.origin!==location.origin||source)&&!anchor.hasAttribute('download')&&!isTranslation(url)&&!isFootnotePreview(anchor);
    if(!eligible){
      if(state&&anchor.getAttribute('href')===state.appliedHref)setAttribute(anchor,'href',state.raw);
      reset(anchor,state);return;
    }
    if(!state){
      state={raw,url,title:anchor.getAttribute('title'),target:anchor.getAttribute('target'),rel:anchor.getAttribute('rel'),appliedHref:raw,appliedTitle:anchor.getAttribute('title'),appliedTarget:anchor.getAttribute('target'),appliedRel:anchor.getAttribute('rel')};
      LINK_STATE.set(anchor,state);
    }
    state.source=!!source;
    const destination=source||url,file=isFile(destination);
    const href=enabled&&!file?translatedUrl(destination):state.raw;
    const hint=!enabled?null:file?'Documento o file originale: la traduzione automatica dei siti non traduce questi file.':'Apri la pagina in italiano con Google Translate. Per il collegamento originale, disattiva «Link in italiano» nella barra in alto.';
    const title=hint?(state.title?state.title+'\n':'')+hint:state.title;
    const target=enabled&&source?'_blank':state.target;
    const rel=enabled&&source?[...new Set((state.rel||'').split(/\s+/).filter(Boolean).concat(['noopener','noreferrer']))].join(' '):state.rel;
    state.appliedHref=href;state.appliedTitle=title;state.appliedTarget=target;state.appliedRel=rel;
    setAttribute(anchor,'data-it-original-href',state.raw);
    setAttribute(anchor,'data-it-link-translation',enabled?(file?'file-originale':'google'):'off');
    setAttribute(anchor,'title',title);setAttribute(anchor,'href',href);setAttribute(anchor,'target',target);setAttribute(anchor,'rel',rel);
  }
  function mountToggle(){
    for(const bar of document.querySelectorAll('.it-edition-bar')){
      let input=bar.querySelector('.it-link-toggle input');
      if(!input){
        const label=document.createElement('label');label.className='it-link-toggle';
        label.title='Apri i link esterni tramite Google Translate. PDF e altri file restano nella lingua originale.';
        input=document.createElement('input');input.type='checkbox';input.checked=enabled;
        input.setAttribute('aria-label','Apri i link esterni in italiano con Google Translate');
        const text=document.createElement('span');text.textContent='Link in italiano';
        label.append(input,text);bar.append(label);
      } else if(input.checked!==enabled)input.checked=enabled;
      if(!OBSERVED_BARS.has(bar)){
        OBSERVED_BARS.add(bar);
        new ResizeObserver(()=>document.documentElement.style.setProperty('--it-bar-height',bar.offsetHeight+'px')).observe(bar);
      }
    }
  }
  function process(){mountToggle();document.querySelectorAll('a[href]').forEach(processLink);}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;process();});}
  function start(){
    // Stop the native source-reader interception, while leaving the browser's
    // normal link action (including modifier keys and a new tab) intact.
    window.addEventListener('click',event=>{
      if(!enabled)return;
      const anchor=event.target.closest?.('a[href]');
      if(!anchor||isFootnotePreview(anchor))return;
      processLink(anchor);
      const state=LINK_STATE.get(anchor);
      if(state?.source&&anchor.getAttribute('href')===state.appliedHref)event.stopImmediatePropagation();
    },true);
    document.addEventListener('change',event=>{
      if(!event.target.matches?.('.it-link-toggle input'))return;
      enabled=event.target.checked;
      try {localStorage.setItem(KEY,enabled?'on':'off');}catch(_){}
      process();
    });
    window.addEventListener('storage',event=>{if(event.key===KEY){enabled=event.newValue!=='off';process();}});
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['href','download','title','target','rel']});
    process();
    fetch(BASE+'/mirror-data/source-links.json?it='+VERSION).then(response=>{
      if(!response.ok)throw Error('Source links: '+response.status);return response.json();
    }).then(sources=>{
      for(const [id,value] of Object.entries(sources)){
        try {const url=new URL(value);if(/^https?:$/.test(url.protocol)&&!url.username&&!url.password&&url.origin!==location.origin)SOURCE_URLS.set(id,url);}catch(_){}
      }
      process();
    }).catch(error=>console.warn(error));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
