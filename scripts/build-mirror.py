from pathlib import Path
import json,shutil,re,hashlib
from urllib.parse import urljoin,urlparse
from html.parser import HTMLParser
from localise import *
import annotations
import sys
# Extract the frozen, authorised upstream snapshot on a fresh checkout.
if not (ROOT/'upstream/pages/home.html').exists():
 import tarfile
 import io
 manifest=json.loads((ROOT/'upstream/snapshot-manifest.json').read_text())
 packed=b''.join((ROOT/'upstream'/name).read_bytes()for name in manifest['parts'])
 if hashlib.sha256(packed).hexdigest()!=manifest['sha256']:raise ValueError('Invalid source snapshot checksum')
 with tarfile.open(fileobj=io.BytesIO(packed),mode='r:gz')as archive:archive.extractall(ROOT/'upstream',filter='data')
mapping,missing=load_dictionary(require_complete='--preview'not in sys.argv)
tr=Translator(mapping);out=ROOT/'docs'
# Use the same Italian quote renderings in the app, annotations and polling cache.
documents={};quote_story=None
for name in ['home','quotes']:
 raw=(ROOT/'upstream/pages'/f'{name}.html').read_text();models=models_from_html(raw);props=resolve_text_refs(find_object(models,'story'),models)
 documents.update({k:tr.html(v)for k,v in props['story']['documents'].items()})
 for message in props['story']['aiMessages']:
  key=message.get('plainEnglishDocumentId');edit=tr.quote_notes.get(message['id'],{}).get('italian_html')
  if edit:documents[key]=edit
  elif key and not props['story']['documents'].get(key):documents[key]='<p>'+html.escape(tr.text(message['text']),quote=False)+'</p>'
 if name=='quotes':quote_story=props['story']
documents={key:value.replace('&amp;lt;','&lt;').replace('&amp;gt;','&gt;')for key,value in documents.items()}
evidence=annotations.manifest(quote_story,documents,tr);tr.print_quotes=evidence['quotes']
class Assets(HTMLParser):
 def __init__(self):super().__init__();self.fonts=set()
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='link' and a.get('as')=='font':self.fonts.add(a['href'].split('?')[0])
assets=Assets()
for p in (ROOT/'upstream/pages').glob('*.html'):assets.feed(p.read_text())
if out.exists():shutil.rmtree(out)
out.mkdir();(out/'.nojekyll').write_text('')
for src in (ROOT/'upstream/assets').rglob('*'):
 if not src.is_file()or '/audio/'in str(src):continue
 relative='/'+str(src.relative_to(ROOT/'upstream/assets'))
 if src.suffix in ['.woff2','.woff','.ttf']and relative not in assets.fonts:continue
 target=out/src.relative_to(ROOT/'upstream/assets');target.parent.mkdir(parents=True,exist_ok=True)
 if src.suffix in ['.js','.mjs']:target.write_text(translate_js(src.read_text(),tr,src.name))
 elif src.suffix=='.css':
  css=src.read_text()
  def font_url(match):
   raw=match[1].strip('\"\'')
   if not re.search(r'\.(?:woff2?|ttf)(?:\?|$)',raw):return match[0]
   resolved=urljoin('https://huggingface.wtf'+relative,raw)
   if urlparse(resolved).path in assets.fonts:return match[0]
   return 'url(\"'+resolved+'\")'
  target.write_text(re.sub(r'url\(([^)]+)\)',font_url,css))
 else:shutil.copy2(src,target)
for name,folder in PAGES.items():
 tr.page=name
 dest=out/folder;dest.mkdir(exist_ok=True)
 (out/'mirror-data/flight').mkdir(parents=True,exist_ok=True)
 (out/'mirror-data/flight'/f'{name}.txt').write_text(translate_flight(flight_from_html((ROOT/'upstream/pages'/f'{name}.html').read_text()),tr))
 dest.joinpath('index.html').write_text(localise_page((ROOT/'upstream/pages'/f'{name}.html').read_text(),tr,name))
for name in ['italiano-boot.js','italiano-note.js','italiano.css']:(out/name).write_text((ROOT/'src'/name).read_text().replace('__BUILD_TAG__',tr.buildtag))
# Read-only source-viewer cache. These are source documents, preserved in their original language.
cache=out/'mirror-data';shutil.copytree(ROOT/'upstream/api',cache,dirs_exist_ok=True)
index=json.loads((cache/'sources-index.json').read_text())
for item in index:item['title']=tr.text(item['title'])
(cache/'sources-index.json').write_text(json.dumps(index,ensure_ascii=False,separators=(',',':')))
# Cache all rendering documents in Italian for the original reader's read-only polling.
(cache/'documents.json').write_text(json.dumps(documents,ensure_ascii=False,separators=(',',':')))
(cache/'annotations.json').write_text(json.dumps(evidence,ensure_ascii=False,separators=(',',':')))
# A browser fallback dictionary covers UI inserted after the initial render.
(cache/'ui.it.json').write_text(json.dumps({k:v for k,v in mapping.items()if len(k)<1000 and k!=v},ensure_ascii=False,separators=(',',':')))
manifest={'build':tr.buildtag,'snapshot':'2026-10-24','original':'https://huggingface.wtf/','permission':'confirmed-by-user','translationUnits':len(mapping),'missingUnits':len(missing),'pages':list(PAGES.values()),'originalAgentTranscripts':228,'liveAgentData':True,'sourceDocumentsLanguage':'original','translatedSourceExcerpts':len(evidence['footnotes']),'annotatedReasonings':sum(q['kind']=='cot'for q in evidence['quotes'].values())}
(cache/'localisation.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Built authorised Italian mirror:',len(mapping),'translation units;',len(missing),'pending; replacements:',tr.changed)
