import { canonicalCrop } from './cropNames.js';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
const exec = promisify(execFile);

// Deliberately simple visual baseline, not a trained disease embedding.
export function bmpFeatures(bytes) {
    if (bytes.toString('ascii',0,2)!=='BM' || bytes.length < 54) throw Error('Invalid BMP');
    const offset=bytes.readUInt32LE(10), width=bytes.readInt32LE(18), signedHeight=bytes.readInt32LE(22);
    const height=Math.abs(signedHeight), bpp=bytes.readUInt16LE(28), compression=bytes.readUInt32LE(30);
    if (width!==32 || height!==32 || ![24,32].includes(bpp) || compression!==0) throw Error('Expected 32x32 uncompressed RGB BMP');
    const stride=Math.ceil(width*bpp/32)*4;
    if (offset+stride*height>bytes.length) throw Error('Truncated BMP');
    const histogram=Array(24).fill(0), layout=Array(48).fill(0), grey=[];
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
        const pos=offset+(signedHeight>0?height-1-y:y)*stride+x*bpp/8;
        const rgb=[bytes[pos+2],bytes[pos+1],bytes[pos]];
        for(let c=0;c<3;c++) {histogram[c*8+Math.min(7,Math.floor(rgb[c]/32))]+=1/1024;
            layout[(Math.floor(y/8)*4+Math.floor(x/8))*3+c]+=rgb[c]/(255*64);}
        grey.push((rgb[0]+rgb[1]+rgb[2])/3);
    }
    const average=grey.reduce((a,b)=>a+b,0)/grey.length;
    return {vector:[...histogram,...layout], averageHash:grey.map(v=>v>=average?'1':'0').join('')};
}
export async function extractVisualFeatures(file, checksum) {
    const bytes=await readFile(file);
    if(createHash('sha256').update(bytes).digest('hex')!==checksum) throw Error('Retrieval image checksum mismatch');
    const dir=await mkdtemp(path.join(tmpdir(),'plant-retrieval-'));
    try {
        const output=path.join(dir,'thumbnail.bmp');
        await exec('/usr/bin/sips',['-s','format','bmp','-z','32','32',file,'--out',output],{timeout:10000,maxBuffer:65536});
        return bmpFeatures(await readFile(output));
    } finally {await rm(dir,{recursive:true,force:true});}
}
export function retrieveReferences(query,index,{allowedChecksums,reservedChecksums=[],limit=2}={}) {
    if(!Array.isArray(allowedChecksums) || !Number.isInteger(limit) || limit<1 || limit>4) throw Error('Explicit development allowlist and limit 1-4 required');
    const allowed=new Set(allowedChecksums), reserved=new Set(reservedChecksums);
    if(!allowed.has(query.checksum) || reserved.has(query.checksum)) throw Error('Query is outside development set');
    const valid=feature=>Array.isArray(feature?.vector) && feature.vector.length===72 && feature.vector.every(Number.isFinite)
        && typeof feature.averageHash==='string' && /^[01]{1024}$/.test(feature.averageHash);
    if(!valid(query.features)) throw Error('Missing visual features');
    return index.filter(item=>allowed.has(item.checksum) && !reserved.has(item.checksum) && item.checksum!==query.checksum
        && !item.excluded && valid(item.features)
        && canonicalCrop(query.crop) && canonicalCrop(item.crop)===canonicalCrop(query.crop)
        && (!query.leakageGroup || item.leakageGroup!==query.leakageGroup)
        && item.features.averageHash.split('').filter((v,i)=>v!==query.features.averageHash[i]).length>20)
        .map(item=>({...item,distance:Math.sqrt(item.features.vector.reduce((sum,value,i)=>sum+(value-query.features.vector[i])**2,0))}))
        .sort((a,b)=>a.distance-b.distance || a.checksum.localeCompare(b.checksum)).slice(0,limit);
}
