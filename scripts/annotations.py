"""Italian evidence excerpts and traceable translation annotations."""
from pathlib import Path
from html.parser import HTMLParser
import json,re,html,hashlib

ROOT=Path(__file__).resolve().parents[1]

class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.footnotes=[]
 def handle_data(self,value):self.parts.append(value)
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if attrs.get('data-footnote-passage'):self.footnotes.append(attrs)

def plain(value):
 value=re.sub(r'<span\b[^>]*data-agent-mention="([^"]+)"[^>]*>\s*</span>',lambda m:html.escape(m[1]),value)
 p=Text();p.feed(value);return normalise(''.join(p.parts))

def normalise(value):return re.sub(r'\s+',' ',value).strip()
def quote_key(value):return re.sub(r'[\s"\'“”‘’]','',html.unescape(value)).replace('...','…')

def load_passages():
 result={}
 for path in sorted((ROOT/'translations').glob('footnotes-*.it.json')):
  for key,item in json.loads(path.read_text()).items():
   if hashlib.sha256(item['original'].encode()).hexdigest()[:12]!=key:raise ValueError('Footnote original changed: '+key)
   if not item.get('it'):raise ValueError('Missing Italian footnote: '+key)
   result[normalise(item['original'])]={'id':key,**item}
 return result

def load_quote_notes():
 path=ROOT/'translations/quote-annotations.json'
 return json.loads(path.read_text())if path.exists()else{}

def render_quote_notes(quote):
 notes=[]
 if quote.get('madeUp'):
  notes.append("È un esempio ricostruito dagli autori del sito, non una trascrizione di un agente reale.")
 elif quote.get('paraphrased'):
  notes.append("La fonte presenta già il testo inglese come una parafrasi, non come una trascrizione letterale dell'agente.")
 notes.append("La resa italiana segue la versione in linguaggio semplice del sito originale; il testo inglese della fonte è riportato qui sotto per il confronto.")
 notes.extend(quote.get('notes',[]))
 return notes

def manifest(story,documents,tr):
 editorial=load_quote_notes();quotes={};sources={s['id']:s for s in story['sources']}
 for q in story['aiMessages']:
  source=sources.get(q.get('sourceId'),{})
  original=q['text'];rendering=documents[q['plainEnglishDocumentId']]
  old_rendering=story['documents'].get(q['plainEnglishDocumentId'],'')or original
  entry={'id':q['id'],'kind':q['type'],'original':original,'originalPlain':plain(original),'italianHtml':rendering,'italianPlain':plain(rendering),'englishPlain':plain(old_rendering),'legacyItalianPlain':plain(tr.html(old_rendering)),'paraphrased':q.get('paraphrased',False),'madeUp':q.get('madeUp',False),'notes':editorial.get(q['id'],{}).get('notes',[]),'sourceTitle':tr.text(source.get('title')or source.get('name')or q.get('sourceId','')),'sourceUrl':source.get('url')or next((n.get('url')for n in q.get('notes',[])if n.get('url')),''),'locator':q.get('locator','')}
  entry['translationNotes']=render_quote_notes(entry)
  if not editorial.get(q['id'],{}).get('notes'):raise ValueError('Missing quote annotation: '+q['id'])
  quotes[q['id']]=entry
 return {'quotes':quotes,'footnotes':load_passages()}

def original_details(original):
 return '<details class="it-original-disclosure"><summary>Originale inglese</summary><blockquote lang="en">'+html.escape(original)+'</blockquote></details>'

def translate_print_footnotes(value,passages):
 def note(match):
  content=match[0]
  for item in sorted(passages.values(),key=lambda item:len(item['original']),reverse=True):
   original=html.escape(item['original'],quote=False)
   # The original printer flattens whitespace in source excerpts.
   candidates=[original,html.escape(normalise(item['original']),quote=False)]
   bulleted=' • '.join(line.strip()for line in item['original'].splitlines()if line.strip())
   candidates.append(html.escape(bulleted,quote=False))
   for candidate in list(candidates):
    formatted=re.sub(r'\b\d{1,3}(?:,\d{3})+\b',lambda n:n[0].replace(',','.'),candidate)
    formatted=re.sub(r'\b(\d+)\.(\d+)(?=\s*%)',r'\1,\2',formatted)
    candidates.append(formatted)
   for candidate in candidates:
    if candidate in content:
     translated=content.replace(candidate,html.escape(item['it'],quote=False),1)
     return '<div class="it-print-source-note">'+translated+original_details(item['original'])+'</div>'
  return content
 return re.sub(r'<p data-print="note"[^>]*>.*?</p>',note,value,flags=re.S)

def annotate_print_quotes(value,quotes):
 used=[]
 def quote(match):
  body=re.split(r'<p data-print="attribution">',match[0],maxsplit=1)[0]
  text=quote_key(plain(body))
  for q in quotes.values():
   if text in [quote_key(q[k])for k in ['originalPlain','englishPlain','italianPlain','legacyItalianPlain']]:
    parts=re.split(r'<p data-print="attribution">',match[0],maxsplit=1)
    rendered='<blockquote data-print="quote">'+q['italianHtml']
    if len(parts)>1:rendered+='<p data-print="attribution">'+parts[1]
    else:rendered+='</blockquote>'
    used.append(q)
    ref='<p class="it-print-note-ref"><a href="#nota-traduzione-'+q['id']+'">Originale e note di traduzione</a></p>'
    rendered=rendered.replace('</blockquote>',ref+'</blockquote>')
    return rendered
  return match[0]
 value=re.sub(r'<blockquote data-print="quote">.*?</blockquote>',quote,value,flags=re.S)
 if not used:return value
 items=[]
 for q in {q['id']:q for q in used}.values():
  notes=''.join('<li>'+html.escape(n)+'</li>'for n in q['translationNotes'])
  items.append('<li id="nota-traduzione-'+q['id']+'"><h3>Nota di traduzione</h3><ul>'+notes+'</ul><p>Testo inglese della fonte:</p><blockquote lang="en">'+html.escape(q['original'])+'</blockquote></li>')
 section='<section class="it-print-translation-notes"><h2>Originali e note di traduzione delle citazioni</h2><ol>'+''.join(items)+'</ol></section>'
 return value.replace('</article>',section+'</article>',1)if '</article>'in value else value+section
