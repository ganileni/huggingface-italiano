from pathlib import Path
from html.parser import HTMLParser
import json,re,html,hashlib,collections,sys
ROOT=Path(__file__).resolve().parents[1]
from localise import models_from_html,find_object,resolve_text_refs
props={}
for n in ['home','quotes']:
 models=models_from_html((ROOT/'upstream/pages'/f'{n}.html').read_text());props[n]=resolve_text_refs(find_object(models,'story'),models)
units={}; scopes=collections.defaultdict(list)
SKIP={'Hugging Face','OpenAI','METR','Redwood Research','Lightcone Infrastructure','Artifactory','ExploitGym','CyberGym','Modal','Kubernetes','WebDAV','UTC','PDF','GitHub','PHASEONE10841','PHASEONE[big]','LILY'}
def add(text,ctx,scope):
 text=text.strip()
 if not text or text in SKIP or not re.search('[A-Za-z]',text) or re.fullmatch(r'[A-Z0-9_\[\]/.:-]+',text) or re.match(r'^(https?://|/api/|/_next/|data:)',text):return
 ident=hashlib.sha1(text.encode()).hexdigest()[:12]
 if ident not in units: units[ident]={'id':ident,'en':text,'contexts':[],'scope':scope}
 if ctx not in units[ident]['contexts'] and len(units[ident]['contexts'])<2:units[ident]['contexts'].append(ctx[:600])
class H(HTMLParser):
 def __init__(self,src,ctx,scope):super().__init__(convert_charrefs=True);self.src=src;self.ctx=ctx;self.scope=scope;self.stack=[]
 def handle_starttag(self,t,a):
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append(t)
  for k,v in a:
   if v and k in ['title','aria-label','alt','placeholder','data-footnote-explanation','data-glossary-label','data-tooltip']:add(v,self.ctx+' / '+k,self.scope)
 def handle_endtag(self,t):
  if t in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(t)]
 def handle_data(self,d):
  if not any(t in self.stack for t in ['script','style','code','pre']):
   line,col=self.getpos();offset=sum(len(s)for s in self.src.splitlines(True)[:line-1])+col
   context=html.unescape(re.sub('<[^>]+>',' ',self.src[max(0,offset-160):offset+len(d)+160]))
   add(d,self.ctx+' / '+context,self.scope)
def html_units(src,ctx,scope):H(src,ctx,scope).feed(src)
main=props['home']['story']['documents'][props['home']['storyDocumentId']]
html_units(main,'racconto principale','story')
# All active glossary entries and conversation descriptions, including those in agent cards.
for key,value in props['home']['story']['documents'].items():
 if key!=props['home']['storyDocumentId'] and not key.startswith('message-plain-english-'):
  html_units(value,key,'context')
# Provide an Italian rendering of every original agent message, even when no plain-English rendering exists.
for message in props['quotes']['story']['aiMessages']:
 doc=props['quotes']['story']['documents'].get(message.get('plainEnglishDocumentId'))
 if doc:html_units(doc,'citazione '+message['id'],'quotes')
 else:add(message['text'],'citazione originale '+message['id'],'quotes')
# Context descriptions accessible from nodes in the archive.
for node in props['quotes']['story']['nodes']:
 key=node.get('documentId');value=props['quotes']['story']['documents'].get(key,'')
 if value:html_units(value,key,'nodes')
# Metadata visible in filters, agent cards and source menus; never translate IDs or original evidence.
for name,p in props.items():
 for x in p['story']['narrativeTags']:
  if x['tagType']!='display':add(x['name'],'filtro '+x['tagType'],'labels')
 for x in p['sources']:add(x['title'],'titolo fonte','labels')
 for x in p['story']['characters']:
  if x.get('note'):add(x['note'],'scheda persona '+x.get('name',''),'context')
 for x in p.get('packedAgents',p['story'].get('agents',[])):
  if isinstance(x,dict) and not re.match(r'^\d+(?:st|nd|rd|th) agent in METR figure 8$',x.get('label','')) and (' ' in x.get('label','')):add(x.get('label',''),'etichetta agente','labels')
