import { X, Plus, FileText } from 'lucide-react';
import ActivityForm from './ActivityForm';

const STAGE_KEY_MAP = {
    Seedling: 'profile.stageSeedling',
    Vegetative: 'profile.stageVegetative',
    Flowering: 'profile.stageFlowering',
    Fruiting: 'profile.stageFruiting',
    Harvest: 'profile.stageHarvest',
};

const TIMING_KEY_MAP = {
    AM: 'profile.timingAM',
    PM: 'profile.timingPM',
    Both: 'profile.timingBoth',
};

const EXPENSE_KEY_MAP = {
    Fertilizer: 'profile.catFertilizer',
    Pesticide: 'profile.catPesticide',
    Labor: 'profile.catLabor',
    Equipment: 'profile.catEquipment',
    Other: 'profile.catOther',
};

const NotesTab = ({
    t,
    setAddingNote,
    addingNote,
    handleAddNote,
    noteForm,
    setNoteForm,
    activityTypes,
    plots,
    onAutoEnhance,
    enhancing,
    enhanceText,
    setEnhanceText,
    savingNote,
    notes,
    ACTIVITY_BADGE_COLOR,
    relDate,
    label,
}) => {
    const localizeTiming = (timing) => {
        const key = TIMING_KEY_MAP[timing];
        return key ? label(key, timing) : timing;
    };

    const localizeGrowthStage = (stage) => {
        const key = STAGE_KEY_MAP[stage];
        return key ? label(key, stage) : stage;
    };

    const localizeExpenseCategory = (category) => {
        const key = EXPENSE_KEY_MAP[category];
        return key ? label(key, category) : category;
    };

    return (
        <div>
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingNote((value) => !value)}>
                    {addingNote ? <X size={16} /> : <Plus size={16} />}
                    {addingNote ? label('common.cancel', 'Cancel') : label('profile.addNote', 'Add Log Entry')}
                </button>
            </div>
            {addingNote && (
                <ActivityForm
                    t={t}
                    label={label}
                    noteForm={noteForm}
                    setNoteForm={setNoteForm}
                    plots={plots}
                    activityTypes={activityTypes}
                    enhancing={enhancing}
                    enhanceText={enhanceText}
                    setEnhanceText={setEnhanceText}
                    onAutoEnhance={onAutoEnhance}
                    onSubmit={handleAddNote}
                    savingNote={savingNote}
                />
            )}

            <div className="udp-note-list">
                {notes.length === 0 && !addingNote && <div className="udp-empty"><FileText size={32} /><p>{label('profile.noNotes', 'No log entries yet.')}</p></div>}
                {notes.map((note) => {
                    const badgeCfg = ACTIVITY_BADGE_COLOR[note.activity_type] ?? ACTIVITY_BADGE_COLOR.note;
                    const typeLabel = activityTypes.find((activity) => activity.value === note.activity_type)?.label ?? label('profile.actNote', 'Note');
                    const plotName = plots.find((plot) => plot.id === note.plot_id)?.name;

                    return (
                        <div key={note.id} className="udp-note-card">
                            <div className="udp-note-top">
                                <span className="udp-note-badge" style={{ background: badgeCfg.bg, color: badgeCfg.color }}>{typeLabel}</span>
                                {plotName && <span className="udp-note-plot">📍 {plotName}</span>}
                                <span className="udp-note-date">{relDate(note.created_at || note.timestamp, t)}</span>
                            </div>
                            {note.chemical_name && <div className="udp-note-chem">🧪 <strong>{note.chemical_name}</strong>{note.chemical_qty && <> · {note.chemical_qty}</>}{note.application_timing && <> · {localizeTiming(note.application_timing)}</>}</div>}
                            {note.activity_type === 'scout' && (
                                <div className="udp-note-chem">
                                    🔍 <strong>{note.disease_name_observed || label('profile.fieldObservation', 'Field Observation')}</strong>{note.growth_stage && <> · {localizeGrowthStage(note.growth_stage)}</>}{note.disease_incidence != null && <> · {note.disease_incidence}% {label('profile.diseaseIncidence', 'Disease Incidence (%)')}</>}
                                    <br /><span style={{ color: note.scout_severity === 'High' ? '#ef4444' : note.scout_severity === 'Moderate' ? '#f59e0b' : '#374151', fontSize: '0.75rem', fontWeight: 600 }}>{label('profile.severity', 'Severity')}: {label(`profile.severity${note.scout_severity || 'Low'}`, note.scout_severity || 'Low')}</span>
                                </div>
                            )}
                            {note.activity_type === 'harvest' && (
                                <div className="udp-note-chem">
                                    🍎 <strong>{note.kg_harvested} kg</strong> ({label(`profile.quality${note.quality_grade}`, note.quality_grade || 'Unrated')}){note.price_per_kg != null && <> · RM{Number(note.price_per_kg).toFixed(2)}/kg</>}{note.buyer_name && <> · {label('profile.soldTo', 'Sold to')} {note.buyer_name}</>}
                                    {(note.kg_harvested != null && note.price_per_kg != null) && <div style={{ color: '#059669', fontWeight: 600 }}>💰 +RM{(note.kg_harvested * note.price_per_kg).toFixed(2)}</div>}
                                </div>
                            )}
                            {(note.expense_amount != null && note.expense_amount !== '') && <div className="udp-note-chem" style={{ color: '#dc2626', fontWeight: 600 }}>💸 -RM{Number(note.expense_amount).toFixed(2)}{note.expense_category && <span style={{ color: '#ef4444', fontWeight: 400 }}> ({localizeExpenseCategory(note.expense_category)})</span>}</div>}
                            {(note.temperature_am != null || note.humidity != null) && <div className="udp-note-env">{note.temperature_am != null && <span>🌡 {note.temperature_am}°C</span>}{note.humidity != null && <span>💧 {note.humidity}% RH</span>}</div>}
                            {note.note && <p className="udp-note-text">{note.note}</p>}
                            {note.photo_url && <img src={note.photo_url} alt={label('profile.photoAttachment', 'Field photo')} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginTop: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => window.open(note.photo_url, '_blank')} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default NotesTab;
