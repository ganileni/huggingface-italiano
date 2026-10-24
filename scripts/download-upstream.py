from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse,urljoin,unquote
from concurrent.futures import ThreadPoolExecutor,as_completed
import urllib.request,re,json,shutil
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'upstream/assets';ASSETS.mkdir(parents=True,exist_ok=True)
class P(HTMLParser):
 def __init__(self):super().__init__();self.assets=set()
 def handle_starttag(self,t,a):
  a=dict(a)
  for k in ['src','href']:
   u=a.get(k,'')
   if u.startswith('/_next/')or (t in ['img','audio','source']and u.startswith('/')) or u.startswith('/icon.svg'):self.assets.add(u.split('?')[0])
p=P()
for f in (ROOT/'upstream/pages').glob('*.html'):p.feed(f.read_text())
p.assets.update(['/_next/static/chunks/5349.62872f008455ceee.js','/_next/static/chunks/9b0008ae.96b82e3e41cfd88b.js','/_next/static/chunks/1510-08b03cbb5a912015.js','/_next/static/chunks/6797-c61a931dd08a6314.js'])
failures=[]
def download(path):
 target=ASSETS/path.lstrip('/')
 if target.exists():return path,target.stat().st_size,'cached'
 try:
  req=urllib.request.Request('https://huggingface.wtf'+path,headers={'User-Agent':'Italian localisation with author permission'})
  with urllib.request.urlopen(req,timeout=60)as r:b=r.read()
  target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b);return path,len(b),'ok'
 except Exception as e:return path,str(e),'error'
seen=set();pending=p.assets
for wave in range(4):
 current=pending-seen
 if not current:break
 seen|=current;pending=set()
 with ThreadPoolExecutor(max_workers=8)as ex:
  for f in as_completed([ex.submit(download,u)for u in current]):
   path,n,status=f.result()
   if status=='error':failures.append((path,n));continue
   target=ASSETS/path.lstrip('/')
   if target.suffix in ['.css','.js','.mjs']:
    s=target.read_text()
    for u in re.findall(r'(?:url\(["\']?|["\'])([^"\'\s()]+\.(?:woff2|woff|ttf|mjs|png|svg|webp))(?:["\')])',s):
     if u.startswith(('http:','https:','data:')):continue
     url=urljoin('https://huggingface.wtf'+path,u).split('?')[0]
     if urlparse(url).netloc=='huggingface.wtf':pending.add(unquote(urlparse(url).path))
 print('wave',wave,'assets',len(seen),'failures',failures,flush=True)
(ROOT/'upstream/asset-manifest.json').write_text(json.dumps({'paths':sorted(seen),'failures':failures},indent=2))
print('Downloaded bytes',sum(f.stat().st_size for f in ASSETS.rglob('*')if f.is_file()),flush=True)
