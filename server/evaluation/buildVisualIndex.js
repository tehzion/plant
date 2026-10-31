import { readFile, writeFile } from 'node:fs/promises';
import { extractVisualFeatures } from './visualRetrieval.js';
const [splitPath,output] = process.argv.slice(2);
if(!output) throw Error('Usage: node server/evaluation/buildVisualIndex.js SPLIT NEW_INDEX.json');
const split=JSON.parse(await readFile(splitPath,'utf8'));
const reserved=new Set(split.selected.map(r=>r.checksum));
const withheld=['c256a583','6caf2ad4','b21f34ff','9dd93b42','3c52144e'];
const images=[];
for(const item of split.development) {
    if(reserved.has(item.checksum)) throw Error('Holdout overlap');
    if(item.excluded || withheld.some(p=>item.checksum.startsWith(p))) continue;
    images.push({...item,features:await extractVisualFeatures(item.blindImagePath,item.checksum)});
}
await writeFile(output,JSON.stringify({schemaVersion:1,freezeId:split.freezeId,method:'RGB histogram + spatial colour; average-hash near-duplicate filter; exploratory only',images},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({indexed:images.length,reservedImagesUsed:0}));
