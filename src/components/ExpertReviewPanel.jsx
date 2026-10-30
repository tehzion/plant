import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, RefreshCcw } from 'lucide-react';
import { fetchReviewCase, fetchReviewQueue, submitReview } from '../utils/expertReview.js';

const VERDICTS = [
    { value: 'confirmed', label: 'Confirm AI diagnosis' },
    { value: 'corrected', label: 'Correct the diagnosis' },
    { value: 'uncertain', label: 'Uncertain / needs more information' },
];
const PRODUCT_VERDICTS = [
    { value: 'suitable', label: 'Suitable' },
    { value: 'unsuitable', label: 'Unsuitable' },
    { value: 'needs_more_information', label: 'Needs more information' },
];
const emptyForm = () => ({ verdict: '', correctedDiagnosis: '', correctedCrop: '', notes: '', productReviews: [] });

// Expert review stays deliberately simple: pick a case, read the original AI
// assessment, record a verdict. Each submission is a separate attributed record.
const ExpertReviewPanel = () => {
    const [status, setStatus] = useState('needs_review');
    const [queue, setQueue] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [extraProduct, setExtraProduct] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const loadQueue = async () => {
        setError('');
        try { setQueue((await fetchReviewQueue({ status })).cases || []); } catch (err) { setQueue([]); setError(err.message); }
    };
    useEffect(() => { loadQueue(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status]);

    const openCase = async (scanId, { keepMessage = false } = {}) => {
        setError('');
        if (!keepMessage) setMessage('');
        try {
            const data = await fetchReviewCase(scanId);
            setSelected(data);
            setForm({ ...emptyForm(), productReviews: (data.products || []).map((product) => ({ ...product, verdict: '', note: '' })) });
        } catch (err) { setError(err.message); }
    };

    const updateProduct = (index, patch) => setForm((current) => ({
        ...current, productReviews: current.productReviews.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true); setError(''); setMessage('');
        try {
            await submitReview(selected.scanId, {
                verdict: form.verdict,
                correctedDiagnosis: form.correctedDiagnosis,
                correctedCrop: form.correctedCrop,
                notes: form.notes,
                productReviews: form.productReviews.filter((item) => item.verdict)
                    .map(({ productId, productName, verdict, note }) => ({ productId, productName, verdict, note })),
            });
            await openCase(selected.scanId, { keepMessage: true });
            setMessage('Review saved. The original AI assessment is unchanged.');
            loadQueue();
        } catch (err) { setError(err.message); } finally { setBusy(false); }
    };

    const ai = selected?.aiAssessment;
    return (
        <section className="admin-panel admin-panel--wide expert-review" aria-labelledby="expert-review-title">
            <div className="admin-panel-header">
                <h2 id="expert-review-title"><ClipboardCheck size={18} /> Expert review</h2>
                <div className="expert-review__filters">
                    <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Review queue filter">
                        <option value="needs_review">Needs review</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="all">All</option>
                    </select>
                    <button type="button" onClick={loadQueue}><RefreshCcw size={16} /><span>Refresh</span></button>
                </div>
            </div>
            {error && <p className="admin-error" role="alert">{error}</p>}
            <div className="expert-review__layout">
                <ul className="expert-review__queue">
                    {queue.length === 0 && <li className="admin-empty">No assessments in this list.</li>}
                    {queue.map((item) => (
                        <li key={item.scanId}>
                            <button type="button" className={selected?.scanId === item.scanId ? 'active' : ''} onClick={() => openCase(item.scanId)}>
                                <strong>{item.assessment.disease || 'Unnamed result'}</strong>
                                <span>{item.category || item.assessment.plantType || 'Unknown crop'} · {item.assessment.confidenceLevel || 'no level'}</span>
                                {item.latestVerdict && <span className="expert-review__verdict"><CheckCircle2 size={14} /> {item.latestVerdict}</span>}
                                {item.farmerFeedbackCount > 0 && <span>{item.farmerFeedbackCount} farmer feedback</span>}
                            </button>
                        </li>
                    ))}
                </ul>
                {selected && (
                    <div className="expert-review__case">
                        <h3>AI assessment (original, read-only)</h3>
                        <div className="expert-review__photos">
                            {selected.imageUrls?.tree && <img src={selected.imageUrls.tree} alt="Plant photo submitted by farmer" />}
                            {selected.imageUrls?.leaf && <img src={selected.imageUrls.leaf} alt="Leaf close-up submitted by farmer" />}
                        </div>
                        <p><strong>{ai.disease}</strong> · {ai.plantType || selected.category} · confidence: {ai.confidenceLevel || '-'}</p>
                        {ai.additionalNotes && <p>{ai.additionalNotes}</p>}
                        {ai.alternatives?.length > 0 && <p>Alternatives: {ai.alternatives.map((item) => `${item.name}${item.confidence_level ? ` (${item.confidence_level})` : ''}`).join(', ')}</p>}
                        <p>Treatment products allowed by policy: {ai.treatmentEligible ? 'yes' : 'no'}</p>

                        {selected.farmerFeedback?.length > 0 && (
                            <>
                                <h3>Farmer feedback</h3>
                                <ul>{selected.farmerFeedback.map((item, index) => (
                                    <li key={index}>{item.wasCorrect === true ? 'Farmer says correct' : item.wasCorrect === false ? 'Farmer says incorrect' : 'Farmer comment'}
                                        {item.correctDisease ? ` → ${item.correctDisease}` : ''}{item.note ? ` — ${item.note}` : ''}{item.verified ? '' : ' (unverified)'}</li>
                                ))}</ul>
                            </>
                        )}
                        {selected.expertReviews?.length > 0 && (
                            <>
                                <h3>Previous expert reviews</h3>
                                <ul>{selected.expertReviews.map((review) => (
                                    <li key={review.id}>{review.verdict}{review.corrected_diagnosis ? ` → ${review.corrected_diagnosis}` : ''} by {review.reviewer_email} on {new Date(review.created_at).toLocaleString('en-MY')}{review.notes ? ` — ${review.notes}` : ''}</li>
                                ))}</ul>
                            </>
                        )}

                        <form className="expert-review__form" onSubmit={submit}>
                            <fieldset>
                                <legend>Your verdict</legend>
                                {VERDICTS.map((option) => (
                                    <label key={option.value} className="expert-review__radio">
                                        <input type="radio" name="verdict" value={option.value} checked={form.verdict === option.value}
                                            onChange={() => setForm({ ...form, verdict: option.value })} required />
                                        {option.label}
                                    </label>
                                ))}
                            </fieldset>
                            {form.verdict === 'corrected' && (
                                <>
                                    <label>Correct diagnosis<input value={form.correctedDiagnosis} maxLength={200} onChange={(event) => setForm({ ...form, correctedDiagnosis: event.target.value })} /></label>
                                    <label>Correct crop (if different)<input value={form.correctedCrop} maxLength={120} onChange={(event) => setForm({ ...form, correctedCrop: event.target.value })} /></label>
                                </>
                            )}
                            <label>Professional notes<textarea value={form.notes} maxLength={2000} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>

                            <h3>Product recommendations</h3>
                            {form.productReviews.map((product, index) => (
                                <div key={`${product.productId}-${index}`} className="expert-review__product">
                                    <span>{product.productName || `Product ${product.productId}`}</span>
                                    <select value={product.verdict} onChange={(event) => updateProduct(index, { verdict: event.target.value })} aria-label={`Verdict for ${product.productName}`}>
                                        <option value="">Not reviewed</option>
                                        {PRODUCT_VERDICTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select>
                                    <input placeholder="Note" value={product.note} maxLength={500} onChange={(event) => updateProduct(index, { note: event.target.value })} />
                                </div>
                            ))}
                            <div className="expert-review__product">
                                <input placeholder="Add another product by name" value={extraProduct} maxLength={200} onChange={(event) => setExtraProduct(event.target.value)} />
                                <button type="button" onClick={() => { if (!extraProduct.trim()) return; setForm({ ...form, productReviews: [...form.productReviews, { productId: null, productName: extraProduct.trim(), verdict: '', note: '' }] }); setExtraProduct(''); }}>Add</button>
                            </div>

                            <button type="submit" className="admin-primary-link" disabled={busy || !form.verdict}>{busy ? 'Saving…' : 'Save review'}</button>
                            {message && <p role="status">{message}</p>}
                        </form>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ExpertReviewPanel;
