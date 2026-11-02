import { useEffect, useState } from 'react';
import { getNeonAccessToken, neonApiRequest } from '../utils/neonApi.js';

const base='/api/admin/evaluation/dataset';
const AGREEMENT={match:'Match',different_or_unclear:'Different',uncertain_or_review:'Review needed',unassessed:'Unassessed'};
const pct=(n,d)=>d ? `${Math.round(100*n/d)}% (${n}/${d})` : 'Not available';
export default function AgriculturalDataset() {
    const [data,setData]=useState(null), [error,setError]=useState(''), [source,setSource]=useState(''), [assessed,setAssessed]=useState(false), [offset,setOffset]=useState(0);
    const [selected,setSelected]=useState(null), [image,setImage]=useState('');
    useEffect(()=>{
        let active=true;
        neonApiRequest(`${base}?limit=20&offset=${offset}&source=${encodeURIComponent(source)}${assessed ? '&assessed=1' : ''}`).then(value=>{if(active){setData(value);setError('');}}).catch(e=>{if(active)setError(e.message || 'Dataset is unavailable.');});
        return ()=>{active=false;};
    },[source,assessed,offset]);
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
        <div className="admin-panel-header"><div><h2 id="agricultural-dataset-title">Agricultural Dataset</h2><p>Reference labels and AI assessments are stored separately. Labels are never sent to the AI.</p></div></div>
        {error && <p className="admin-error" role="alert">{error}</p>}
        {summary && <><div className="evaluation-metrics">
            <div><span>Imported images</span><strong>{summary.total}</strong></div>
            <div><span>PlantVillage / PlantDoc</span><strong>{summary.plantvillage ?? '–'} / {summary.plantdoc ?? '–'}</strong></div>
            <div><span>Healthy / diseased</span><strong>{summary.healthy ?? '–'} / {summary.healthy == null ? '–' : summary.total-summary.healthy}</strong></div>
            <div><span>Completed assessments</span><strong>{metrics.completed}</strong></div>
            <div><span>Agreement</span><strong>{pct(metrics.matches,metrics.comparable)}</strong></div>
            {metrics.review != null && <div><span>Review needed</span><strong>{metrics.review}</strong></div>}
        </div>
        <p><strong>Sources:</strong> {summary.sources.join(', ') || 'None'}</p><p><strong>Crops ({summary.crops.length}):</strong> {summary.crops.join(', ') || 'None'}</p><p><strong>Disease categories ({summary.conditions.length}):</strong> {summary.conditions.join(', ') || 'None'}</p><p>Agreement uses the latest completed result per image and excludes review-needed cases. Baseline POC results predate the health-status fix. Dataset labels are not expert diagnoses.</p></>}
        <div className="evaluation-pagination">
            <label className="evaluation-label">Source <select value={source} onChange={e=>{setSource(e.target.value);setOffset(0);}}><option value="">All datasets</option><option>PlantVillage</option><option>PlantDoc</option></select></label>
            <label><input type="checkbox" checked={assessed} onChange={e=>{setAssessed(e.target.checked);setOffset(0);}} /> Assessed only</label>
        </div>
        {data && <><div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Source</th><th>Reference (crop / label)</th><th>AI prediction</th><th>Result</th><th></th></tr></thead>
            <tbody>{data.images.map(row=><tr key={row.checksum} className={row.completed && row.agreement !== 'match' ? 'admin-row--differs' : undefined}>
                <td>{row.source}</td><td>{row.crop} / {row.original_label}</td>
                <td>{row.completed ? `${row.predicted_crop || 'Unknown'} / ${row.predicted_condition || 'Unknown'}` : 'Not assessed'}</td>
                <td>{row.completed ? <span className={`admin-agreement admin-agreement--${row.agreement}`}>{AGREEMENT[row.agreement] || row.agreement}</span> : '–'}</td>
                <td><button type="button" onClick={()=>setSelected(row)} aria-label={`View ${row.crop} · ${row.original_label} · ${row.source}`}>View</button></td>
            </tr>)}</tbody></table></div>
            <div className="evaluation-pagination"><button type="button" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</button> <span>Page {offset/20+1}</span> <button type="button" disabled={data.images.length<20} onClick={()=>setOffset(offset+20)}>Next</button></div></>}
        {selected && <div><h3>Selected image</h3>{image && <img src={image} className="evaluation-image" alt="Selected agricultural dataset example" />}<p>Reference: {selected.crop} / {selected.original_label}</p><p>AI: {selected.completed ? `${selected.predicted_crop || 'Unknown'} / ${selected.predicted_condition || 'Unknown'} · ${AGREEMENT[selected.agreement] || selected.agreement} (${selected.run_id})` : 'Not assessed'}</p></div>}
    </section>;
}
