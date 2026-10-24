"""Localise the authorised public snapshot without changing evidence or event data."""
from html.parser import HTMLParser
from pathlib import Path
import json,re,html,hashlib

ROOT=Path(__file__).resolve().parents[1]
BASE='/huggingface-italiano'
PAGES={'home':'','quotes':'quotes','sources':'sources','about':'about','print':'print'}
VISIBLE_ATTRS={'title','aria-label','alt','placeholder','data-footnote-explanation','data-glossary-label','data-tooltip'}

class FlightScripts(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=False);self.inside=False;self.parts=[]
 def handle_starttag(self,t,a):
  if t=='script':self.inside=True
 def handle_endtag(self,t):
  if t=='script':self.inside=False
 def handle_data(self,d):
  if self.inside and d.startswith('self.__next_f.push('):
   try:
    v=json.loads(d[len('self.__next_f.push('):-1])
    if v[0]==1:self.parts.append(v[1])
   except (ValueError,IndexError):pass

def flight_from_html(src):
 p=FlightScripts();p.feed(src);return ''.join(p.parts)

def frames(src):
 raw=src.encode();i=0
 while i<len(raw):
  while i<len(raw)and raw[i]in b'\r\n':i+=1
  if i==len(raw):break
  m=re.match(rb'([0-9a-f]*):',raw[i:])
  if not m:raise ValueError(f'Unrecognised Flight frame at {i}: {raw[i:i+80]!r}')
  key=m[1].decode();i+=m.end()
  if raw[i:i+1]==b'T':
   i+=1;j=raw.index(b',',i);size=int(raw[i:j],16);i=j+1
   yield key,'T',raw[i:i+size].decode();i+=size
  else:
   j=raw.find(b'\n',i)
   if j<0:j=len(raw)
   payload=raw[i:j].decode();i=j+1
   yield key,'J',payload

def models_from_html(src):
 models={}
 for key,kind,value in frames(flight_from_html(src)):
  if kind=='T':models[key]=value
  else:
   try:models[key]=json.loads(value)
   except ValueError:pass
 return models

def find_object(value,key):
 if isinstance(value,dict):
  if key in value:return value
  for child in value.values():
   found=find_object(child,key)
   if found is not None:return found
 if isinstance(value,list):
  for child in value:
   found=find_object(child,key)
   if found is not None:return found
 return None

def resolve_text_refs(value,models):
 if isinstance(value,str)and value.startswith('$')and isinstance(models.get(value[1:]),str):return models[value[1:]]
 if isinstance(value,dict):return {k:resolve_text_refs(v,models)for k,v in value.items()}
 if isinstance(value,list):return [resolve_text_refs(v,models)for v in value]
 return value

def load_dictionary(require_complete=True):
 catalogue=json.loads((ROOT/'translations/catalogue.json').read_text())
 translated={}
 for p in sorted((ROOT/'translations').glob('output-*.json')):translated.update(json.loads(p.read_text()))
 missing=[x['id']for x in catalogue if x['id']not in translated]
 if require_complete and missing:raise ValueError(f'{len(missing)} translation units missing')
 mapping={x['en']:translated[x['id']]for x in catalogue if x['id']in translated}
 manual=ROOT/'translations/manual.json'
 if manual.exists():mapping.update(json.loads(manual.read_text()))
 review=ROOT/'translations/review-story.json'
 if review.exists():mapping.update(json.loads(review.read_text()))
 return mapping,missing

def root_path(value):
 if value.startswith(BASE+'/')or value==BASE:return value
 if value.startswith('/pdf/the-hugging-face-incident.pdf'):return BASE+'/print/?pdf=1'
 if value.startswith('/audio/'):return 'https://huggingface.wtf'+value
 if value.startswith('/')and not value.startswith('//'):return BASE+value
 if value.startswith('https://huggingface.wtf/'):
  rest=value[len('https://huggingface.wtf'):]
  if rest.split('?')[0].rstrip('/')in ['', '/quotes','/sources','/about','/print']:return BASE+rest
 return value

