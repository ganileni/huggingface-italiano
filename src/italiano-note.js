/* Translation notes are separate from the unchanged source evidence. */
(() => {
  'use strict';
  const BASE='/huggingface-italiano', VERSION='__BUILD_TAG__';
  const normalise=value=>value.replace(/\s+/g,' ').trim();
  const quoteKey=value=>normalise(value).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/[\s"'“”‘’]/g,'').replace(/\.{3}/g,'…');
  const passageKey=value=>normalise(value).replace(/\[\s*(?:\.{3}|…)\s*\]/g,'…').replace(/\.{3}/g,'…');
  const element=(tag,attributes={},text)=>{
    const node=document.createElement(tag);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function safeFragment(value){
    const template=document.createElement('template');template.innerHTML=value;
    const allowed=new Set(['P','SPAN','STRONG','EM','CODE','PRE','A','SUP','SUB','BR','U','S','DEL','UL','OL','LI','BLOCKQUOTE']);
    for(const node of [...template.content.querySelectorAll('*')]){
      if(!allowed.has(node.tagName)){node.replaceWith(document.createTextNode(node.textContent));continue;}
      for(const attr of [...node.attributes]){
        if(!['href','title','rel','target','class','data-agent-mention','data-quote-emphasis'].includes(attr.name))node.removeAttribute(attr.name);
      }
      const href=node.getAttribute('href');
      if(href&&!/^(?:https?:\/\/|mailto:|#|\/huggingface-italiano\/)/i.test(href))node.removeAttribute('href');
      if(node.tagName==='A')node.rel='noopener noreferrer';
    }
    return template.content;
  }
  function originalDisclosure(original){
    const details=element('details',{'class':'it-original-disclosure'});
    details.append(element('summary',{},'Originale inglese'),element('blockquote',{lang:'en'},original));
    return details;
  }
  function install(data){
    const passages=new Map(Object.values(data.footnotes).map(p=>[passageKey(p.original).replace(/\s/g,''),p]));
    let dialog,returnFocus;
    const openQuote=(id,trigger)=>{
      const quote=data.quotes[id];if(!quote)return;
      if(!dialog){
        dialog=element('dialog',{id:'it-translation-dialog','class':'it-translation-dialog','aria-labelledby':'it-translation-title'});
        dialog.addEventListener('close',()=>{returnFocus?.focus();});
        dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
        document.body.append(dialog);
      }
      returnFocus=trigger||document.activeElement;
      const content=element('div',{'class':'it-translation-content'});
      const close=element('button',{type:'button','class':'it-translation-close','aria-label':'Chiudi la nota di traduzione'},'Chiudi ×');
      close.addEventListener('click',()=>dialog.close());
      content.append(close,element('h2',{id:'it-translation-title'},'Originale e note di traduzione'));
      if(quote.madeUp)content.append(element('p',{'class':'it-evidence-label'},'Esempio ricostruito dagli autori'));
      else if(quote.paraphrased)content.append(element('p',{'class':'it-evidence-label'},'Parafrasi pubblicata dalla fonte'));
      const translated=element('div',{'class':'it-translation-body',lang:'it'});translated.append(safeFragment(quote.italianHtml));
      content.append(element('h3',{},'Versione italiana'),translated,element('h3',{},quote.madeUp?'Testo inglese dell’esempio':'Testo inglese della fonte'));
      content.append(element('blockquote',{lang:'en','class':'it-original-text'},quote.original));
      content.append(element('h3',{},'Note di traduzione'));
      const notes=element('ul');for(const note of quote.translationNotes)notes.append(element('li',{},note));content.append(notes);
      if(quote.sourceTitle){
        const source=element('p',{'class':'it-translation-source'},'Fonte: ');
        if(/^https?:\/\//i.test(quote.sourceUrl))source.append(element('a',{href:quote.sourceUrl,target:'_blank',rel:'noopener noreferrer'},quote.sourceTitle));
        else source.append(document.createTextNode(quote.sourceTitle));
        if(quote.locator)source.append(document.createTextNode(' — '+quote.locator));content.append(source);
      }
      dialog.replaceChildren(content);if(!dialog.open)dialog.showModal();close.focus();
    };
    document.addEventListener('click',event=>{
      const link=event.target.closest?.('a[href*="#nota-traduzione-"]');if(!link)return;
      const id=new URL(link.href,location.href).hash.slice('#nota-traduzione-'.length);
      if(!data.quotes[id])return;
      event.preventDefault();event.stopImmediatePropagation();openQuote(id,link);
    },true);

    function process(){
      // Native source links retain the exact English passage for matching in the source viewer.
      for(const region of document.querySelectorAll('[role="region"][aria-label="Nota"],[role="region"][aria-label="Footnote"]')){
        const quote=region.querySelector('blockquote:not(.it-original-text):not(.it-footnote-translation):not([lang="en"])');if(!quote)continue;
        const passage=data.footnotes[normalise(quote.textContent)]||passages.get(passageKey(quote.textContent).replace(/\s/g,''));
        let translated=region.querySelector('.it-footnote-translation');
        if(!passage){quote.hidden=false;translated?.remove();region.querySelector('.it-footnote-original')?.remove();continue;}
        // Keep React's original nodes intact so a reused popup can change source safely.
        quote.hidden=true;
        if(translated?.dataset.itPassage===passage.id)continue;
        translated?.remove();region.querySelector('.it-footnote-original')?.remove();
        translated=element('blockquote',{lang:'it','class':quote.className+' it-footnote-translation'});
        translated.dataset.itPassage=passage.id;translated.append(element('p',{},passage.it));quote.before(translated);
        const original=originalDisclosure(passage.original);original.classList.add('it-footnote-original');quote.after(original);
      }
      if(location.pathname.includes('/sources'))return;
      for(const root of document.querySelectorAll('[data-message-id]')){
        if(root.tagName==='SPAN'||root.closest('.it-translation-dialog'))continue;
        const id=root.getAttribute('data-message-id'),quote=data.quotes[id];if(!quote)continue;
        // A quote can occur inside both an article and a figure: annotate its innermost container.
        if([...root.querySelectorAll('[data-message-id]')].some(child=>child.getAttribute('data-message-id')===id))continue;
        const scope=root.closest('[data-embedded-quotes]')||root;
        const originalSelected=[...scope.querySelectorAll('button[aria-pressed="true"]')].some(button=>button.textContent.trim()==='Originale');
        const body=root.querySelector(':is(.quote-transcript,.quote-marked,.spoken-quote,[data-quote-body]):not(.it-quote-translation)');
        const current=body?quoteKey(body.textContent):'';
        const known=[quote.originalPlain,quote.englishPlain,quote.legacyItalianPlain].map(quoteKey);
        let translated=body?.parentElement.querySelector(':scope > .it-quote-translation')||root.querySelector('.it-quote-translation');
        if(body&&!originalSelected&&known.includes(current)&&current!==quoteKey(quote.italianPlain)){
          body.hidden=true;
          if(translated?.dataset.itQuote!==id){
            translated?.remove();translated=element('div',{'class':body.className+' it-quote-translation',lang:'it'});
            translated.dataset.itQuote=id;translated.append(safeFragment(quote.italianHtml));body.before(translated);
          }
        }else{if(body)body.hidden=false;translated?.remove();}
        if(quote.kind==='cot'&&!root.querySelector(':scope > .it-quote-note-ref')){
          const reference=element('sup',{'class':'it-quote-note-ref'});
          reference.append(element('a',{href:'#nota-traduzione-'+id,'aria-haspopup':'dialog','aria-controls':'it-translation-dialog'},'Originale e note di traduzione'));
          root.append(reference);
        }
      }
    }
    let scheduled=false;
    const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;process();});};
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-pressed','data-message-id']});
    process();
    const requested=location.hash.startsWith('#nota-traduzione-')?location.hash.slice('#nota-traduzione-'.length):'';
    if(requested)openQuote(requested);
  }
  const start=()=>fetch(BASE+'/mirror-data/annotations.json?it='+VERSION).then(response=>{
    if(!response.ok)throw Error('Translation notes: '+response.status);return response.json();
  }).then(install).catch(error=>console.error(error));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
