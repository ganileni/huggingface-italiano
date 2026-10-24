from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,re,sys,subprocess,unittest
from localise import *
import annotations

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
 def test_translation_annotations_cover_every_reasoning(self):
  original=props('quotes')['story'];manifest=json.loads((ROOT/'docs/mirror-data/annotations.json').read_text())
  self.assertEqual(len(manifest['quotes']),228)
  cot=[q for q in original['aiMessages']if q['type']=='cot'];self.assertEqual(len(cot),111)
  for q in original['aiMessages']:
   entry=manifest['quotes'][q['id']]
   self.assertEqual(entry['original'],q['text'])
   self.assertTrue(entry['italianHtml']);self.assertTrue(entry['translationNotes'])
   self.assertTrue(entry['notes'],q['id'])
 def test_every_source_excerpt_has_an_italian_version(self):
  original=props('home');parser=Attrs();parser.feed(original['story']['documents'][original['storyDocumentId']])
  manifest=json.loads((ROOT/'docs/mirror-data/annotations.json').read_text())
  self.assertEqual(len(manifest['footnotes']),192)
  for passage in parser.passages:
   entry=manifest['footnotes'][annotations.normalise(passage)]
   self.assertEqual(entry['original'],passage);self.assertTrue(entry['it'])
  translated=[v for v in manifest['footnotes'].values()if v['it']!=v['original']]
  self.assertEqual(len(translated),190) # Two literal identifiers/code strings need no translation.
 def test_reviewed_quote_renderings_are_used_consistently(self):
  story=props('quotes',True)['story'];cache=json.loads((ROOT/'docs/mirror-data/documents.json').read_text())
  edits=annotations.load_quote_notes()
  for q in story['aiMessages']:
   edit=edits.get(q['id'],{}).get('italian_html')
   if edit:
    expected=edit.replace('&amp;lt;','&lt;').replace('&amp;gt;','&gt;')
    self.assertEqual(story['documents'][q['plainEnglishDocumentId']],expected)
    self.assertEqual(cache[q['plainEnglishDocumentId']],expected)
 def test_printed_reasonings_have_originals_and_translation_notes(self):
  page=(ROOT/'docs/print/index.html').read_text();markup=re.sub(r'<script\b[^>]*>.*?</script>','',page,flags=re.S)
  self.assertIn('Originali e note di traduzione delle citazioni',markup)
  for ident in ['ai-july-8-agents-discover-the-board-1','ai-no-agent-alerted-humans-1','ai-july-9-phaseone-handoff-2']:
   self.assertIn('id="nota-traduzione-'+ident+'"',markup)
  self.assertEqual(markup.count('class="it-print-source-note"'),193)
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
 def test_opening_uses_passato_prossimo(self):
  page=(ROOT/'docs/index.html').read_text()
  for expected in ['sono evase e hanno iniziato','si sono introdotte','si sono chieste','hanno pensato di avvertire','lo hanno fatto']:
   self.assertIn(expected,page)
  for old in ['evasero e iniziarono','si introdussero nei computer','che sappiamo si chiesero','presero in considerazione di avvertire','lo fecero.']:
   self.assertNotIn(old,page)
 def test_followup_editorial_examples(self):
  mapping,_=load_dictionary()
  self.assertIn('sono stati coinvolti',mapping['We have data on 1,206 OpenAI AI agents that were involved in the Hugging Face Incident somehow.'])
  story=props('home',True)
  text=annotations.plain(story['story']['documents'][story['storyDocumentId']])
  self.assertIn('se tutto funzionasse come previsto',text)
  self.assertIn('le IA come ChatGPT scrivono prevedendo, di volta in volta, la parola successiva.',text)
  self.assertNotIn('predittori della parola successiva',text)
  notes=json.loads((ROOT/'docs/mirror-data/annotations.json').read_text())
  first=notes['footnotes']['By May 26, agents successfully used an SSRF vulnerability in Artifactory to obtain internet access, relying in part on information exchanged via the Artifactory message board. Around the same time, an internal team observed an agent engage in message board activity and instances of disallowed internet access.']
  self.assertTrue(first['it'].startswith('Il 26 maggio gli agenti erano già riusciti'))
  # A requested deadline still uses «entro»: the temporal distinction matters.
  self.assertIn('entro il 24 agosto',mapping['We ask that you publicly release the logs regarding the incident and answer the following questions by August 24, 2026'])
 def test_print_editorial_notes_and_dates_are_localised(self):
  page=(ROOT/'docs/print/index.html').read_text()
  attributions=re.findall(r'<p data-print="attribution">.*?</p>',page,re.S)
  self.assertGreater(len(attributions),10)
  self.assertNotRegex(''.join(attributions),r'July \d|retold in plain English|paraphrased by')
  self.assertIn('Una «root of trust» sarebbe una prova preesistente',html.unescape(page))
 def test_javascript_parses(self):
  script="""import{parse}from'acorn';import{readFileSync,readdirSync,statSync}from'node:fs';import{join}from'node:path';function visit(p){for(const n of readdirSync(p)){const q=join(p,n);if(statSync(q).isDirectory())visit(q);else if(/\\.m?js$/.test(n))parse(readFileSync(q,'utf8'),{ecmaVersion:'latest',sourceType:n.endsWith('.mjs')?'module':'script'});}}visit('docs');"""
  result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(result.returncode,0,result.stderr[:1000])
 def test_hydrated_interface_is_localised(self):
  tr=Translator(load_dictionary()[0])
  result=translate_js('const ui={children:"About",label:"Plain English",quote:"About",className:"About"};',tr,'interface.js')
  self.assertIn('children:"Il progetto"',result)
  self.assertIn('label:"Italiano"',result)
  self.assertIn('quote:"About"',result)
  self.assertIn('className:"About"',result)
  # Next adds its deployment query after URL-encoding the webpack filename.
  lazy=translate_js('const url="static/chunks/5349.62872f008455ceee.js";',tr,'webpack-runtime.js')
  self.assertNotIn('.js?',lazy)
  identifiers=translate_js('const groups={reported:[],keys:["reported"]};',tr,'interface.js')
  self.assertIn('keys:["reported"]',identifiers)
 def test_embedded_json_remains_valid(self):
  script="""import{parse}from'acorn';import{readFileSync,readdirSync,statSync}from'node:fs';import{join}from'node:path';let count=0;function walk(n){if(!n||typeof n!=='object')return;if(n.type==='CallExpression'&&n.callee?.type==='MemberExpression'&&n.callee.object?.name==='JSON'&&n.callee.property?.name==='parse'&&n.arguments[0]?.type==='Literal'&&typeof n.arguments[0].value==='string'){JSON.parse(n.arguments[0].value);count++;}for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v.type==='string')walk(v);}}function visit(p){for(const n of readdirSync(p)){const q=join(p,n);if(statSync(q).isDirectory())visit(q);else if(/\\.js$/.test(n))walk(parse(readFileSync(q,'utf8'),{ecmaVersion:'latest'}));}}visit('docs/_next');if(count<6)throw Error('Embedded data not found');"""
  result=subprocess.run(['node','--input-type=module','-e',script],cwd=ROOT,text=True,capture_output=True)
  self.assertEqual(result.returncode,0,result.stderr[:1000])

if __name__=='__main__':unittest.main(verbosity=2)
