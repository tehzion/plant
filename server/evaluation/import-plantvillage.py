import io, os, json, hashlib, random, struct, urllib.request, zipfile, zlib, concurrent.futures, subprocess
from pathlib import Path
URL='https://huggingface.co/datasets/mohanty/PlantVillage/resolve/9e97599868962bd0079b8db4b7f1efa9185fa1e7/data.zip'
REV='9e97599868962bd0079b8db4b7f1efa9185fa1e7'
ROOT=Path(__file__).resolve().parents[1] / 'dataset' / 'public-evaluation' / 'plantvillage'
ROOT.mkdir(parents=True, exist_ok=True)
class Remote(io.RawIOBase):
 def __init__(self):
  with urllib.request.urlopen(urllib.request.Request(URL,method='HEAD'),timeout=45) as r: self.url=r.url; self.size=int(r.headers['Content-Length'])
  self.pos=0
 def seekable(self): return True
 def readable(self): return True
 def tell(self): return self.pos
 def seek(self,offset,whence=0): self.pos=offset if whence==0 else self.pos+offset if whence==1 else self.size+offset; return self.pos
 def read(self,size=-1):
  if size<0: size=self.size-self.pos
  if not size: return b''
  end=min(self.pos+size,self.size)-1
  req=urllib.request.Request(self.url,headers={'Range':f'bytes={self.pos}-{end}'})
  with urllib.request.urlopen(req,timeout=60) as r:
   if r.status != 206: raise RuntimeError(f'Range request unsupported: {r.status}')
   data=r.read(size+1)
  if len(data)!=end-self.pos+1: raise RuntimeError('Incomplete range')
  self.pos+=len(data);return data
remote=Remote()
with zipfile.ZipFile(remote) as z:
 infos={x.filename:x for x in z.infolist()}
 split_url=f'https://huggingface.co/datasets/mohanty/PlantVillage/resolve/{REV}/splits/color_test.txt'
 with urllib.request.urlopen(split_url,timeout=60) as response:
  paths=[x.strip() for x in response.read().decode('utf-8').splitlines() if x.strip()]
 def entry(p):
  if p in infos:return infos[p]
  matches=[v for k,v in infos.items() if k.endswith('/'+p)]
  return matches[0] if len(matches)==1 else None
 available=[(p,entry(p)) for p in paths]
 available=[(p,v) for p,v in available if v is not None]
 healthy=sorted((p,v) for p,v in available if '___healthy/' in p.lower())
 diseased=sorted((p,v) for p,v in available if '___healthy/' not in p.lower())
 rnd=random.Random(20261031)
 picks=[(p,v,'healthy') for p,v in rnd.sample(healthy,min(20,len(healthy)))]+[(p,v,'plantvillage_diseased') for p,v in rnd.sample(diseased,min(40,len(diseased)))]
 print('archive entries',len(infos),'test matches',len(available),'selected',len(picks),flush=True)
 def fetch(pick):
  name,info,category=pick
  begin=info.header_offset; end=begin+30+65535*2+info.compress_size-1
  req=urllib.request.Request(remote.url,headers={'Range':f'bytes={begin}-{min(end,remote.size-1)}'})
  with urllib.request.urlopen(req,timeout=60) as r:
   if r.status!=206:raise RuntimeError('Range unsupported')
   block=r.read(30+65535*2+info.compress_size)
  if block[:4]!=b'PK\x03\x04':raise RuntimeError('Invalid zip header')
  namelen,extralen=struct.unpack_from('<HH',block,26)
  payload=block[30+namelen+extralen:30+namelen+extralen+info.compress_size]
  data=zlib.decompress(payload,-15) if info.compress_type==8 else payload if info.compress_type==0 else None
  if data is None or len(data)!=info.file_size or (zlib.crc32(data)&0xffffffff)!=info.CRC:raise RuntimeError('CRC or size mismatch')
  digest=hashlib.sha256(data).hexdigest(); filename=digest+'.jpg'; out=ROOT/filename
  if out.exists() and out.read_bytes()!=data: raise RuntimeError('Existing image differs')
  if not out.exists():out.write_bytes(data)
  v=subprocess.run(['/usr/bin/sips','-g','pixelWidth','-g','pixelHeight',str(out)],capture_output=True,text=True,timeout=15)
  valid=v.returncode==0 and 'pixelWidth:' in v.stdout and 'pixelHeight:' in v.stdout
  folder=name.split('/')[2]; crop,label=folder.split('___',1)
  return {'imageId':digest[:24], 'source':'PlantVillage','originalId':name,'crop':crop.replace('_',' '),'originalLabel':label,'normalizedLabel':label.replace('_',' ').strip(),'category':category,'license':'CC BY-SA 3.0 (dataset card; review use terms)','sourceReference':'https://huggingface.co/datasets/mohanty/PlantVillage','checksum':digest,'datasetVersion':REV,'samplingSeed':20261031,'localPath':filename,'rightsCleared':False,'imageVerified':valid,'supported':False,'split':'color/test','expertReview':'Not Expert Reviewed'}
 results=[];failures=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
  futures={ex.submit(fetch,x):x[0] for x in picks}
  for future in concurrent.futures.as_completed(futures):
   try: results.append(future.result())
   except Exception as e: failures.append({'originalId':futures[future], 'error':str(e)})
   print('finished',len(results)+len(failures),'of',len(picks),flush=True)
 results.sort(key=lambda x:(x['category'],x['originalId']))
 seen=set();duplicates=[]
 for x in results:
  if x['checksum'] in seen: duplicates.append(x['imageId'])
  seen.add(x['checksum'])
 manifest={'seed':20261031,'datasetVersion':REV,'selectionMethod':'Python random.Random seed, sample from sorted official color test split, healthy then diseased','selected':results,'failures':failures,'duplicateChecksums':duplicates,'targets':{'healthy':20,'plantvillage_diseased':40,'plantdoc_diseased':30,'difficult':10},'notes':['Source dataset licence is stated on the authors dataset card; rightsCleared is false pending project-specific rights review.','supported is false pending approved crop and condition mapping.','Decoding checked with sips; disease labels and difficult cases not independently verified.','No PlantDoc images imported; image-level source rights have not been cleared.']}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('complete',len(results),'failures',len(failures),'duplicates',len(duplicates),'decode failures',sum(not x['imageVerified'] for x in results),flush=True)
