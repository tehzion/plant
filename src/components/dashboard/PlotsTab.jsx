import { X, Plus, MapPin, Leaf, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { PLOT_UNITS_CFG } from '../../data/config';

const PlotsTab = ({
    t,
    setAddingPlot,
    addingPlot,
    handleAddPlot,
    plotForm,
    setPlotForm,
    setShowSoilFields,
    showSoilFields,
    savingPlot,
    plots,
    handleDeletePlot,
    label: labelProp,
}) => {
    const label = (key, fallback) => {
        if (typeof labelProp === 'function') return labelProp(key, fallback);
        const value = t(key);
        return value && value !== key ? value : fallback;
    };
    const getUnitLabel = (unit) => {
        const item = PLOT_UNITS_CFG.find(u => u.value === unit);
        return item ? label(item.key, unit) : unit;
    };
    const soilPhLabel = label('profile.soilPh', 'Soil pH');

    return (
        <div>
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingPlot((value) => !value)}>
                    {addingPlot ? <X size={16} /> : <Plus size={16} />}
                    {addingPlot ? label('common.cancel', 'Cancel') : label('profile.addPlot', 'Add New Plot')}
                </button>
            </div>
            {addingPlot && (
                <form className="udp-inline-form" onSubmit={handleAddPlot}>
                    <div className="udp-form-row">
                        <div className="udp-form-field udp-form-field--grow">
                            <label className="udp-form-label">{label('profile.plotName', 'Plot Name')} <span className="udp-form-required">*</span></label>
                            <input className="udp-input" required placeholder={label('form.plotNamePlaceholder', 'e.g. Block A or Durian Grove')} value={plotForm.name} onChange={(event) => setPlotForm((form) => ({ ...form, name: event.target.value }))} />
                        </div>
                    </div>
                    <div className="udp-form-row">
                        <div className="udp-form-field udp-form-field--grow">
                            <label className="udp-form-label">{label('profile.cropType', 'Crop Type')}</label>
                            <input className="udp-input" placeholder={label('form.cropTypePlaceholder', 'e.g. Durian (Musang King)')} value={plotForm.cropType} onChange={(event) => setPlotForm((form) => ({ ...form, cropType: event.target.value }))} />
                        </div>
                        <div className="udp-form-field">
                            <label className="udp-form-label">{label('profile.area', 'Area')}</label>
                            <div className="udp-input-split">
                                <input className="udp-input udp-input-split__field udp-input-split__field--number" type="number" step="0.1" value={plotForm.area} onChange={(event) => setPlotForm((form) => ({ ...form, area: event.target.value }))} />
                                <select className="udp-input udp-input-split__field udp-input-split__field--unit" value={plotForm.unit} onChange={(event) => setPlotForm((form) => ({ ...form, unit: event.target.value }))}>
                                    {PLOT_UNITS_CFG.map(u => (
                                        <option key={u.value} value={u.value}>{label(u.key, u.label)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="udp-advanced-fields">
                        <button type="button" className="udp-see-all udp-see-all--compact" onClick={() => setShowSoilFields(!showSoilFields)}>
                            {showSoilFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {label('profile.advancedSoilData', 'Soil & Nutrient Data (Optional)')}
                        </button>
                        {showSoilFields && (
                            <div className="udp-advanced-fields-grid">
                                <div><label className="udp-form-label">{soilPhLabel}</label><input className="udp-input" type="number" step="0.1" placeholder={label('form.phPlaceholder', 'e.g. 6.5')} value={plotForm.soil_ph} onChange={(event) => setPlotForm((form) => ({ ...form, soil_ph: event.target.value }))} /></div>
                                <div />
                                <div><label className="udp-form-label">{label('profile.soilNitrogen', 'N (mg/kg)')}</label><input className="udp-input" type="number" placeholder="20" value={plotForm.npk_n} onChange={(event) => setPlotForm((form) => ({ ...form, npk_n: event.target.value }))} /></div>
                                <div><label className="udp-form-label">{label('profile.soilPhosphorus', 'P (mg/kg)')}</label><input className="udp-input" type="number" placeholder="15" value={plotForm.npk_p} onChange={(event) => setPlotForm((form) => ({ ...form, npk_p: event.target.value }))} /></div>
                                <div><label className="udp-form-label">{label('profile.soilPotassium', 'K (mg/kg)')}</label><input className="udp-input" type="number" placeholder="18" value={plotForm.npk_k} onChange={(event) => setPlotForm((form) => ({ ...form, npk_k: event.target.value }))} /></div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="udp-submit-btn" disabled={savingPlot}>{savingPlot ? '...' : label('common.save', 'Save')}</button>
                </form>
            )}

            <div className="udp-plot-list">
                {plots.length === 0 && !addingPlot && <div className="udp-empty"><MapPin size={32} /><p>{label('profile.noPlots', 'No plots mapped.')}</p></div>}
                {plots.map((plot) => (
                    <div key={plot.id} className="udp-plot-card">
                        <div className="udp-plot-icon"><Leaf size={20} /></div>
                        <div className="udp-plot-info">
                            <span className="udp-plot-name">{plot.name} {plot.area ? `(${plot.area} ${getUnitLabel(plot.unit)})` : ''}</span>
                            <span className="udp-plot-meta">{plot.cropType || label('profile.mixCrop', 'Mixed Crop')}</span>
                            {plot.soil_ph && <span className="udp-plot-soil-ph">{soilPhLabel}: {plot.soil_ph}</span>}
                        </div>
                        <button className="udp-delete-btn" onClick={() => handleDeletePlot(plot.id)}><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlotsTab;
