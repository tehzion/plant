import { useReviewerText } from '../utils/reviewerCopy.js';
import { useEffect, useState } from 'react';
import { neonApiRequest } from '../utils/neonApi.js';
const base = '/api/admin/evaluation/product-scenarios';
const request = (url, body) => neonApiRequest(url, body ? {method:'POST',body:JSON.stringify(body)} : {});
const fields = [
    ['cropCompatibility','Crop compatibility'], ['productPurpose','Product purpose'], ['conditionRelevance','Condition relevance'],
    ['labelInformation','Available label information'], ['restrictions','Restrictions and warnings'], ['missingInformation','Missing information'],
    ['unsupportedClaims','Unsupported claims'], ['uncertainty','Uncertainty communication'], ['comments','Professional comments'],
];
const emptyReview = {productId:'',verdict:'requires_verification',...Object.fromEntries(fields.map(([name])=>[name,'']))};
export default function ProductEvaluationPanel() {
    const tr = useReviewerText();
    const [scenario,setScenario]=useState({plantType:'',disease:'',healthStatus:'unhealthy',status:'uncertain',diagnosisConfidence:'',needsMoreEvidence:true});
    const [items,setItems]=useState([]), [selected,setSelected]=useState(null), [reviews,setReviews]=useState([]), [form,setForm]=useState(emptyReview), [error,setError]=useState(''), [busy,setBusy]=useState(false), [loaded,setLoaded]=useState(false);
    const load=async()=>{try { setItems((await request(base)).scenarios || []); setLoaded(true); } catch(e){setError(e.message);} };
    useEffect(()=>{load();},[]);
    const open=async(item)=>{try { setSelected(item); setReviews((await request(`${base}/${encodeURIComponent(item.id)}/reviews`)).reviews || []); setForm(emptyReview); } catch(e){setError(e.message);} };
    const run=async(e)=>{e.preventDefault();setError('');setBusy(true); try {
        const diagnosis={...scenario,diagnosisConfidence:scenario.diagnosisConfidence === '' ? null : Number(scenario.diagnosisConfidence)};
        const recommendation=await request('/api/products/search',{diagnosis,language:'en'});
        await request(base,{scenario:diagnosis,recommendation}); await load();
    } catch(err){setError(err.message);} finally {setBusy(false);} };
    const save=async(e)=>{e.preventDefault();setError('');try {await request(`${base}/${selected.id}/reviews`,form); await open(selected);}catch(err){setError(err.message);} };
    const products=selected ? ['diseaseControl','fertilizers','supplements','catalogueDiscovery'].flatMap(group=>(selected.recommendation?.[group] || []).map(p=>({...p,group}))) : [];
    return <section aria-labelledby="product-evaluation-title"><hr/><h3 id="product-evaluation-title">{tr("Product recommendation evaluation")}</h3>
        <p>{tr("Run a controlled scenario through the existing catalogue matcher. A match is not proof of agricultural suitability or product registration. The live catalogue and API quota may be used.")}</p>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <form className="evaluation-form" onSubmit={run}><label>{tr("Crop")}<input required maxLength="200" value={scenario.plantType} onChange={e=>setScenario({...scenario,plantType:e.target.value})}/></label><label>{tr("Condition")}<input required maxLength="200" value={scenario.disease} onChange={e=>setScenario({...scenario,disease:e.target.value})}/></label><label>{tr("Scenario status")}<select value={scenario.status} onChange={e=>setScenario({...scenario,status:e.target.value})}><option value="uncertain">{tr("Uncertain")}</option><option value="likely">{tr("Likely")}</option><option value="confirmed">{tr("Confirmed (scenario only)")}</option></select></label><label>{tr("Scenario confidence, 0–100 (optional)")}<input type="number" min="0" max="100" value={scenario.diagnosisConfidence} onChange={e=>setScenario({...scenario,diagnosisConfidence:e.target.value})}/></label><label><input type="checkbox" checked={scenario.needsMoreEvidence} onChange={e=>setScenario({...scenario,needsMoreEvidence:e.target.checked})}/>{' '}{tr("Requires more evidence")}</label><button type="submit" disabled={busy}>{tr(busy ? 'Running…' : 'Run and save scenario')}</button></form>
        {!loaded ? <p>{tr("Product scenarios are unavailable or still loading.")}</p> : items.length ? <ul>{items.map(item=><li key={item.id}><button type="button" onClick={()=>open(item)}>{item.scenario.plantType} · {item.scenario.disease} · {item.created_at}</button></li>)}</ul> : <p>{tr("No product scenarios recorded.")}</p>}
        {selected && <><h4>{tr("Catalogue response")}</h4><p>{tr("Reasoning:")}{' '}{typeof selected.recommendation?.reasoning === 'string' ? selected.recommendation.reasoning : JSON.stringify(selected.recommendation?.reasoning || 'Not provided')}</p>{products.length ? <ul>{products.map((p,i)=><li key={`${p.group}-${p.id}-${i}`}>{p.name || p.id} · {p.group}{' '}{tr("· ID")}{' '}{p.id}</li>)}</ul> : <p>{tr("No products returned; inspect the original response and consultation guidance.")}</p>}
        <h4>{tr("Review history")}</h4>{reviews.length ? <ul>{reviews.map(r=><li key={r.id}>{r.product_id}: {r.verdict} · {r.created_at}{' '}{tr("· reviewer")}{' '}{r.reviewer_id} {r.comments}</li>)}</ul> : <p>{tr("Not Expert Reviewed")}</p>}
        <form className="evaluation-form" onSubmit={save}><label>{tr("Product ID")}<input required maxLength="200" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})}/></label><label>{tr("Suitability verdict")}<select value={form.verdict} onChange={e=>setForm({...form,verdict:e.target.value})}><option value="requires_verification">{tr("Requires verification")}</option><option value="suitable">{tr("Suitable")}</option><option value="unsuitable">{tr("Unsuitable")}</option></select></label>{fields.map(([name,label])=><label key={name}>{tr(label)}<textarea maxLength="2000" value={form[name]} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>)}<button type="submit">{tr("Save product review")}</button></form></>}
    </section>;
}