class Translator:
 def __init__(self,mapping):self.mapping=mapping;self.normalised={re.sub(r'\s+',' ',k):v for k,v in mapping.items()};self.changed=0;self.page='home';self.buildtag=hashlib.sha256((json.dumps(mapping,sort_keys=True,ensure_ascii=False)+''.join((ROOT/p).read_text()for p in ['scripts/localise.py','scripts/js-tokens.mjs','scripts/build-mirror.py','src/italiano-boot.js','src/italiano.css'])).encode()).hexdigest()[:12]
 def text(self,value):
  stripped=value.strip()
  if not stripped:return value
  if stripped.startswith(('http://','https://','mailto:','data:')):return value
  translated=self.mapping.get(stripped)
  if translated is None:translated=self.normalised.get(re.sub(r'\s+',' ',stripped))
  if translated is None:
   match=re.fullmatch(r'(\d+)(?:st|nd|rd|th) agent in METR figure 8',stripped)
   if match:translated=f'Agente {match[1]} della figura 8 di METR'
  if translated is None:translated=stripped
  translated=re.sub(r'\b\d{1,3}(?:,\d{3})+\b',lambda m:m[0].replace(',','.'),translated)
  translated=re.sub(r'\b(\d+)\.(\d+)(?=\s*(?:milion|miliard|%))',r'\1,\2',translated)
  if translated==stripped:return value
  self.changed+=1
  return value[:len(value)-len(value.lstrip())]+translated+value[len(value.rstrip()):]
 def html(self,value):
  p=HtmlTranslator(self);p.feed(value);out=''.join(p.out)
  out=re.sub(r'(definirsi [“«\"](?:<[^>]+>)*)compromesso',r'\1compromessi',out)
  joins=ROOT/'translations/review-story-joins.json'
  if joins.exists():
   for old,new in json.loads(joins.read_text()).items():out=out.replace(old,new)
  return out
 def json(self,value,parent=None,key=None):
  if isinstance(value,dict):
   if 'aiMessages' in value and 'documents' in value:
    value=dict(value);value['documents']=dict(value['documents'])
    for message in value['aiMessages']:
     docid=message.get('plainEnglishDocumentId')
     if docid and not value['documents'].get(docid):value['documents'][docid]='<p>'+html.escape(self.text(message['text']),quote=False)+'</p>'
   # Original agent/human quotations remain exact. Italian versions live in their separate rendering documents.
   evidence='text'in value and ('agentId'in value or 'speaker'in value or ('sourceId'in value and 'locator'in value))
   return {k:(v if evidence and k=='text' else self.json(v,value,k))for k,v in value.items()}
  if isinstance(value,list):
   result=[self.json(v,parent,key)for v in value]
   if len(result)==4 and result[0]=='$' and isinstance(result[3],dict):
    if result[1]=='html':result[3]['lang']='it'
    if result[1]=='body':
     previous=result[3].get('children',[]);previous=previous if isinstance(previous,list)else [previous]
     banner=['$','div','italian-edition',{'className':'it-edition-bar','aria-label':'Edizione italiana','children':[['$','span',None,{'children':'Versione italiana non ufficiale'}],['$','a',None,{'href':'https://huggingface.wtf/','target':'_blank','rel':'noopener noreferrer','children':'Originale Lightcone ↗'}],['$','button',None,{'type':'button','className':'it-speech-button','hidden':self.page!='home','aria-pressed':'false','children':'Ascolta in italiano'}]]}]
     result[3]['children']=[banner]+previous
   return result
  if not isinstance(value,str):return value
  if value.startswith('$'):return value
  if value.startswith('/')or value.startswith('https://huggingface.wtf/'):return root_path(value)
  if re.match(r'\s*<(?:[a-zA-Z]|!--)',value):return self.html(value)
  return self.text(value)

class HtmlTranslator(HTMLParser):
 def __init__(self,tr):super().__init__(convert_charrefs=True);self.tr=tr;self.out=[];self.skip=[];self.tags=[]
 def handle_starttag(self,tag,attrs):
  original=self.get_starttag_text()
  if tag not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.tags.append(tag)
  if tag in ['script','style','code','pre']:self.skip.append(tag)
  for key,value in attrs:
   if value is None:continue
   changed=value
   if key=='data-preview':changed=self.tr.html(html.unescape(value))
   elif key in VISIBLE_ATTRS:changed=self.tr.text(value)
   elif key in ['href','src','poster','action']:changed=root_path(value)
   elif tag=='html'and key=='lang':changed='it'
   if changed!=value:
    rx=r'(?<![\w:-])'+re.escape(key)+r'\s*=\s*(["\'])(.*?)\1'
    original=re.sub(rx,lambda m:key+'='+m[1]+html.escape(changed,quote=True)+m[1],original,count=1,flags=re.S|re.I)
  self.out.append(original)
 def handle_startendtag(self,tag,attrs):self.handle_starttag(tag,attrs)
 def handle_endtag(self,tag):
  self.out.append('</'+tag+'>')
  if tag in self.tags:self.tags=self.tags[:len(self.tags)-1-self.tags[::-1].index(tag)]
  if tag in self.skip:self.skip=self.skip[:len(self.skip)-1-self.skip[::-1].index(tag)]
 def handle_data(self,value):
  if not self.skip and 'h1'in self.tags and value.strip()=='The':value=value.replace('The','Il caso')
  self.out.append(value if self.skip else html.escape(self.tr.text(value),quote=False))
 def handle_comment(self,value):self.out.append('<!--'+value+'-->')
 def handle_decl(self,value):self.out.append('<!'+value+'>')
 def handle_pi(self,value):self.out.append('<?'+value+'>')