for name in ['about','sources']:
 html_units((ROOT/'upstream/pages'/f'{name}.html').read_text(),'pagina '+name,'labels')
# Static visible UI and tooltips from the original app bundles. Library/debug strings are excluded.
custom=['116-c105742fa80c9a50.js','6122-ecee330fd8919fa8.js','9882-79902a88d331a09c.js','934-a53c3887525fd3fb.js','2702-a0312c96e969394b.js','2764-d304493b4e2d98d8.js','4321-a6c1f95007431bb5.js','5376-f9033e064f294b41.js','9407-24d5248fc3f7b385.js','9560-121c4624f6f726a5.js','4508-d7f47f318fa9b2d2.js','176-24dae16138a93c3b.js','page-12e009dce1621f6e.js','page-b0a83e1db48cabf8.js','page-c14e3ce2a48bd5b7.js']
for filename in custom:
 source=next((ROOT/'upstream/assets').rglob(filename),None)
 if source is None:continue
 s=source.read_text()
 for m in re.finditer(r'"(?:\\.|[^"\\])*"',s):
  try:v=json.loads(m.group())
  except:continue
  if not re.search(r'[A-Za-z]',v) or len(v)>9000:continue
  if any(k in v for k in ['className:','function(','display:','padding:','[&','text-','font-','bg-','flex ','flex-','grid-','rounded-','aria-','data-','https://','http://','--','document.']):continue
  if re.fullmatch(r'[a-z0-9_./:#\[\]()-]+',v):continue
  if re.search(r'(?:translate|rgba|[{}]|=>|;return|\.concat|[a-z]=|svg)',v):continue
  if re.search(r'(?:className|fontFamily|rel|key|type|method|role|position|display):$',s[max(0,m.start()-30):m.start()]):continue
  if re.search(r'(?:^| )(?:absolute|relative|sticky|block|hidden|contents|flex|grid|inline|size-|h-|w-|transition-|opacity-|overflow-|group|peer|pointer-|cursor-|select-|whitespace-|leading-|items-|justify-|inset-|top-|left-|right-|bottom-|p-|m-|gap-|border-|rounded-|saturate-|motion-|duration-|focus:|hover:)',v):continue
  if v in ['use strict','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab','Backspace','Delete','Object.assign(','noopener noreferrer'] or v.endswith('\\'):continue
  if v.startswith(('M','m')) and re.match(r'^[Mm][\d .,-]',v):continue
  if (len(v)>1 and (re.search(r'\s[A-Za-z]',v) or v[0].isupper())):add(v,'interfaccia '+filename+' / '+s[max(0,m.start()-50):m.start()][:50],'ui')
# Print contains source quotations that remain as original evidence, but all explanatory/UI text is collected.
print_text=(ROOT/'upstream/pages/print.html').read_text()
# Its main prose is already covered by the live story; collect only text not in footnote evidence through live primary docs.
# Write a stable deduplicated catalogue and balanced asset-translation shards.
all_units=list(units.values());(ROOT/'translations/catalogue.json').write_text(json.dumps(all_units,ensure_ascii=False,indent=2))
for scope in ['story','quotes','context','nodes','labels','ui']:
 us=[u for u in all_units if u['scope']==scope];print(scope,len(us),sum(len(x['en'].split())for x in us))
shards=[[]for _ in range(5)];words=[0]*5
# Keep main prose in order in one shard; quotes in a second; split supplementary context by workload.
for u in all_units:
 if u['scope']=='story':i=0
 elif u['scope']=='quotes':i=1
 elif u['scope']=='ui':i=min([1,2,3,4],key=lambda j:words[j])
 else:i=min([2,3,4],key=lambda j:words[j])
 shards[i].append(u);words[i]+=len(u['en'].split())
for i,shard in enumerate(shards):
 (ROOT/f'translations/input-{i+1}.json').write_text(json.dumps(shard,ensure_ascii=False,indent=2));print('shard',i+1,len(shard),words[i])
