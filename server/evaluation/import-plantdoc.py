import json, hashlib, pathlib, urllib.parse, urllib.request, concurrent.futures, subprocess
root=pathlib.Path(__file__).resolve().parents[1] / 'dataset' / 'public-evaluation' / 'plantdoc'
candidates=json.loads((root/'candidate-manifest.json').read_text())
revision=candidates['datasetVersion']
previous=json.loads((root.parent / 'plantvillage' / 'manifest.json').read_text())
previous_hashes={x['checksum'] for x in previous['selected']}

def get(item):
 path=item['originalId']; url='https://raw.githubusercontent.com/pratikkayal/PlantDoc-Dataset/'+revision+'/'+urllib.parse.quote(path,safe='/')
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Agropreneur-evaluation'}),timeout=45) as response:
  data=response.read(10*1024*1024+1)
 if len(data)>10*1024*1024 or not data: raise ValueError('Image empty or too large')
 blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\x00'+data).hexdigest()
 if blob!=item['repositoryBlobSha1']: raise ValueError('Repository blob checksum mismatch')
 digest=hashlib.sha256(data).hexdigest(); ext=pathlib.Path(path).suffix.lower()
 out=root/(digest+ext)
 if out.exists() and out.read_bytes()!=data: raise ValueError('Existing file differs')
 if not out.exists(): out.write_bytes(data)
 result=subprocess.run(['/usr/bin/sips','-g','pixelWidth','-g','pixelHeight',str(out)],capture_output=True,text=True,timeout=15)
 valid=result.returncode==0 and 'pixelWidth:' in result.stdout and 'pixelHeight:' in result.stdout
 folder=item['originalLabel']; crop=folder.split(' ')[0].replace('_',' ')
 return {'imageId':digest[:24], 'source':'PlantDoc','originalId':path,'crop':crop,'originalLabel':folder,'normalizedLabel':None,'category':'plantdoc_diseased','license':'CC BY 4.0 repository licence; individual source rights unverified','sourceReference':item['sourceReference'],'checksum':digest,'datasetVersion':revision,'samplingSeed':candidates['seed'],'localPath':out.name,'rightsCleared':False,'imageVerified':valid,'supported':False,'repositoryBlobSha1':blob,'crossDatasetExactDuplicate':digest in previous_hashes,'expertReview':'Not Expert Reviewed'}
results=[];failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 futures={pool.submit(get,item):item['originalId'] for item in candidates['selected']}
 for future in concurrent.futures.as_completed(futures):
  try: results.append(future.result())
  except Exception as e: failures.append({'originalId':futures[future],'error':str(e)})
  print('processed',len(results)+len(failures),'of',len(futures),flush=True)
results.sort(key=lambda x:x['originalId'])
seen=set();duplicates=[]
for item in results:
 if item['checksum'] in seen: duplicates.append(item['imageId'])
 seen.add(item['checksum'])
manifest={'seed':candidates['seed'],'datasetVersion':revision,'selectionMethod':candidates['selectionMethod'],'selected':results,'failures':failures,'duplicateChecksums':duplicates,'crossDatasetExactDuplicates':[x['imageId'] for x in results if x['crossDatasetExactDuplicate']],'notes':['Repository declares CC BY 4.0; original image rights are unverified. No redistribution or AI evaluation until cleared.','Crop parsing is tentative; no normalised disease labels have been approved.','Decoding is not independent diagnosis or label validation.']}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('downloaded',len(results),'failures',len(failures),'invalid images',sum(not x['imageVerified'] for x in results),'within-source duplicates',len(duplicates),'cross-source duplicates',len(manifest['crossDatasetExactDuplicates']),flush=True)
