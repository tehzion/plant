import { useId, useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { EXPENSE_CATEGORIES_CFG } from '../../data/config';

const OptionalFields = ({ title, initiallyOpen = false, children }) => {
    const [open, setOpen] = useState(initiallyOpen);
    return <details className="activity-optional" open={open} onToggle={event => setOpen(event.currentTarget.open)} onInvalidCapture={() => setOpen(true)}>
        <summary>{title}</summary><div className="activity-optional-body">{children}</div>
    </details>;
};

const ActivityForm = ({
    noteForm,
    setNoteForm,
    plots,
    activityTypes,
    enhancing,
    onAutoEnhance,
    onSubmit,
    savingNote,
    saveError = '',
    label,
}) => {
    const formId = useId();
    const currentType = activityTypes.find((type) => type.value === noteForm.activity_type) ?? activityTypes[0];
    const showChemical = currentType?.chemical;
    const requiresNote = !['scout', 'spray', 'fertilize', 'harvest'].includes(noteForm.activity_type);

    const updateForm = (patch) => {
        setNoteForm((currentForm) => ({ ...currentForm, ...patch }));
    };

    const handleActivityTypeChange = (activityType) => {
        let expenseCategory = 'Other';
        const fertilizerId = 'Fertilizer';
        const pesticideId   = 'Pesticide';
        const laborId      = 'Labor';

        if (activityType === 'fertilize') expenseCategory = fertilizerId;
        else if (activityType === 'spray') expenseCategory = pesticideId;
        else if (['prune', 'inspect', 'scout'].includes(activityType)) expenseCategory = laborId;
        
        updateForm({ activity_type: activityType, expense_category: expenseCategory });
    };

    return (
        <form className="udp-inline-form activity-form" onSubmit={onSubmit} aria-busy={savingNote}>
          <fieldset className="activity-editable" disabled={savingNote}>
            <div>
                <p className="udp-form-label"> {label('profile.activityType', 'Activity Type')}</p>
                <div className="udp-activity-grid" role="group" aria-label={label('profile.activityType', 'Activity Type')}>
                    {activityTypes.map((activityType) => (
                        <button key={activityType.value} type="button" aria-pressed={noteForm.activity_type === activityType.value} className={`udp-activity-chip ${noteForm.activity_type === activityType.value ? 'active' : ''}`} onClick={() => handleActivityTypeChange(activityType.value)}>
                            {activityType.label}
                        </button>
                    ))}
                </div>
            </div>

            {plots.length > 0 && (
                <div>
                    <label className="udp-form-label" htmlFor={`${formId}-plot_id`}>{label('profile.plot', 'Plot / Farm')}</label>
                    <select id={`${formId}-plot_id`} className="udp-input" value={noteForm.plot_id} onChange={(event) => updateForm({ plot_id: event.target.value })}>
                        <option value="">{label('profile.selectPlot', 'Select plot (optional)')}</option>
                        {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
                    </select>
                </div>
            )}

            <fieldset className="activity-primary">
                <legend>{label('profile.activityDetails', 'What happened in the field?')}</legend>
                <p className="activity-form-hint">{label('profile.activityRequiredHint', 'Record the activity below. Fields marked * are required; optional sections can be skipped.')}</p>
            {showChemical && (
                <>
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-chemical_name`}> {label('profile.chemicalName', 'Pesticide / Fertilizer Name')} <span className="udp-form-required">*</span></label>
                        <input id={`${formId}-chemical_name`} className="udp-input" placeholder={label('profile.chemicalNamePlaceholder', 'e.g. Mancozeb 80% WP')} required value={noteForm.chemical_name} onChange={(event) => updateForm({ chemical_name: event.target.value })} />
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-chemical_qty`}> {label('profile.quantity', 'Quantity Applied')}</label>
                            <input id={`${formId}-chemical_qty`} className="udp-input" placeholder={label('profile.qtyPlaceholder', 'e.g. 200ml / 15L')} value={noteForm.chemical_qty} onChange={(event) => updateForm({ chemical_qty: event.target.value })} />
                        </div>
                        <div>
                            <p className="udp-form-label"> {label('profile.timing', 'Timing')}</p>
                            <div className="udp-timing-toggle">
                                {['AM', 'PM', 'Both'].map((value) => (
                                    <button key={value} type="button" aria-pressed={noteForm.application_timing === value} className={`udp-timing-btn ${noteForm.application_timing === value ? 'active' : ''}`} onClick={() => updateForm({ application_timing: value })}>
                                        {label(`profile.timing${value}`, value)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {noteForm.activity_type === 'scout' && (
                <>
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-disease_name_observed`}> {label('profile.diseaseNameObserved', 'Disease / Pest Name')} <span className="udp-form-required">*</span></label>
                        <input id={`${formId}-disease_name_observed`} className="udp-input" placeholder={label('form.diseasePlaceholder', 'e.g. Aphids or Powdery Mildew')} required value={noteForm.disease_name_observed} onChange={(event) => updateForm({ disease_name_observed: event.target.value })} />
                    </div>
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-growth_stage`}>{label('profile.growthStage', 'Growth Stage')}</label>
                        <select id={`${formId}-growth_stage`} className="udp-input" value={noteForm.growth_stage} onChange={(event) => updateForm({ growth_stage: event.target.value })}>
                            <option value="Seedling">{label('profile.stageSeedling', 'Seedling')}</option>
                            <option value="Vegetative">{label('profile.stageVegetative', 'Vegetative')}</option>
                            <option value="Flowering">{label('profile.stageFlowering', 'Flowering')}</option>
                            <option value="Fruiting">{label('profile.stageFruiting', 'Fruiting')}</option>
                            <option value="Harvest">{label('profile.stageHarvest', 'Harvest')}</option>
                        </select>
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-disease_incidence`}> {label('profile.diseaseIncidence', 'Disease Incidence (%)')}</label>
                            <input id={`${formId}-disease_incidence`} className="udp-input" type="number" min="0" max="100" placeholder={label('form.incidencePlaceholder', 'e.g. 15')} value={noteForm.disease_incidence} onChange={(event) => updateForm({ disease_incidence: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-scout_severity`}> {label('profile.scoutSeverity', 'Severity')}</label>
                            <select id={`${formId}-scout_severity`} className="udp-input" value={noteForm.scout_severity} onChange={(event) => updateForm({ scout_severity: event.target.value })}>
                                <option value="Low">{label('profile.severityLow', 'Low')}</option>
                                <option value="Moderate">{label('profile.severityModerate', 'Moderate')}</option>
                                <option value="High">{label('profile.severityHigh', 'High')}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-pest_notes`}> {label('profile.pestNotes', 'Pest Count / Observations')}</label>
                        <input id={`${formId}-pest_notes`} className="udp-input" placeholder={label('form.pestPlaceholder', 'e.g. ~10 aphids per leaf')} value={noteForm.pest_notes} onChange={(event) => updateForm({ pest_notes: event.target.value })} />
                    </div>
                </>
            )}

            {noteForm.activity_type === 'prune' && (
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label" htmlFor={`${formId}-pruned_count`}> {label('profile.prunedCount', 'Trees / Items Pruned')}</label>
                        <input id={`${formId}-pruned_count`} className="udp-input" type="number" min="0" placeholder="e.g. 10" value={noteForm.pruned_count} onChange={(event) => updateForm({ pruned_count: event.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label" htmlFor={`${formId}-pruning_type`}> {label('profile.pruningType', 'Pruning Type')}</label>
                        <select id={`${formId}-pruning_type`} className="udp-input" value={noteForm.pruning_type} onChange={(event) => updateForm({ pruning_type: event.target.value })}>
                            <option value="Thinning">{label('profile.pruneThinning', 'Thinning')}</option>
                            <option value="Structural">{label('profile.pruneStructural', 'Structural')}</option>
                            <option value="Deadwood">{label('profile.pruneDeadwood', 'Deadwood')}</option>
                            <option value="Others">{label('profile.catOther', 'Others')}</option>
                        </select>
                    </div>
                </div>
            )}

            {noteForm.activity_type === 'inspect' && (
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label" htmlFor={`${formId}-inspection_type`}> {label('profile.inspectionType', 'Inspection Type')}</label>
                        <select id={`${formId}-inspection_type`} className="udp-input" value={noteForm.inspection_type} onChange={(event) => updateForm({ inspection_type: event.target.value })}>
                            <option value="Pest/Disease">{label('profile.inspectPestDisease', 'Pest / Disease')}</option>
                            <option value="Soil/Nutrient">{label('profile.inspectSoilNutrient', 'Soil / Nutrient')}</option>
                            <option value="Irrigation">{label('profile.inspectIrrigation', 'Irrigation')}</option>
                            <option value="Infrastructure">{label('profile.inspectInfrastructure', 'Infrastructure')}</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label" htmlFor={`${formId}-inspection_status`}> {label('profile.inspectionStatus', 'Status')}</label>
                        <select id={`${formId}-inspection_status`} className="udp-input" value={noteForm.inspection_status} onChange={(event) => updateForm({ inspection_status: event.target.value })}>
                            <option value="Good">{label('profile.inspectStatusGood', 'Good / Pass')}</option>
                            <option value="Action Required">{label('profile.inspectStatusActionRequired', 'Action Required')}</option>
                            <option value="Urgent">{label('profile.inspectStatusUrgent', 'Urgent Warning')}</option>
                        </select>
                    </div>
                </div>
            )}

            {noteForm.activity_type === 'harvest' && (
                <>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-kg_harvested`}> {label('profile.kgHarvested', 'Yield (kg)')} <span className="udp-form-required">*</span></label>
                            <input id={`${formId}-kg_harvested`} className="udp-input" type="number" min="0.1" step="0.1" placeholder={label('form.kgPlaceholder', 'e.g. 50')} required value={noteForm.kg_harvested} onChange={(event) => updateForm({ kg_harvested: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-quality_grade`}> {label('profile.qualityGrade', 'Quality Grade')}</label>
                            <select id={`${formId}-quality_grade`} className="udp-input" value={noteForm.quality_grade} onChange={(event) => updateForm({ quality_grade: event.target.value })}>
                                <option value="Excellent">{label('profile.qualityExcellent', 'Excellent')}</option>
                                <option value="Good">{label('profile.qualityGood', 'Good')}</option>
                                <option value="Fair">{label('profile.qualityFair', 'Fair')}</option>
                                <option value="Poor">{label('profile.qualityPoor', 'Poor')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-price_per_kg`}> {label('profile.pricePerKg', 'Price per kg (RM)')}</label>
                            <input id={`${formId}-price_per_kg`} className="udp-input" type="number" min="0" step="0.01" placeholder={label('form.pricePlaceholder', 'e.g. 8.50')} value={noteForm.price_per_kg} onChange={(event) => updateForm({ price_per_kg: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label" htmlFor={`${formId}-buyer_name`}> {label('profile.buyerName', 'Buyer Name')}</label>
                            <input id={`${formId}-buyer_name`} className="udp-input" placeholder={label('form.buyerPlaceholder', 'e.g. Ah Chong')} value={noteForm.buyer_name} onChange={(event) => updateForm({ buyer_name: event.target.value })} />
                        </div>
                    </div>
                    {(noteForm.kg_harvested && noteForm.price_per_kg) && (
                        <div className="udp-revenue-summary">
                            <span className="udp-revenue-label">{label('profile.estRevenue', 'Estimated Revenue')}</span>
                            <span className="udp-revenue-value">RM {(Number(noteForm.kg_harvested) * Number(noteForm.price_per_kg)).toFixed(2)}</span>
                        </div>
                    )}
                </>
            )}

            <div>
                <div className="udp-notes-header">
                    <label className="udp-form-label udp-form-label--compact" htmlFor={`${formId}-note`}> {label('profile.notes', 'Notes / Remarks')}{requiresNote && <span className="udp-form-required"> *</span>}</label>
                    <button type="button" onClick={() => onAutoEnhance()} disabled={enhancing || !noteForm.note.trim()} className="udp-enhance-btn">
                        <Sparkles size={12} />
                        {enhancing ? '...' : label('form.magicEnhance', 'Magic Enhance')}
                    </button>
                </div>
                <textarea id={`${formId}-note`} className="udp-input udp-textarea" rows={3} placeholder={label('profile.notePlaceholder', 'Additional observations for today...')} required={requiresNote} value={noteForm.note} onChange={(event) => updateForm({ note: event.target.value })} />
            </div>

            </fieldset>
            <OptionalFields title={label('profile.activityConditions', 'Field conditions (optional)')} initiallyOpen={Boolean([noteForm.temperature_am, noteForm.humidity].some(value => value !== '' && value != null))}>
            <div className="udp-form-grid">
                <div>
                    <label className="udp-form-label" htmlFor={`${formId}-temperature_am`}>{label('profile.tempAM', 'Temperature (C)')}</label>
                    <input id={`${formId}-temperature_am`} className="udp-input" type="number" min="0" max="50" step="0.1" placeholder={label('form.tempPlaceholder', 'e.g. 28')} value={noteForm.temperature_am} onChange={(event) => updateForm({ temperature_am: event.target.value })} />
                </div>
                <div>
                    <label className="udp-form-label" htmlFor={`${formId}-humidity`}> {label('profile.humidity', 'Humidity (%)')}</label>
                    <input id={`${formId}-humidity`} className="udp-input" type="number" min="0" max="100" placeholder={label('form.humPlaceholder', 'e.g. 75')} value={noteForm.humidity} onChange={(event) => updateForm({ humidity: event.target.value })} />
                </div>
            </div>

            </OptionalFields>
            {noteForm.activity_type !== 'harvest' && <OptionalFields title={label('profile.activityCosts', 'Costs (optional)')} initiallyOpen={Boolean(noteForm.expense_amount !== '' && noteForm.expense_amount != null)}>
                <div className="udp-form-grid">
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-expense_category`}> {label('profile.expenseCategory', 'Expense Category')}</label>
                        <select id={`${formId}-expense_category`} className="udp-input" value={noteForm.expense_category} onChange={(event) => updateForm({ expense_category: event.target.value })}>
                            {EXPENSE_CATEGORIES_CFG.map(c => (
                                <option key={c.value} value={c.value}>{label(c.key, c.value)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="udp-form-label" htmlFor={`${formId}-expense_amount`}> {label('profile.expense', 'Cost (RM)')}</label>
                        <input id={`${formId}-expense_amount`} className="udp-input" type="number" min="0" step="0.01" placeholder={label('form.expensePlaceholder', 'e.g. 50')} value={noteForm.expense_amount} onChange={(event) => updateForm({ expense_amount: event.target.value })} />
                    </div>
                </div>
            </OptionalFields>}
            <OptionalFields title={label('profile.activityPhoto', 'Attach a field photo (optional)')} initiallyOpen={Boolean(noteForm.photo_base64)}>
            <div>
                <p className="udp-form-label">{label('profile.photoAttachment', 'Photo Attachment')} <span className="udp-form-optional">{label('profile.photoOptional', '(Optional)')}</span></p>
                <div className="udp-photo-row">
                    <label className="udp-photo-upload-label">
                        <Plus size={18} />
                        {noteForm.photo_base64 ? label('profile.changePhoto', 'Change Photo') : label('profile.takeUploadPhoto', 'Take / Upload Photo')}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="activity-photo-input"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (readerEvent) => updateForm({ photo_base64: readerEvent.target?.result || '' });
                                reader.readAsDataURL(file);
                            }}
                        />
                    </label>
                    {noteForm.photo_base64 && (
                        <div className="udp-photo-preview">
                            <img src={noteForm.photo_base64} alt={label('profile.photoAttachment', 'Photo Attachment')} className="udp-photo-thumb" />
                            <button type="button" onClick={() => updateForm({ photo_base64: '' })} className="udp-photo-remove-btn" aria-label={`${label('common.delete', 'Delete')} ${label('profile.photoAttachment', 'Photo Attachment')}`}>
                                <X size={16} aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            </OptionalFields>
            {saveError && <p className="activity-save-error" role="alert">{saveError}</p>}
            <p className="activity-save-status" role="status">{savingNote ? label('profile.activitySaving', 'Saving your activity…') : label('profile.activitySaveHint', 'Your entry stays here until it is saved successfully.')}</p>
            <button type="submit" className="udp-submit-btn" disabled={savingNote}>
                {savingNote ? label('profile.activitySaving', 'Saving your activity…') : label('profile.activitySave', 'Save activity')}
            </button>
          </fieldset>
        </form>
    );
};

export default ActivityForm;
