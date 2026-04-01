import { useState } from 'react';
import {
    Camera,
    ChevronRight,
    ClipboardList,
    DollarSign,
    Droplets,
    FileText,
    FlaskConical,
    MapPinned,
    PackageCheck,
    Plus,
    Scissors,
    Search,
    Thermometer,
    X,
} from 'lucide-react';
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

const NOTE_ICON_MAP = {
    note: ClipboardList,
    scout: Search,
    spray: FlaskConical,
    fertilize: Droplets,
    prune: Scissors,
    inspect: Search,
    harvest: PackageCheck,
    other: ClipboardList,
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
    label: labelProp,
}) => {
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    const label = (key, fallback) => {
        if (typeof labelProp === 'function') return labelProp(key, fallback);
        const value = t(key);
        return value && value !== key ? value : fallback;
    };

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

    const getSeverityClass = (severity) => {
        if (severity === 'High') return 'notes-severity--high';
        if (severity === 'Moderate') return 'notes-severity--moderate';
        return 'notes-severity--low';
    };

    const pendingLabel = notes.length > 0
        ? label('profile.activityLog', 'Activity Log')
        : label('profile.logDailyTask', 'Daily Log Pending');
    const pendingHint = notes.length > 0
        ? label('profile.dailyLogFeedHint', 'Keep spraying, scouting, harvest, and expenses organized in one place.')
        : label('profile.logDailyHint', "Record today's activities to maintain your streak.");

    return (
        <div className="notes-shell">
            <div className="notes-hero">
                <div className="notes-hero-copy">
                    <span className="notes-hero-kicker">{label('profile.tabNotes', 'Daily Log')}</span>
                    <h3 className="notes-hero-title">{pendingLabel}</h3>
                    <p className="notes-hero-subtitle">{pendingHint}</p>
                </div>
                <div className="notes-hero-pill">
                    <ClipboardList size={14} />
                    <span>{notes.length} {label('profile.activityLog', 'Logs')}</span>
                </div>
            </div>

            <div className="udp-tab-actions notes-actions">
                <button className="udp-add-btn" onClick={() => setAddingNote((value) => !value)}>
                    {addingNote ? <X size={16} /> : <Plus size={16} />}
                    {addingNote ? label('common.cancel', 'Cancel') : label('profile.addNote', 'Add Log Entry')}
                </button>
            </div>

            {addingNote && (
                <div className="notes-form-shell">
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
                </div>
            )}

            <div className="udp-note-list">
                {notes.length === 0 && !addingNote && (
                    <div className="udp-empty">
                        <FileText size={32} />
                        <p>{label('profile.noNotes', 'No log entries yet.')}</p>
                    </div>
                )}

                {notes.map((note) => {
                    const badgeCfg = ACTIVITY_BADGE_COLOR[note.activity_type] ?? ACTIVITY_BADGE_COLOR.note;
                    const typeLabel = activityTypes.find((activity) => activity.value === note.activity_type)?.label
                        ?? label('profile.actNote', 'Note');
                    const plotName = plots.find((plot) => plot.id === note.plot_id)?.name;
                    const NoteIcon = NOTE_ICON_MAP[note.activity_type] ?? ClipboardList;
                    const revenue = (note.kg_harvested != null && note.price_per_kg != null)
                        ? (Number(note.kg_harvested) * Number(note.price_per_kg)).toFixed(2)
                        : null;

                    return (
                        <div key={note.id} className="udp-note-card notes-card">
                            <div className="udp-note-top notes-card-top">
                                <div className="notes-card-main">
                                    <span
                                        className="notes-card-icon"
                                        style={{ '--notes-badge-bg': badgeCfg.bg, '--notes-badge-color': badgeCfg.color }}
                                    >
                                        <NoteIcon size={18} />
                                    </span>
                                    <div className="notes-card-heading">
                                        <div className="notes-card-heading-row">
                                            <span
                                                className="udp-note-badge"
                                                style={{ '--notes-badge-bg': badgeCfg.bg, '--notes-badge-color': badgeCfg.color }}
                                            >
                                                {typeLabel}
                                            </span>
                                            <span className="udp-note-date">{relDate(note.created_at || note.timestamp, t)}</span>
                                        </div>
                                        {plotName && (
                                            <span className="udp-note-plot">
                                                <MapPinned size={12} />
                                                {plotName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={15} className="notes-card-chevron" />
                            </div>

                            {note.chemical_name && (
                                <div className="udp-note-chem notes-row-detail">
                                    <FlaskConical size={15} />
                                    <span>
                                        <strong>{note.chemical_name}</strong>
                                        {note.chemical_qty && <> · {note.chemical_qty}</>}
                                        {note.application_timing && <> · {localizeTiming(note.application_timing)}</>}
                                    </span>
                                </div>
                            )}

                            {note.activity_type === 'scout' && (
                                <div className="udp-note-chem notes-row-detail">
                                    <Search size={15} />
                                    <span>
                                        <strong>{note.disease_name_observed || label('profile.fieldObservation', 'Field Observation')}</strong>
                                        {note.growth_stage && <> · {localizeGrowthStage(note.growth_stage)}</>}
                                        {note.disease_incidence != null && <> · {note.disease_incidence}% {label('profile.diseaseIncidence', 'Disease Incidence (%)')}</>}
                                        <br />
                                        <span className={`notes-severity ${getSeverityClass(note.scout_severity)}`}>
                                            {label('profile.severity', 'Severity')}: {label(`profile.severity${note.scout_severity || 'Low'}`, note.scout_severity || 'Low')}
                                        </span>
                                    </span>
                                </div>
                            )}

                            {note.activity_type === 'harvest' && (
                                <div className="udp-note-chem notes-row-detail">
                                    <PackageCheck size={15} />
                                    <span>
                                        <strong>{note.kg_harvested} kg</strong> ({label(`profile.quality${note.quality_grade}`, note.quality_grade || 'Unrated')})
                                        {note.price_per_kg != null && <> · RM{Number(note.price_per_kg).toFixed(2)}/kg</>}
                                        {note.buyer_name && <> · {label('profile.soldTo', 'Sold to')} {note.buyer_name}</>}
                                        {revenue && <div className="notes-revenue-chip">+RM{revenue}</div>}
                                    </span>
                                </div>
                            )}

                            {(note.expense_amount != null && note.expense_amount !== '') && (
                                <div className="udp-note-chem notes-row-detail notes-row-detail--expense">
                                    <DollarSign size={15} />
                                    <span>
                                        -RM{Number(note.expense_amount).toFixed(2)}
                                        {note.expense_category && (
                                            <span className="notes-expense-category">
                                                {' '}({localizeExpenseCategory(note.expense_category)})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            )}

                            {(note.temperature_am != null || note.humidity != null) && (
                                <div className="udp-note-env">
                                    {note.temperature_am != null && (
                                        <span>
                                            <Thermometer size={12} />
                                            {note.temperature_am}°C
                                        </span>
                                    )}
                                    {note.humidity != null && (
                                        <span>
                                            <Droplets size={12} />
                                            {note.humidity}% RH
                                        </span>
                                    )}
                                </div>
                            )}

                            {note.note && <p className="udp-note-text">{note.note}</p>}

                            {note.photo_url && (
                                <button type="button" className="notes-photo-card" onClick={() => setSelectedPhoto(note.photo_url)}>
                                    <Camera size={14} />
                                    <img src={note.photo_url} alt={label('profile.photoAttachment', 'Field photo')} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedPhoto && (
                <div className="notes-photo-viewer" onClick={() => setSelectedPhoto(null)}>
                    <div className="notes-photo-viewer-card" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            className="notes-photo-viewer-close"
                            onClick={() => setSelectedPhoto(null)}
                            aria-label={label('common.close', 'Close')}
                        >
                            <X size={18} />
                        </button>
                        <img
                            src={selectedPhoto}
                            alt={label('profile.photoAttachment', 'Field photo')}
                            className="notes-photo-viewer-image"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesTab;
