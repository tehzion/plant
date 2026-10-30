import { useEffect, useState } from 'react';
import { getNeonAccessToken, neonApiRequest } from '../utils/neonApi.js';
import ProductEvaluationPanel from './ProductEvaluationPanel.jsx';

const base = '/api/admin/evaluation';
const api = (path, options) => neonApiRequest(`${base}${path}`, options);
const post = (path, body) => api(path, { method:'POST', body:JSON.stringify(body) });
const metric = (m) => m?.denominator ? `${(100 * m.value).toFixed(1)}% (${m.numerator}/${m.denominator})` : 'Not yet available';

export default function EvaluationPanel() {
    const [summary,setSummary]=useState(null), [cases,setCases]=useState([]), [selected,setSelected]=useState(null);
    const [imageUrl,setImageUrl]=useState(''), [imageError,setImageError]=useState('');
    const [source,setSource]=useState(''), [offset,setOffset]=useState(0), [error,setError]=useState(''), [message,setMessage]=useState('');
    const [review,setReview]=useState({verdict:'agree',correctedCondition:'',uncertainty:'',followUp:'',comments:''});
    const [participant,setParticipant]=useState({participantId:'',consent:false,testDate:'',task:'assessment',completed:false,assistance:false,durationSeconds:'',difficulty:'',feedback:'',observations:''});
    const load = async () => {
        try {
            setError('');
            const params=new URLSearchParams({limit:'20',offset:String(offset)}); if(source) params.set('source',source);
            const [a,b]=await Promise.all([api('/summary'),api(`/cases?${params}`)]);
            setSummary(a); setCases(b.cases || []);
        } catch(e) { setError(e.message); }
    };
    useEffect(() => { load(); },[source,offset]);
    const open = async(id) => { try { setError(''); setSelected(await api(`/cases/${encodeURIComponent(id)}`)); } catch(e){setError(e.message);} };
    const importFile = async (event) => {
        const file=event.target.files?.[0]; event.target.value=''; if(!file) return;
        try { if(file.size > 200000) throw new Error('Result file exceeds 200 KB'); const record=JSON.parse(await file.text()); await post('/cases',record); setMessage('Result imported. The original cannot be overwritten.'); await load(); }
        catch(e) { setError(e.message); }
    };
    const submitReview = async(event) => { event.preventDefault(); try {await post(`/cases/${selected.case.id}/reviews`,review); setMessage('Review saved separately from the AI result.'); await open(selected.case.id); await load();} catch(e){setError(e.message);} };
    const submitParticipant = async(event) => {event.preventDefault(); try {await post('/usability',participant); setMessage('Consented usability session saved.'); setParticipant({participantId:'',consent:false,testDate:'',task:'assessment',completed:false,assistance:false,durationSeconds:'',difficulty:'',feedback:'',observations:''}); await load();} catch(e){setError(e.message);} };
    const exportSummary = () => { const url=URL.createObjectURL(new Blob([JSON.stringify(summary,null,2)],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download='agropreneur-evaluation-summary.json'; a.click(); URL.revokeObjectURL(url); };
    const exportReport = async () => { try { const payload = await api('/report'); const url=URL.createObjectURL(new Blob([payload.report],{type:'text/markdown'})); const a=document.createElement('a'); a.href=url; a.download='agropreneur-preliminary-evaluation.md'; a.click(); URL.revokeObjectURL(url); } catch(e) { setError(e.message); } };
    useEffect(() => {
        let objectUrl = '', cancelled = false;
        const controller = new AbortController();
        setImageUrl(''); setImageError('');
        if (selected?.case?.id) {
            (async () => {
                try {
                    const token = await getNeonAccessToken();
                    if (!token) throw new Error('Sign in to view the image.');
                    const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
                    const response = await fetch(`${apiBase}${base}/cases/${encodeURIComponent(selected.case.id)}/image`, { headers:{ Authorization:`Bearer ${token}` }, signal:controller.signal });
                    if (!response.ok) throw new Error('Image unavailable in the configured evaluation store.');
                    const blob = await response.blob();
                    if (cancelled) return;
                    objectUrl = URL.createObjectURL(blob); setImageUrl(objectUrl);
                } catch (err) { if (!cancelled && err.name !== 'AbortError') setImageError(err.message); }
            })();
        }
        return () => { cancelled=true; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [selected?.case?.id]);
    const record=selected?.case?.record;
    return <section className="admin-panel admin-panel--wide evaluation-panel" aria-labelledby="evaluation-title">
        <div className="admin-panel-header"><div><h2 id="evaluation-title">AI evaluation &amp; validation</h2><p>Public datasets, reviewer records and farmer testing are separate evidence sources. Reviewer qualifications must be verified independently.</p></div><button type="button" onClick={load}>Refresh</button></div>
        {error && <p className="admin-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
        {!summary ? <p>Evaluation data is unavailable. Check access and the database migration.</p> : <>
            <div className="evaluation-metrics">
                <div><span>Completed / attempted</span><strong>{summary.overall.completed} / {summary.overall.attempted}</strong></div>
                <div><span>Diagnostic agreement</span><strong>{metric(summary.overall.diagnosticAgreement)}</strong></div>
                <div><span>Healthy false alarm</span><strong>{metric(summary.overall.healthyFalseAlarm)}</strong></div>
                <div><span>Cases with recorded reviews</span><strong>{summary.reviewed}</strong></div>
                <div><span>Mean response time</span><strong>{summary.overall.meanDurationMs.denominator ? `${Math.round(summary.overall.meanDurationMs.value)} ms (${summary.overall.meanDurationMs.denominator} timed)` : 'Not yet available'}</strong></div>
                <div><span>Reported processing cost</span><strong>{summary.overall.cost.total === null ? 'Not available' : `${summary.overall.cost.total} (${summary.overall.cost.reportedCases} cases; check currency)`}</strong></div>
            </div>
            <p>{summary.limitations}</p><p>Coverage: {metric(summary.overall.coverage)}. Agreement excludes failures, unsupported cases and uncertain or abstained assessments. This view may combine different workflow versions; inspect versions before comparing results.</p>
            <div className="evaluation-datasets">{Object.entries(summary.datasets).map(([name,m])=><p key={name}><strong>{name}</strong>: {metric(m.diagnosticAgreement)}; {m.attempted} attempted, coverage {metric(m.coverage)}.</p>)}</div>
            <h3>Performance by crop</h3>{summary.crops?.length ? <ul>{summary.crops.map(m=><li key={m.crop}>{m.crop}: {metric(m.diagnosticAgreement)}; {m.attempted} attempted, coverage {metric(m.coverage)}</li>)}</ul> : <p>No crop results available.</p>}<p>Workflow versions: {summary.workflowVersions?.join(', ') || 'Not available'}</p><button type="button" onClick={exportSummary}>Export summary JSON</button> <button type="button" onClick={exportReport}>Export preliminary report</button>
        </>}
        <hr /><h3>Assessment explorer</h3><p>Import a result produced by the isolated local runner. Images require a separately configured evaluation image store.</p>
        <label className="evaluation-label">Import result JSON<input type="file" accept="application/json,.json" onChange={importFile} /></label>
        <label className="evaluation-label">Dataset<select value={source} onChange={e=>{setOffset(0);setSource(e.target.value);}}><option value="">All datasets</option><option>PlantVillage</option><option>PlantDoc</option></select></label>
        {cases.length===0 ? <p>No evaluation cases on this page.</p> : <ul>{cases.map(({id,record:r})=><li key={id}><button type="button" onClick={()=>open(id)}>{r.imageId} · {r.source} · {r.match}</button></li>)}</ul>}
        <div className="evaluation-pagination"><button type="button" disabled={offset===0} onClick={()=>setOffset(Math.max(0,offset-20))}>Previous</button><span>Offset {offset}</span><button type="button" disabled={cases.length<20} onClick={()=>setOffset(offset+20)}>Next</button></div>
        {record && <div><h3>Selected case</h3>{imageUrl && <img className="evaluation-image" src={imageUrl} alt="Dataset image for the selected assessment" />}{imageError && <p role="status">{imageError}</p>}<p><strong>{record.imageId}</strong> · {record.source} · {record.workflowVersion}</p><p>Original dataset label: {record.originalLabel || 'Unavailable'}; reference: {record.reference?.crop} / {record.reference?.label}</p><p>AI: {record.prediction?.crop || 'Unknown'} / {record.prediction?.label || 'Unknown'} · {record.match}</p><p>{record.prediction?.explanation}</p><h4>Review history</h4>{selected.reviews.length ? <ul>{selected.reviews.map(r=><li key={r.id}>{r.verdict} · {r.created_at} · reviewer {r.reviewer_id} {r.corrected_condition && `· ${r.corrected_condition}`} {r.comments}</li>)}</ul> : <p>Not Expert Reviewed</p>}
            <form onSubmit={submitReview} className="evaluation-form"><h4>Add expert review</h4><label>Verdict<select value={review.verdict} onChange={e=>setReview({...review,verdict:e.target.value})}><option value="agree">Reviewed — Agree</option><option value="disagree">Reviewed — Disagree</option><option value="inconclusive">Inconclusive</option><option value="requires_evidence">Requires Further Evidence</option></select></label><label>Corrected condition<input maxLength="200" required={review.verdict==='disagree'} value={review.correctedCondition} onChange={e=>setReview({...review,correctedCondition:e.target.value})} /></label><label>Uncertainty<input maxLength="500" value={review.uncertainty} onChange={e=>setReview({...review,uncertainty:e.target.value})} /></label><label>Follow-up appropriateness<textarea maxLength="1000" value={review.followUp} onChange={e=>setReview({...review,followUp:e.target.value})} /></label><label>Professional comments<textarea maxLength="2000" value={review.comments} onChange={e=>setReview({...review,comments:e.target.value})} /></label><button type="submit">Save review</button></form></div>}
        <ProductEvaluationPanel />
        <hr /><h3>Farmer usability</h3><p>{!summary ? 'Usability data is unavailable.' : summary.usabilitySessions ? `${summary.usabilitySessions} recorded task sessions.` : 'Farmer usability testing: Not yet conducted.'}</p><p>Use an anonymous ID and record only consented, real sessions. Do not enter names or contact details.</p>
        <form onSubmit={submitParticipant} className="evaluation-form"><label>Anonymous participant ID<input required minLength="3" maxLength="80" pattern="[A-Za-z0-9_-]+" value={participant.participantId} onChange={e=>setParticipant({...participant,participantId:e.target.value})} /></label><label>Test date<input type="date" required value={participant.testDate} onChange={e=>setParticipant({...participant,testDate:e.target.value})} /></label><label>Task<select value={participant.task} onChange={e=>setParticipant({...participant,task:e.target.value})}><option value="assessment">Plant assessment</option><option value="assistant">Agricultural assistant</option><option value="product">Find a product</option><option value="farm_activity">Record farm activity</option></select></label><label>Duration in seconds<input type="number" min="0" max="86400" value={participant.durationSeconds} onChange={e=>setParticipant({...participant,durationSeconds:e.target.value})} /></label><label><input type="checkbox" checked={participant.completed} onChange={e=>setParticipant({...participant,completed:e.target.checked})} /> Task completed</label><label><input type="checkbox" checked={participant.assistance} onChange={e=>setParticipant({...participant,assistance:e.target.checked})} /> Assistance required</label><label>Reported difficulty<input maxLength="500" value={participant.difficulty} onChange={e=>setParticipant({...participant,difficulty:e.target.value})} /></label><label>Participant feedback<textarea maxLength="2000" value={participant.feedback} onChange={e=>setParticipant({...participant,feedback:e.target.value})} /></label><label>Observed issues<textarea maxLength="2000" value={participant.observations} onChange={e=>setParticipant({...participant,observations:e.target.value})} /></label><label><input type="checkbox" required checked={participant.consent} onChange={e=>setParticipant({...participant,consent:e.target.checked})} /> Participant consent recorded</label><button type="submit">Save usability session</button></form>
    </section>;
}
