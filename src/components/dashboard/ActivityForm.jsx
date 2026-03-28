import { Plus, Sparkles } from 'lucide-react';

const ActivityForm = ({
    t,
    noteForm,
    setNoteForm,
    plots,
    activityTypes,
    enhancing,
    enhanceText,
    setEnhanceText,
    onAutoEnhance,
    onSubmit,
    savingNote,
}) => {
    const currentType = activityTypes.find((type) => type.value === noteForm.activity_type) ?? activityTypes[0];
    const showChemical = currentType?.chemical;

    const updateForm = (patch) => {
        setNoteForm((currentForm) => ({ ...currentForm, ...patch }));
    };

    const handleActivityTypeChange = (activityType) => {
        let expenseCategory = 'Other';
        if (activityType === 'fertilize') expenseCategory = 'Fertilizer';
        else if (activityType === 'spray') expenseCategory = 'Pesticide';
        else if (['prune', 'inspect', 'scout'].includes(activityType)) expenseCategory = 'Labor';
        updateForm({ activity_type: activityType, expense_category: expenseCategory });
    };

    return (
        <form className="udp-inline-form" onSubmit={onSubmit}>
            <div>
                <label className="udp-form-label">{t('profile.activityType') || 'Activity Type'}</label>
                <div className="udp-activity-grid">
                    {activityTypes.map((activityType) => (
                        <button key={activityType.value} type="button" className={`udp-activity-chip ${noteForm.activity_type === activityType.value ? 'active' : ''}`} onClick={() => handleActivityTypeChange(activityType.value)}>
                            {activityType.label}
                        </button>
                    ))}
                </div>
            </div>

            {plots.length > 0 && (
                <div>
                    <label className="udp-form-label">{t('profile.plot') || 'Plot / Farm'}</label>
                    <select className="udp-input" value={noteForm.plot_id} onChange={(event) => updateForm({ plot_id: event.target.value })}>
                        <option value="">{t('profile.selectPlot') || 'Select plot (optional)'}</option>
                        {plots.map((plot) => <option key={plot.id} value={plot.id}>{plot.name}</option>)}
                    </select>
                </div>
            )}

            {showChemical && (
                <>
                    <div>
                        <label className="udp-form-label">{t('profile.chemicalName') || 'Pesticide / Fertilizer Name'} <span className="udp-form-required">*</span></label>
                        <input className="udp-input" placeholder={t('profile.chemicalNamePlaceholder') || 'e.g. Mancozeb 80% WP'} value={noteForm.chemical_name} onChange={(event) => updateForm({ chemical_name: event.target.value })} />
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.quantity') || 'Quantity Applied'}</label>
                            <input className="udp-input" placeholder={t('profile.qtyPlaceholder') || 'e.g. 200ml / 15L'} value={noteForm.chemical_qty} onChange={(event) => updateForm({ chemical_qty: event.target.value })} />
                        </div>
                        <div>
                            <label className="udp-form-label">{t('profile.timing') || 'Timing'}</label>
                            <div className="udp-timing-toggle">
                                {['AM', 'PM', 'Both'].map((value) => (
                                    <button key={value} type="button" className={`udp-timing-btn ${noteForm.application_timing === value ? 'active' : ''}`} onClick={() => updateForm({ application_timing: value })}>
                                        {t(`profile.timing${value}`) || value}
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
                        <label className="udp-form-label">{t('profile.growthStage') || 'Growth Stage'}</label>
                        <select className="udp-input" value={noteForm.growth_stage} onChange={(event) => updateForm({ growth_stage: event.target.value })}>
                            <option value="Seedling">{t('profile.stageSeedling') || 'Seedling'}</option>
                            <option value="Vegetative">{t('profile.stageVegetative') || 'Vegetative'}</option>
                            <option value="Flowering">{t('profile.stageFlowering') || 'Flowering'}</option>
                            <option value="Fruiting">{t('profile.stageFruiting') || 'Fruiting'}</option>
                            <option value="Harvest">{t('profile.stageHarvest') || 'Harvest'}</option>
                        </select>
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.diseaseIncidence') || 'Disease Incidence (%)'}</label>
                            <input className="udp-input" type="number" min="0" max="100" placeholder={t('form.incidencePlaceholder') || 'e.g. 15'} value={noteForm.disease_incidence} onChange={(event) => updateForm({ disease_incidence: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.scoutSeverity') || 'Severity'}</label>
                            <select className="udp-input" value={noteForm.scout_severity} onChange={(event) => updateForm({ scout_severity: event.target.value })}>
                                <option value="Low">{t('profile.severityLow') || 'Low'}</option>
                                <option value="Moderate">{t('profile.severityModerate') || 'Moderate'}</option>
                                <option value="High">{t('profile.severityHigh') || 'High'}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="udp-form-label">{t('profile.diseaseNameObserved') || 'Disease / Pest Name'} <span className="udp-form-required">*</span></label>
                        <input className="udp-input" placeholder={t('form.diseasePlaceholder') || 'e.g. Aphids or Powdery Mildew'} value={noteForm.disease_name_observed} onChange={(event) => updateForm({ disease_name_observed: event.target.value })} />
                    </div>
                    <div>
                        <label className="udp-form-label">{t('profile.pestNotes') || 'Pest Count / Observations'}</label>
                        <input className="udp-input" placeholder={t('form.pestPlaceholder') || 'e.g. ~10 aphids per leaf'} value={noteForm.pest_notes} onChange={(event) => updateForm({ pest_notes: event.target.value })} />
                    </div>
                </>
            )}

            {noteForm.activity_type === 'prune' && (
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.prunedCount') || 'Trees / Items Pruned'}</label>
                        <input className="udp-input" type="number" min="0" placeholder="e.g. 10" value={noteForm.pruned_count} onChange={(event) => updateForm({ pruned_count: event.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.pruningType') || 'Pruning Type'}</label>
                        <select className="udp-input" value={noteForm.pruning_type} onChange={(event) => updateForm({ pruning_type: event.target.value })}>
                            <option value="Thinning">{t('profile.pruneThinning') || 'Thinning'}</option>
                            <option value="Structural">{t('profile.pruneStructural') || 'Structural'}</option>
                            <option value="Deadwood">{t('profile.pruneDeadwood') || 'Deadwood'}</option>
                            <option value="Others">{t('profile.catOther') || 'Others'}</option>
                        </select>
                    </div>
                </div>
            )}

            {noteForm.activity_type === 'inspect' && (
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.inspectionType') || 'Inspection Type'}</label>
                        <select className="udp-input" value={noteForm.inspection_type} onChange={(event) => updateForm({ inspection_type: event.target.value })}>
                            <option value="Pest/Disease">{t('profile.inspectPestDisease') || 'Pest / Disease'}</option>
                            <option value="Soil/Nutrient">{t('profile.inspectSoilNutrient') || 'Soil / Nutrient'}</option>
                            <option value="Irrigation">{t('profile.inspectIrrigation') || 'Irrigation'}</option>
                            <option value="Infrastructure">{t('profile.inspectInfrastructure') || 'Infrastructure'}</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.inspectionStatus') || 'Status'}</label>
                        <select className="udp-input" value={noteForm.inspection_status} onChange={(event) => updateForm({ inspection_status: event.target.value })}>
                            <option value="Good">{t('profile.inspectStatusGood') || 'Good / Pass'}</option>
                            <option value="Action Required">{t('profile.inspectStatusActionRequired') || 'Action Required'}</option>
                            <option value="Urgent">{t('profile.inspectStatusUrgent') || 'Urgent Warning'}</option>
                        </select>
                    </div>
                </div>
            )}

            {noteForm.activity_type === 'harvest' && (
                <>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.kgHarvested') || 'Yield (kg)'} <span className="udp-form-required">*</span></label>
                            <input className="udp-input" type="number" min="0" step="0.1" placeholder={t('form.kgPlaceholder') || 'e.g. 50'} value={noteForm.kg_harvested} onChange={(event) => updateForm({ kg_harvested: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.qualityGrade') || 'Quality Grade'}</label>
                            <select className="udp-input" value={noteForm.quality_grade} onChange={(event) => updateForm({ quality_grade: event.target.value })}>
                                <option value="Excellent">{t('profile.qualityExcellent') || 'Excellent'}</option>
                                <option value="Good">{t('profile.qualityGood') || 'Good'}</option>
                                <option value="Fair">{t('profile.qualityFair') || 'Fair'}</option>
                                <option value="Poor">{t('profile.qualityPoor') || 'Poor'}</option>
                            </select>
                        </div>
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.pricePerKg') || 'Price per kg (RM)'}</label>
                            <input className="udp-input" type="number" min="0" step="0.01" placeholder={t('form.pricePlaceholder') || 'e.g. 8.50'} value={noteForm.price_per_kg} onChange={(event) => updateForm({ price_per_kg: event.target.value })} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.buyerName') || 'Buyer Name'}</label>
                            <input className="udp-input" placeholder={t('form.buyerPlaceholder') || 'e.g. Ah Chong'} value={noteForm.buyer_name} onChange={(event) => updateForm({ buyer_name: event.target.value })} />
                        </div>
                    </div>
                    {(noteForm.kg_harvested && noteForm.price_per_kg) && (
                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #dcfce7', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>{t('profile.estRevenue') || 'Estimated Revenue'}</span>
                            <span style={{ fontSize: '1rem', color: '#15803d', fontWeight: 800 }}>RM {(Number(noteForm.kg_harvested) * Number(noteForm.price_per_kg)).toFixed(2)}</span>
                        </div>
                    )}
                </>
            )}

            <div className="udp-form-grid">
                <div>
                    <label className="udp-form-label">{t('profile.tempAM') || 'Temperature (C)'}</label>
                    <input className="udp-input" type="number" min="0" max="50" step="0.1" placeholder={t('form.tempPlaceholder') || 'e.g. 28'} value={noteForm.temperature_am} onChange={(event) => updateForm({ temperature_am: event.target.value })} />
                </div>
                <div>
                    <label className="udp-form-label">{t('profile.humidity') || 'Humidity (%)'}</label>
                    <input className="udp-input" type="number" min="0" max="100" placeholder={t('form.humPlaceholder') || 'e.g. 75'} value={noteForm.humidity} onChange={(event) => updateForm({ humidity: event.target.value })} />
                </div>
            </div>

            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="udp-form-label" style={{ marginBottom: 0 }}>{t('profile.notes') || 'Notes / Remarks'}</label>
                    <button type="button" onClick={() => onAutoEnhance()} disabled={enhancing || !noteForm.note.trim()} style={{ background: 'none', border: 'none', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.2s' }} className="udp-enhance-btn">
                        <Sparkles size={12} />
                        {enhancing ? '...' : (t('form.magicEnhance') || 'Magic Enhance')}
                    </button>
                </div>
                <textarea className="udp-input" rows={3} placeholder={t('profile.notePlaceholder') || 'Additional observations for today...'} value={noteForm.note} onChange={(event) => updateForm({ note: event.target.value })} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {noteForm.activity_type !== 'harvest' && (
                <div className="udp-form-grid">
                    <div>
                        <label className="udp-form-label">{t('profile.expenseCategory') || 'Expense Category'}</label>
                        <select className="udp-input" value={noteForm.expense_category} onChange={(event) => updateForm({ expense_category: event.target.value })}>
                            <option value="Fertilizer">{t('profile.catFertilizer') || 'Fertilizer'}</option>
                            <option value="Pesticide">{t('profile.catPesticide') || 'Pesticide'}</option>
                            <option value="Labor">{t('profile.catLabor') || 'Labor'}</option>
                            <option value="Equipment">{t('profile.catEquipment') || 'Equipment'}</option>
                            <option value="Other">{t('profile.catOther') || 'Other'}</option>
                        </select>
                    </div>
                    <div>
                        <label className="udp-form-label">{t('profile.expense') || 'Cost (RM)'}</label>
                        <input className="udp-input" type="number" min="0" step="0.01" placeholder={t('form.expensePlaceholder') || 'e.g. 50'} value={noteForm.expense_amount} onChange={(event) => updateForm({ expense_amount: event.target.value })} />
                    </div>
                </div>
            )}

            <div>
                <label className="udp-form-label">{t('profile.photoAttachment') || 'Photo Attachment'} <span style={{ fontWeight: 400, opacity: 0.6 }}>{t('profile.photoOptional') || '(Optional)'}</span></label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 600, transition: 'all 0.2s' }} className="udp-photo-upload-label">
                        <Plus size={18} />
                        {noteForm.photo_base64 ? (t('profile.changePhoto') || 'Change Photo') : (t('profile.takeUploadPhoto') || 'Take / Upload Photo')}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
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
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <img src={noteForm.photo_base64} alt={t('profile.photoAttachment') || 'Photo Attachment'} style={{ width: 70, height: 70, borderRadius: 12, objectFit: 'cover', border: '2px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                            <button type="button" onClick={() => updateForm({ photo_base64: '' })} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                                x
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <button type="submit" className="udp-submit-btn" disabled={savingNote}>
                {savingNote ? '...' : (t('common.save') || 'Save')}
            </button>
        </form>
    );
};

export default ActivityForm;
