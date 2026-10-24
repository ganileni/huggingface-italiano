import re,json
from pathlib import Path

def parse(data):
 b=data.encode();i=0;out={}
 while i<len(b):
  while i<len(b) and b[i] in b'\n\r':i+=1
  m=re.match(rb'([0-9a-f]*):([A-Z]?)',b[i:])
  if not m:
   i+=1;continue
  key=m[1].decode();tag=m[2].decode();i+=m.end()
  if tag=='T':
   j=b.index(b',',i);n=int(b[i:j],16);i=j+1;out[key]=b[i:i+n].decode();i+=n
  else:
   j=b.find(b'\n',i)
   if j<0:j=len(b)
   raw=b[i:j].decode();i=j+1
   if tag=='':
    try:out[key]=json.loads(raw)
    except:pass
 return out
if __name__=='__main__':
 for name in ['home','quotes','sources']:
  out=parse(Path('/tmp/hf-'+name+'-flight.txt').read_text());Path('/tmp/hf-'+name+'-models.json').write_text(json.dumps(out,ensure_ascii=False))
  print(name,'models',len(out),'text rows',sum(isinstance(v,str) for v in out.values()))
  def walk(v,p):
   if isinstance(v,dict):
    if any(k in v for k in ['narrativeDocumentId','plainEnglishDocumentId']):return
    for k,a in v.items():
     if k in ['children','style','className']:pass
     elif isinstance(a,list) and len(a)>8:print(p+'.'+k,'array',len(a),'first keys',list(a[0])[:12] if isinstance(a[0],dict) else str(a[0])[:50])
     elif isinstance(a,dict) and len(a)>8:print(p+'.'+k,'object',len(a),'keys',list(a)[:12])
     elif isinstance(a,str) and (len(a)>1000 or (k not in ['className','href','src'] and not a.startswith('$') and 'initial' in k.lower())):print(p+'.'+k,'str',len(a),repr(a[:90]))
     walk(a,p+'.'+k)
   elif isinstance(v,list):
    for i,a in enumerate(v):walk(a,p+f'[{i}]')
  for key,v in out.items():
   if isinstance(v,str) and len(v)>1000:print('row',key,'text',len(v),v[:65])
   else:walk(v,key)
