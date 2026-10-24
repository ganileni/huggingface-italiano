from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,re,sys,subprocess,unittest
from localise import *

class Attrs(HTMLParser):
 def __init__(self):super().__init__();self.passages=[];self.links=[];self.text=[];self.skip=0
 def handle_starttag(self,t,a):
  a=dict(a)
  if t in ['script','style']:self.skip+=1
  if 'data-footnote-passage'in a:self.passages.append(a['data-footnote-passage'])
  for k in ['src','href']:
   if k in a:self.links.append(a[k])
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,d):
  if not self.skip:self.text.append(d)

def props(name,translated=False):
 raw=(ROOT/('docs/'+PAGES[name]+'/index.html'if translated and PAGES[name]else 'docs/index.html'if translated else 'upstream/pages/'+name+'.html')).read_text()
 m=models_from_html(raw);return resolve_text_refs(find_object(m,'story'),m)

class Localisation(unittest.TestCase):
 def test_complete_catalogue(self):
  mapping,missing=load_dictionary();self.assertFalse(missing);self.assertGreater(len(mapping),4000)
 def test_original_agent_transcripts_preserved(self):
  for name in ['home','quotes']:
   old=props(name)['story'];new=props(name,True)['story']
   self.assertEqual([(x['id'],x['text'])for x in old['aiMessages']],[(x['id'],x['text'])for x in new['aiMessages']])
   self.assertEqual([(x['id'],x['text'])for x in old['humanQuotes']],[(x['id'],x['text'])for x in new['humanQuotes']])
 def test_all_agent_messages_have_italian_renderings(self):
  p=props('quotes',True);docs=p['story']['documents']
  self.assertEqual(len(p['story']['aiMessages']),228)
  for q in p['story']['aiMessages']:self.assertTrue(docs.get(q['plainEnglishDocumentId']),q['id'])
 def test_historical_data_unchanged(self):
  old=props('home');new=props('home',True)
  for key in ['workstreamProfiles','referenceSeats']:self.assertEqual(old[key],new[key])
  self.assertEqual(len(old['packedAgents']),len(new['packedAgents']))
  for a,b in zip(old['packedAgents'],new['packedAgents']):
   if isinstance(a,dict):
    for key in ['id','family','metr']:self.assertEqual(a.get(key),b.get(key))
   else:self.assertEqual(a,b)
 def test_primary_citation_passages_preserved(self):
  a=props('home');b=props('home',True);key=a['storyDocumentId']
  old=Attrs();old.feed(a['story']['documents'][key]);new=Attrs();new.feed(b['story']['documents'][key])
  self.assertEqual(old.passages,new.passages)
 def test_original_source_documents_preserved(self):
  for p in (ROOT/'upstream/api/sources').glob('*.json'):
   self.assertEqual(p.read_bytes(),(ROOT/'docs/mirror-data/sources'/p.name).read_bytes())
  for p in (ROOT/'upstream/api/pdf').glob('*.pdf'):
   self.assertEqual(hashlib.sha256(p.read_bytes()).digest(),hashlib.sha256((ROOT/'docs/mirror-data/pdf'/p.name).read_bytes()).digest())
 def test_local_assets_and_routes_exist(self):
  for name,path in PAGES.items():
   document=ROOT/'docs'/path/'index.html';self.assertTrue(document.exists());p=Attrs();p.feed(document.read_text());self.assertIn('lang="it"',document.read_text()[:200])
   for link in p.links:
    if not link.startswith(BASE+'/'):continue
    target=link[len(BASE)+1:].split('?')[0].split('#')[0]
    file=ROOT/'docs'/target
    if file.is_dir():file=file/'index.html'
    if not file.exists()and (ROOT/'docs'/target/'index.html').exists():file=ROOT/'docs'/target/'index.html'
    self.assertTrue(file.exists(),f'{name}: {link}')
 def test_italian_title_and_terminology(self):
  mapping,_=load_dictionary();self.assertEqual(mapping['The Hugging Face Incident'],'Il caso Hugging Face')
  all_it='\n'.join(mapping.values()).lower()
  for wrong in ['faccia di abbraccio','apprendimento da rinforzo','apprendimento per rinforzo']:
   self.assertNotIn(wrong,all_it)
 def test_javascript_parses(self):
  script="""import{parse}from'acorn';import{readFileSync,readdirSync,statSync}from'node:fs';import{join}from'node:path';function visit(p){for(const n of readdirSync(p)){const q=join(p,n);if(statSync(q).isDirectory())visit(q);else if(/\\.m?js$/.test(n))parse(readFileSync(q,'utf8'),{ecmaVersion:'latest',sourceType:n.endsWith('.mjs')?'module':'script'});}}visit('docs');"""
  result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(result.returncode,0,result.stderr[:1000])

if __name__=='__main__':unittest.main(verbosity=2)
