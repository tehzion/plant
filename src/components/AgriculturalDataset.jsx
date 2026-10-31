import { useEffect, useState } from 'react';
import { getNeonAccessToken, neonApiRequest } from '../utils/neonApi.js';

const base='/api/admin/evaluation/dataset';
export default function AgriculturalDataset() {
    const [data,setData]=useState(null), [error,setError]=useState(''), [source,setSource]=useState(''), [offset,setOffset]=useState(0);
    const [selected,setSelected]=useState(null), [image,setImage]=useState('');
    useEffect(()=>{
        let active=true;
        neonApiRequest(`${base}?limit=20&offset=${offset}&source=${encodeURIComponent(source)}`).then(value=>{if(active){setData(value);setError('');}}).catch(e=>{if(active)setError(e.message || 'Dataset is unavailable.');});
        return ()=>{active=false;};
    },[source,offset]);
    useEffect(()=>{
        let url='', active=true; const controller=new AbortController(); setImage('');
        if(selected) (async()=>{
            try {
                const token=await getNeonAccessToken();
                if(!token) throw Error('Sign in to view the image.');
                const api=String(import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
                const response=await fetch(`${api}${base}/${selected.checksum}/image`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});
                if(!response.ok) throw Error('Image is unavailable in the evaluation store.');
                const blob=await response.blob(); if(active){url=URL.createObjectURL(blob);setImage(url);}
            } catch(e) {if(active && e.name!=='AbortError') setError(e.message);}
        })();
        return ()=>{active=false;controller.abort();if(url)URL.revokeObjectURL(url);};
    },[selected]);
    const summary=data?.summary, metrics=data?.metrics;
    return <section className="admin-panel admin-panel--wide" aria-labelledby="agricultural-dataset-title">
        <div className="admin-panel-header"><div><h2 id="agricultural-dataset-title">Agricultural Dataset</h2><p>Reference labels and AI assessments are stored separately.</p></div></div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {summary && <><div className="evaluation-metrics"><div><span>Imported images</span><strong>{summary.total}</strong></div><div><span>Completed assessments</span><strong>{metrics.completed}</strong></div><div><span>Agreement</span><strong>{metrics.comparable ? `${Math.round(100*metrics.matches/metrics.comparable)}% (${metrics.matches}/${metrics.comparable})` : 'Not available'}</strong></div></div>
        <p><strong>Sources:</strong> {summary.sources.join(', ') || 'None'}</p><p><strong>Crops:</strong> {summary.crops.join(', ') || 'None'}</p><p><strong>Dataset labels:</strong> {summary.conditions.join(', ') || 'None'}</p><p>Original POC assessments are marked baseline and may predate the health-status fix. Agreement uses the latest result per image and excludes review and unassessed cases.</p></>}
        <label className="evaluation-label">Source <select value={source} onChange={e=>{setSource(e.target.value);setOffset(0);}}><option value="">All datasets</option><option>PlantVillage</option><option>PlantDoc</option></select></label>
        {data && <><ul>{data.images.map(row=><li key={row.checksum}><button type="button" onClick={()=>setSelected(row)}>{row.crop} · {row.original_label} · {row.source}</button></li>)}</ul><button type="button" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</button> <span>Page {offset/20+1}</span> <button type="button" disabled={data.images.length<20} onClick={()=>setOffset(offset+20)}>Next</button></>}
        {selected && <div><h3>Selected image</h3>{image && <img src={image} className="evaluation-image" alt="Selected agricultural dataset example" />}<p>Reference: {selected.crop} / {selected.original_label}</p><p>AI: {selected.completed ? `${selected.predicted_crop || 'Unknown'} / ${selected.predicted_condition || 'Unknown'} · ${selected.agreement} (${selected.run_id})` : 'Not assessed'}</p></div>}
    </section>;
}
