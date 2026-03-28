import { X, Plus, MapPin, Leaf, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

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
}) => {
    const getUnitLabel = (unit) => {
        const unitKey = { acres: 'acres', sqft: 'sqft', hectares: 'hectares' }[unit];
        return unitKey ? (t(`profile.${unitKey}`) || unit) : unit;
    };
    const soilPhLabel = t('profile.soilPh') || 'Soil pH';

    return (
        <div>
            <div className="udp-tab-actions">
                <button className="udp-add-btn" onClick={() => setAddingPlot((value) => !value)}>
                    {addingPlot ? <X size={16} /> : <Plus size={16} />}
                    {addingPlot ? (t('common.cancel') || 'Cancel') : (t('profile.addPlot') || 'Add New Plot')}
                </button>
            </div>
            {addingPlot && (
                <form className="udp-inline-form" onSubmit={handleAddPlot}>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.plotName') || 'Plot Name'} <span className="udp-form-required">*</span></label>
                            <input className="udp-input" required placeholder={t('form.plotNamePlaceholder') || 'e.g. Block A or Durian Grove'} value={plotForm.name} onChange={(event) => setPlotForm((form) => ({ ...form, name: event.target.value }))} />
                        </div>
                    </div>
                    <div className="udp-form-row">
                        <div style={{ flex: 1 }}>
                            <label className="udp-form-label">{t('profile.cropType') || 'Crop Type'}</label>
                            <input className="udp-input" placeholder={t('form.cropTypePlaceholder') || 'e.g. Durian (Musang King)'} value={plotForm.cropType} onChange={(event) => setPlotForm((form) => ({ ...form, cropType: event.target.value }))} />
                        </div>
                        <div>
                            <label className="udp-form-label">{t('profile.area') || 'Area'}</label>
                            <div style={{ display: 'flex' }}>
                                <input className="udp-input" type="number" step="0.1" style={{ width: 60, borderRadius: '8px 0 0 8px' }} value={plotForm.area} onChange={(event) => setPlotForm((form) => ({ ...form, area: event.target.value }))} />
                                <select className="udp-input" style={{ width: 70, borderRadius: '0 8px 8px 0', borderLeft: 'none' }} value={plotForm.unit} onChange={(event) => setPlotForm((form) => ({ ...form, unit: event.target.value }))}>
                                    <option value="acres">{t('profile.acres') || 'Acres'}</option>
                                    <option value="sqft">{t('profile.sqft') || 'Sqft'}</option>
                                    <option value="hectares">{t('profile.hectares') || 'Ha'}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                        <button type="button" className="udp-see-all" style={{ fontSize: '0.8rem' }} onClick={() => setShowSoilFields(!showSoilFields)}>
                            {showSoilFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {t('profile.advancedSoilData') || 'Soil & Nutrient Data (Optional)'}
                        </button>
                        {showSoilFields && (
                            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div><label className="udp-form-label">{soilPhLabel}</label><input className="udp-input" type="number" step="0.1" placeholder={t('form.phPlaceholder') || 'e.g. 6.5'} value={plotForm.soil_ph} onChange={(event) => setPlotForm((form) => ({ ...form, soil_ph: event.target.value }))} /></div>
                                <div />
                                <div><label className="udp-form-label">{t('profile.soilNitrogen') || 'N (mg/kg)'}</label><input className="udp-input" type="number" placeholder="20" value={plotForm.npk_n} onChange={(event) => setPlotForm((form) => ({ ...form, npk_n: event.target.value }))} /></div>
                                <div><label className="udp-form-label">{t('profile.soilPhosphorus') || 'P (mg/kg)'}</label><input className="udp-input" type="number" placeholder="15" value={plotForm.npk_p} onChange={(event) => setPlotForm((form) => ({ ...form, npk_p: event.target.value }))} /></div>
                                <div><label className="udp-form-label">{t('profile.soilPotassium') || 'K (mg/kg)'}</label><input className="udp-input" type="number" placeholder="18" value={plotForm.npk_k} onChange={(event) => setPlotForm((form) => ({ ...form, npk_k: event.target.value }))} /></div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="udp-submit-btn" disabled={savingPlot}>{savingPlot ? '...' : (t('common.save') || 'Save')}</button>
                </form>
            )}

            <div className="udp-plot-list">
                {plots.length === 0 && !addingPlot && <div className="udp-empty"><MapPin size={32} /><p>{t('profile.noPlots') || 'No plots mapped.'}</p></div>}
                {plots.map((plot) => (
                    <div key={plot.id} className="udp-plot-card">
                        <div className="udp-plot-icon"><Leaf size={20} /></div>
                        <div className="udp-plot-info">
                            <span className="udp-plot-name">{plot.name} {plot.area ? `(${plot.area} ${getUnitLabel(plot.unit)})` : ''}</span>
                            <span className="udp-plot-meta">{plot.cropType || (t('profile.mixCrop') || 'Mixed Crop')}</span>
                            {plot.soil_ph && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>{soilPhLabel}: {plot.soil_ph}</span>}
                        </div>
                        <button className="udp-delete-btn" onClick={() => handleDeletePlot(plot.id)}><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PlotsTab;