def translate_flight(source,tr):
 out=[]
 for key,kind,value in frames(source):
  if kind=='T':
   if re.match(r'\s*<(?:[a-zA-Z]|!--)',value):value=tr.html(value)
   out.append(f'{key}:T{len(value.encode()):x},'+value)
  else:
   try:value=json.dumps(tr.json(json.loads(value)),ensure_ascii=False,separators=(',',':'))
   except ValueError:value=value.replace('/_next/',BASE+'/_next/')
   out.append(key+':'+value+'\n')
 return re.sub(r'dpl=dpl_[A-Za-z0-9]+','it='+tr.buildtag,''.join(out))

def translate_js(source,tr,filename=''):
 if filename.startswith(('pdf.worker','1255-','4bd1b696-','6815-','54a60aa6-','6be7e44c-','polyfills-','main-app-')):return re.sub(r'dpl=dpl_[A-Za-z0-9]+','it='+tr.buildtag,source)
 import subprocess
 parsed=subprocess.run(['node',str(ROOT/'scripts/js-tokens.mjs')],input=source,text=True,capture_output=True)
 if parsed.returncode:raise ValueError(filename+': '+parsed.stderr[:1200])
 tokens=json.loads(parsed.stdout)
 framework=filename.startswith(('1255-','4bd1b696-','6815-','54a60aa6-','6be7e44c-','polyfills-','main-app-'))
 changes=[]
 for token in tokens:
  value=token['value'];translated=value
  if filename.startswith('webpack-')and value.endswith('.js')and not value.startswith('http'):translated=value+'?it='+tr.buildtag
  elif value=='/_next/':translated=BASE+'/_next/'
  elif framework or token['protected'] or token['property'] in ['className','class','rel','style','id','key','fontFamily']:continue
  elif value in ['en-US','en-GB']:translated='it-IT'
  elif value.startswith('/')and value.split('?')[0]in ['/about','/quotes','/sources','/print','/icon.svg','/audio/hugging-face-incident.mp3','/pdf/the-hugging-face-incident.pdf']:translated=root_path(value)
  elif value=='/'and token['property']=='href'and token.get('direct'):translated=BASE+'/'
  else:translated=tr.text(value)
  if translated!=value:changes.append((token['start'],token['end'],json.dumps(translated,ensure_ascii=False)))
 # Acorn offsets count UTF-16 code units. Slice through a UTF-16 representation to preserve emoji.
 raw=source.encode('utf-16-le')
 for start,end,value in sorted(changes,reverse=True):raw=raw[:start*2]+value.encode('utf-16-le')+raw[end*2:]
 return raw.decode('utf-16-le')

def localise_page(source,tr,name):
 flight=translate_flight(flight_from_html(source),tr)
 # Remove the old Flight payload scripts and inject the translated stream in their original order.
 old=re.compile(r'<script(?:\s[^>]*)?>self\.__next_f\.push\([\s\S]*?</script>')
 matches=list(old.finditer(source));assert matches,'No Flight data found'
 first=matches[0].start()
 source=old.sub('',source)
 chunks=[flight[i:i+16000]for i in range(0,len(flight),16000)]
 encoded='<script>(self.__next_f=self.__next_f||[]).push([0]);</script>'+''.join('<script>self.__next_f.push([1,'+json.dumps(x,ensure_ascii=False).replace('<','\\u003c')+'])</script>'for x in chunks)
 # Script removal shifts offsets; the first location is unchanged.
 source=source[:first]+encoded+source[first:]
 source=tr.html(source)
 # Early boot handles source caches and navigation before any original JS executes.
 boot=f'<link rel="stylesheet" href="{BASE}/italiano.css?it={tr.buildtag}"><script src="{BASE}/italiano-boot.js?it={tr.buildtag}"></script>'
 source=source.replace('<head>','<head>'+boot,1)
 banner='<div class="it-edition-bar" aria-label="Edizione italiana"><span>Versione italiana non ufficiale</span><a href="https://huggingface.wtf/" target="_blank" rel="noopener noreferrer">Originale Lightcone ↗</a><button type="button" class="it-speech-button"'+(' hidden=""'if name!='home'else '')+' aria-pressed="false">Ascolta in italiano</button></div>'
 source=re.sub(r'(<body[^>]*>)',lambda m:m[1]+banner,source,count=1)
 source=re.sub(r'<link[^>]+rel="canonical"[^>]*>','',source)
 source=source.replace('content="The Hugging Face Incident"','content="Il caso Hugging Face"')
 source=source.replace('https://huggingface.wtf/pdf/the-hugging-face-incident.pdf',BASE+'/print/?pdf=1')
 source=source.replace('href="/pdf/the-hugging-face-incident.pdf"',f'href="{BASE}/print/?pdf=1"')
 return re.sub(r'dpl=dpl_[A-Za-z0-9]+','it='+tr.buildtag,source)
