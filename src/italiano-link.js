/* Optional, reversible Google Translate routing for external web pages. */
(() => {
  'use strict';
  const KEY='hf-italiano.translate-external-links';
  const LINK_STATE=new WeakMap(), OBSERVED_BARS=new WeakSet();
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
  const setAttribute=(node,key,value)=>{
    if(value===null){if(node.hasAttribute(key))node.removeAttribute(key);}
    else if(node.getAttribute(key)!==value)node.setAttribute(key,value);
  };
  function reset(anchor,state){
    if(!state)return;
    if(anchor.getAttribute('title')===state.appliedTitle)setAttribute(anchor,'title',state.title);
    anchor.removeAttribute('data-it-original-href');anchor.removeAttribute('data-it-link-translation');
    LINK_STATE.delete(anchor);
  }
  function processLink(anchor){
    let state=LINK_STATE.get(anchor),raw=anchor.getAttribute('href');
    if(state&&raw===state.appliedHref){
      raw=state.raw;
      // A native rerender may update the title independently of the href.
      if(anchor.getAttribute('title')!==state.appliedTitle)state.title=anchor.getAttribute('title');
    } else {
      reset(anchor,state);state=null;
    }
    let url;
    try {url=new URL(raw,location.href);}catch(_){reset(anchor,state);return;}
    const eligible=raw!==null&&/^https?:$/.test(url.protocol)&&url.origin!==location.origin&&!anchor.hasAttribute('download')&&!isTranslation(url);
    if(!eligible){
      if(state&&anchor.getAttribute('href')===state.appliedHref)setAttribute(anchor,'href',state.raw);
      reset(anchor,state);return;
    }
    if(!state){state={raw,url,title:anchor.getAttribute('title'),appliedHref:raw,appliedTitle:anchor.getAttribute('title')};LINK_STATE.set(anchor,state);}
    const file=isFile(url);
    const href=enabled&&!file?translatedUrl(url):state.raw;
    const hint=!enabled?null:file?'Documento o file originale: la traduzione automatica dei siti non traduce questi file.':'Apri la pagina in italiano con Google Translate. Per il collegamento originale, disattiva «Link in italiano» nella barra in alto.';
    const title=hint?(state.title?state.title+'\n':'')+hint:state.title;
    state.appliedHref=href;state.appliedTitle=title;
    setAttribute(anchor,'data-it-original-href',state.raw);
    setAttribute(anchor,'data-it-link-translation',enabled?(file?'file-originale':'google'):'off');
    setAttribute(anchor,'title',title);setAttribute(anchor,'href',href);
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
    document.addEventListener('change',event=>{
      if(!event.target.matches?.('.it-link-toggle input'))return;
      enabled=event.target.checked;
      try {localStorage.setItem(KEY,enabled?'on':'off');}catch(_){}
      process();
    });
    window.addEventListener('storage',event=>{if(event.key===KEY){enabled=event.newValue!=='off';process();}});
    new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['href','download','title']});
    process();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
