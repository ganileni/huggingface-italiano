from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import urllib.request,json
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'upstream/api';(OUT/'sources').mkdir(parents=True,exist_ok=True);(OUT/'pdf').mkdir(exist_ok=True)
index=json.loads(Path('/tmp/hf-api-sources.json').read_text());(OUT/'sources-index.json').write_text(json.dumps(index,ensure_ascii=False))
p=json.loads(Path('/tmp/hf-home-props.json').read_text());keys=set(x['key']for x in p['sources'])|set(x['id']for x in index)
def get(key):
 target=OUT/'sources'/f'{key}.json'
 try:
  if target.exists():d=json.loads(target.read_text())
  else:
   b=urllib.request.urlopen('https://huggingface.wtf/api/sources/'+key,timeout=65).read();d=json.loads(b);target.write_bytes(b)
  if d.get('kind')=='pdf':
   pdf=OUT/'pdf'/f'{key}.pdf'
   if not pdf.exists():pdf.write_bytes(urllib.request.urlopen('https://huggingface.wtf/api/sources/'+key+'/pdf',timeout=90).read())
  return key,d.get('kind'),target.stat().st_size
 except Exception as e:
  error={'kind':'error','error':str(e),'url':next((x['url']for x in index if x['id']==key),'https://huggingface.wtf/sources')};target.write_text(json.dumps(error));return key,'error',str(e)
with ThreadPoolExecutor(max_workers=8)as ex:
 for i,f in enumerate(as_completed([ex.submit(get,key)for key in sorted(keys)]),1):
  key,kind,size=f.result()
  if kind=='error':print(key,kind,size,flush=True)
  if i%10==0:print('Sources',i,'/',len(keys),flush=True)
print('Complete:',len(keys),'sources;',sum(p.stat().st_size for p in OUT.rglob('*')if p.is_file()),'bytes',flush=True)
