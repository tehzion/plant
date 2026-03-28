import { X, Plus, MapPin, Leaf, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const PlotsTab = ({ 
    t, setAddingPlot, addingPlot, handleAddPlot, plotForm, setPlotForm, 
    setShowSoilFields, showSoilFields, savingPlot, plots, handleDeletePlot 
}) => (
    <div>
        <div className="udp-tab-actions">
            <button className="udp-add-btn" onClick={() => setAddingPlot(v => !v)}>
                {addingPlot ? <X size={16} /> : <Plus size={16} />}
                {addingPlot ? (t('common.cancel') || 'Cancel') : (t('profile.addPlot') || 'Add New Plot')}
            </button>
        </div>
        {addingPlot && (
            <form className="udp-inline-form" onSubmit={handleAddPlot}>
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.plotName') || 'Plot Name'} <span className="udp-form-required">*</span></label>
                        <input className="udp-input" required placeholder="e.g. Zone A" value={plotForm.name} onChange={e => setPlotForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                </div>
                <div className="udp-form-row">
                    <div style={{ flex: 1 }}>
                        <label className="udp-form-label">{t('profile.cropType') || 'Crop Type'}</label>
                        <input className="udp-input" placeholder="e.g. Durian D24" value={plotForm.cropType} onChange={e => setPlotForm(f => ({ ...f, cropType: e.target.value }))} />
                    </div>
                    <div>
                        <label className="udp-form-label">{t('profile.area') || 'Area'}</label>
                        <div style={{ display: 'flex' }}>
                            <input className="udp-input" type="number" step="0.1" style={{ width: 60, borderRadius: '8px 0 0 8px' }} value={plotForm.area} onChange={e => setPlotForm(f => ({ ...f, area: e.target.value }))} />
                            <select className="udp-input" style={{ width: 70, borderRadius: '0 8px 8px 0', borderLeft: 'none' }} value={plotForm.unit} onChange={e => setPlotForm(f => ({ ...f, unit: e.target.value }))}>
                                <option value="acres">Acres</option><option value="sqft">Sqft</option><option value="hectares">Ha</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 8 }}>
                    <button type="button" className="udp-see-all" style={{ fontSize: '0.8rem' }} onClick={() => setShowSoilFields(!showSoilFields)}>
                        {showSoilFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {t('profile.soilNutrientData') || 'Soil & Nutrient Data (Optional)'}
                    </button>
                    {showSoilFields && (
                        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div><label className="udp-form-label">Soil pH</label><input className="udp-input" type="number" step="0.1" placeholder="6.5" value={plotForm.soil_ph} onChange={e => setPlotForm(f => ({ ...f, soil_ph: e.target.value }))} /></div>
                            <div />
                            <div><label className="udp-form-label">N (mg/kg)</label><input className="udp-input" type="number" placeholder="20" value={plotForm.npk_n} onChange={e => setPlotForm(f => ({ ...f, npk_n: e.target.value }))} /></div>
                            <div><label className="udp-form-label">P (mg/kg)</label><input className="udp-input" type="number" placeholder="15" value={plotForm.npk_p} onChange={e => setPlotForm(f => ({ ...f, npk_p: e.target.value }))} /></div>
                            <div><label className="udp-form-label">K (mg/kg)</label><input className="udp-input" type="number" placeholder="18" value={plotForm.npk_k} onChange={e => setPlotForm(f => ({ ...f, npk_k: e.target.value }))} /></div>
                        </div>
                    )}
                </div>

                <button type="submit" className="udp-submit-btn" disabled={savingPlot}>{savingPlot ? '…' : (t('common.save') || 'Save Plot')}</button>
            </form>
        )}

        <div className="udp-plot-list">
            {plots.length === 0 && !addingPlot && <div className="udp-empty"><MapPin size={32} /><p>{t('profile.noPlots') || 'No plots mapped.'}</p></div>}
            {plots.map(p => (
                <div key={p.id} className="udp-plot-card">
                    <div className="udp-plot-icon"><Leaf size={20} /></div>
                    <div className="udp-plot-info">
                        <span className="udp-plot-name">{p.name} {p.area ? `(${p.area} ${p.unit})` : ''}</span>
                        <span className="udp-plot-meta">{p.cropType || 'Mix Crop'}</span>
                        {p.soil_ph && <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 700 }}>pH: {p.soil_ph}</span>}
                    </div>
                    <button className="udp-delete-btn" onClick={() => handleDeletePlot(p.id)}><Trash2 size={16} /></button>
                </div>
            ))}
        </div>
    </div>
);

export default PlotsTab;
