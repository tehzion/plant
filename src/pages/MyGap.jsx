import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import {
    ShieldCheck, Sprout, HeartHandshake, Globe, AlertTriangle, ExternalLink,
    ClipboardCheck, BookOpen, Plus, Calendar, FileText, CheckCircle2, Circle, Calculator, Timer, Download
} from 'lucide-react';
import { getLogbook, saveLogEntry, getChecklistState, saveChecklistState } from '../utils/localStorage';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const MyGapPage = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'checklist' | 'logbook' | 'phi'
    const [logs, setLogs] = useState([]);
    const [checklist, setChecklist] = useState({});
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [newLog, setNewLog] = useState({ type: 'pesticide', notes: '' });

    // PHI Calculator State
    const [phiDays, setPhiDays] = useState('');
    const [pesticideName, setPesticideName] = useState('');
    const [phiResult, setPhiResult] = useState(null);

    useEffect(() => {
        setLogs(getLogbook());
        setChecklist(getChecklistState());
    }, []);

    const handleCheckToggle = (id) => {
        const newState = { ...checklist, [id]: !checklist[id] };
        setChecklist(newState);
        saveChecklistState(newState);
    };

    const handleAddLog = (e) => {
        e.preventDefault();
        const entry = saveLogEntry(newLog);
        if (entry) {
            setLogs([entry, ...logs]);
            setIsAddingLog(false);
            setNewLog({ type: 'pesticide', notes: '' });
        }
    };

    const calculatePHI = (e) => {
        e.preventDefault();
        const days = parseInt(phiDays);
        if (isNaN(days)) return;

        const safeDate = new Date();
        safeDate.setDate(safeDate.getDate() + days);

        setPhiResult({
            date: safeDate,
            daysRemaining: days
        });
    };

    const generateReport = () => {
        const doc = new jsPDF();
        const primaryColor = [22, 163, 74]; // #16a34a (green-600)

        // --- Header ---
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(t('mygap.reportTitle'), 20, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${t('mygap.reportGenerated')}: ${new Date().toLocaleDateString()}`, 20, 35);

        let yPos = 55;

        // --- Checklist Section ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(t('mygap.checklistTitle'), 20, yPos);
        yPos += 5;

        const checklistData = checklistItems.map(item => [
            item.label,
            checklist[item.id] ? 'Compliant' : 'Pending'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Requirement', 'Status']],
            body: checklistData,
            theme: 'grid',
            headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 40, halign: 'center' }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 1) {
                    if (data.cell.raw === 'Compliant') {
                        data.cell.styles.textColor = [22, 163, 74];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.textColor = [220, 38, 38]; // red
                    }
                }
            }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // --- Logbook Section ---
        doc.text(t('mygap.logbookSummary'), 20, yPos);
        yPos += 5;

        const logData = logs.length > 0 ? logs.slice(0, 50).map(log => [
            new Date(log.timestamp).toLocaleDateString(),
            t(`mygap.${log.type}Log`).split(' ')[0], // Get first word (e.g., Pesticide)
            log.notes
        ]) : [[ '-', '-', t('mygap.noLogs') ]];

        doc.autoTable({
            startY: yPos,
            head: [['Date', 'Type', 'Notes']],
            body: logData,
            theme: 'striped',
            headStyles: { fillColor: primaryColor, textColor: 255 },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 30 },
                2: { cellWidth: 'auto' }
            }
        });

        // --- Footer ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Page ${i} of ${pageCount} - Generated by Smart Plant Advisor`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        doc.save('myGAP_Compliance_Report.pdf');
    };

    const pillars = [
        { icon: <ShieldCheck size={28} className="pillar-icon" />, title: t('mygap.pillar1'), description: t('mygap.pillar1Desc') },
        { icon: <Sprout size={28} className="pillar-icon" />, title: t('mygap.pillar2'), description: t('mygap.pillar2Desc') },
        { icon: <Globe size={28} className="pillar-icon" />, title: t('mygap.pillar3'), description: t('mygap.pillar3Desc') },
        { icon: <HeartHandshake size={28} className="pillar-icon" />, title: t('mygap.pillar4'), description: t('mygap.pillar4Desc') },
    ];

    const checklistItems = [
        { id: 'check1', label: t('mygap.check1') },
        { id: 'check2', label: t('mygap.check2') },
        { id: 'check3', label: t('mygap.check3') },
        { id: 'check4', label: t('mygap.check4') },
        { id: 'check5', label: t('mygap.check5') },
        { id: 'check6', label: t('mygap.check6') },
        { id: 'check7', label: t('mygap.check7') },
        { id: 'check8', label: t('mygap.check8') },
    ];

    return (
        <div className="mygap-page-container">
            <div className="page-header">
                <h1 className="page-title">{t('mygap.title')}</h1>
                <p className="page-subtitle">{t('mygap.subtitle')}</p>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
                    onClick={() => setActiveTab('guide')}
                >
                    <BookOpen size={18} />
                    <span>{t('nav.about')}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                    onClick={() => setActiveTab('checklist')}
                >
                    <ClipboardCheck size={18} />
                    <span>Checklist</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'logbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logbook')}
                >
                    <FileText size={18} />
                    <span>Logbook</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'phi' ? 'active' : ''}`}
                    onClick={() => setActiveTab('phi')}
                >
                    <Calculator size={18} />
                    <span>PHI</span>
                </button>
            </div>

            {activeTab === 'guide' && (
                <div className="fade-in">
                    <div className="disclaimer-card">
                        <AlertTriangle size={20} className="disclaimer-icon" />
                        <p>{t('mygap.disclaimer')}</p>
                    </div>

                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.whatIsMyGap')}</h2>
                        <p className="section-content">{t('mygap.whatIsMyGapContent')}</p>
                    </div>

                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.keyPillars')}</h2>
                        <div className="pillars-grid">
                            {pillars.map((pillar, index) => (
                                <div key={index} className="pillar-card">
                                    <div className="pillar-icon-wrapper">{pillar.icon}</div>
                                    <h3 className="pillar-title">{pillar.title}</h3>
                                    <p className="pillar-description">{pillar.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="button-group">
                        <a href="http://mygap.doa.gov.my/" target="_blank" rel="noopener noreferrer" className="official-link-button">
                            {t('mygap.officialLink')}
                            <ExternalLink size={16} />
                        </a>
                        <button onClick={generateReport} className="report-button">
                            {t('mygap.generateReport')}
                            <Download size={16} />
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'checklist' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.checklistTitle')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.checklistSubtitle')}</p>

                        <div className="checklist-items">
                            {checklistItems.map((item) => (
                                <div
                                    key={item.id}
                                    className={`checklist-item ${checklist[item.id] ? 'completed' : ''}`}
                                    onClick={() => handleCheckToggle(item.id)}
                                >
                                    <div className="check-icon">
                                        {checklist[item.id] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                    </div>
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'logbook' && (
                <div className="fade-in">
                    <div className="content-card">
                        <div className="section-header-row">
                            <h2 className="section-title">{t('mygap.logbookTitle')}</h2>
                            <button
                                className="add-log-btn"
                                onClick={() => setIsAddingLog(!isAddingLog)}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="section-subtitle mb-lg">{t('mygap.logbookSubtitle')}</p>

                        {isAddingLog && (
                            <form className="add-log-form slide-down" onSubmit={handleAddLog}>
                                <div className="form-group">
                                    <label>{t('mygap.logType')}</label>
                                    <select
                                        value={newLog.type}
                                        onChange={(e) => setNewLog({ ...newLog, type: e.target.value })}
                                    >
                                        <option value="pesticide">{t('mygap.pesticideLog')}</option>
                                        <option value="fertilizer">{t('mygap.fertilizerLog')}</option>
                                        <option value="harvest">{t('mygap.harvestLog')}</option>
                                        <option value="irrigation">{t('mygap.irrigationLog')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('mygap.logNotes')}</label>
                                    <textarea
                                        required
                                        value={newLog.notes}
                                        onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                                        placeholder="Enter details..."
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddingLog(false)}>
                                        {t('common.cancel')}
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {t('common.save')}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="logs-list">
                            {logs.length === 0 ? (
                                <div className="empty-logs">
                                    <Calendar size={48} />
                                    <p>No records found. Start your first log!</p>
                                </div>
                            ) : (
                                logs.map((log) => (
                                    <div key={log.id} className="log-card">
                                        <div className="log-header">
                                            <span className={`log-badge ${log.type}`}>
                                                {t(`mygap.${log.type}Log`).split(' ')[0]}
                                            </span>
                                            <span className="log-date">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="log-notes">{log.notes}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'phi' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.phiTitle')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.phiDesc')}</p>

                        <form className="phi-form" onSubmit={calculatePHI}>
                            <div className="form-group">
                                <label>{t('mygap.pesticideName')}</label>
                                <input
                                    type="text"
                                    value={pesticideName}
                                    onChange={(e) => setPesticideName(e.target.value)}
                                    placeholder="e.g. Abamectin"
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('mygap.phiDays')}</label>
                                <input
                                    type="number"
                                    required
                                    value={phiDays}
                                    onChange={(e) => setPhiDays(e.target.value)}
                                    placeholder="e.g. 14"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full">
                                {t('mygap.calcSafeDate')}
                            </button>
                        </form>

                        {phiResult && (
                            <div className="phi-result-card slide-down">
                                <div className="result-header">
                                    <Timer size={24} className="result-icon" />
                                    <div>
                                        <span className="result-label">{t('mygap.safeHarvestDate')}</span>
                                        <h3 className="result-date">{phiResult.date.toLocaleDateString()}</h3>
                                    </div>
                                </div>
                                <div className="result-badge danger">
                                    {t('mygap.daysRemaining')} {phiResult.daysRemaining}
                                </div>
                                <p className="result-warning">
                                    <AlertTriangle size={16} />
                                    {t('mygap.notSafeToHarvest')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .mygap-page-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: var(--space-lg) var(--space-md);
                    padding-bottom: 100px;
                }
                .page-header {
                    text-align: center;
                    margin-bottom: var(--space-lg);
                }
                .page-title {
                    font-size: var(--font-size-3xl);
                    font-weight: 700;
                    color: var(--color-primary-dark);
                }
                .page-subtitle {
                    font-size: var(--font-size-md);
                    color: var(--color-text-secondary);
                    margin-top: var(--space-xs);
                }

                .tabs-container {
                    display: flex;
                    gap: var(--space-xs);
                    background: #f3f4f6;
                    padding: 4px;
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-lg);
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .tabs-container::-webkit-scrollbar { display: none; }

                .tab-btn {
                    flex: 1;
                    min-width: 80px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    padding: 8px;
                    border: none;
                    background: transparent;
                    color: var(--color-text-secondary);
                    font-weight: 600;
                    font-size: 0.75rem;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn.active {
                    background: white;
                    color: var(--color-primary);
                    box-shadow: var(--shadow-sm);
                }

                .disclaimer-card {
                    display: flex;
                    align-items: flex-start;
                    gap: var(--space-md);
                    background-color: #FFFBEB;
                    color: #B45309;
                    padding: var(--space-lg);
                    border-radius: var(--radius-lg);
                    border: 1px solid #FDE68A;
                    margin-bottom: var(--space-xl);
                }
                .disclaimer-icon {
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .content-card {
                    background: #fff;
                    padding: var(--space-xl);
                    border-radius: var(--radius-lg);
                    margin-bottom: var(--space-xl);
                    box-shadow: var(--shadow-md);
                }
                .section-title {
                    font-size: var(--font-size-xl);
                    font-weight: 600;
                    color: var(--color-primary-dark);
                    margin-bottom: var(--space-xs);
                }
                .section-header-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .section-content {
                    line-height: 1.6;
                    color: var(--color-text-secondary);
                }
                .mb-lg { margin-bottom: var(--space-lg); }

                /* Checklist Styles */
                .checklist-items {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .checklist-item {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    padding: var(--space-md);
                    background: #f9fafb;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .checklist-item.completed {
                    background: #f0fdf4;
                    color: #166534;
                }
                .check-icon {
                    color: #9ca3af;
                    flex-shrink: 0;
                }
                .completed .check-icon {
                    color: var(--color-primary);
                }

                /* Logbook Styles */
                .add-log-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .add-log-btn:active { transform: scale(0.9); }

                .add-log-form {
                    background: #f9fafb;
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-xl);
                    border: 1px solid var(--color-border-light);
                }
                .form-group {
                    margin-bottom: var(--space-md);
                }
                .form-group label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 600;
                    margin-bottom: 4px;
                    color: var(--color-text-primary);
                }
                .form-group select, .form-group textarea, .form-group input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-md);
                    font-family: inherit;
                    font-size: 0.95rem;
                }
                .form-actions {
                    display: flex;
                    gap: var(--space-sm);
                    justify-content: flex-end;
                }

                .logs-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                }
                .log-card {
                    padding: var(--space-md);
                    border: 1px solid var(--color-border-light);
                    border-radius: var(--radius-md);
                }
                .log-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .log-badge {
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .log-badge.pesticide { background: #fee2e2; color: #b91c1c; }
                .log-badge.fertilizer { background: #dcfce7; color: #15803d; }
                .log-badge.harvest { background: #fef9c3; color: #a16207; }
                .log-badge.irrigation { background: #dbeafe; color: #1d4ed8; }
                .log-date { font-size: 0.75rem; color: #9ca3af; }
                .log-notes { font-size: 0.9rem; color: var(--color-text-secondary); }

                /* PHI Styles */
                .phi-result-card {
                    margin-top: var(--space-xl);
                    padding: var(--space-lg);
                    background: #f9fafb;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-border-light);
                }
                .result-header {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                    margin-bottom: var(--space-md);
                }
                .result-icon { color: var(--color-primary); }
                .result-label { font-size: 0.8rem; color: var(--color-text-secondary); }
                .result-date { font-size: 1.5rem; font-weight: 700; color: var(--color-primary-dark); }
                .result-badge {
                    display: inline-block;
                    padding: 4px 12px;
                    border-radius: var(--radius-full);
                    font-weight: 700;
                    font-size: 0.85rem;
                    margin-bottom: var(--space-md);
                }
                .result-badge.danger { background: #fee2e2; color: #b91c1c; }
                .result-warning {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.85rem;
                    color: #b91c1c;
                    font-weight: 600;
                }
                .w-full { width: 100%; }

                .empty-logs {
                    text-align: center;
                    padding: var(--space-2xl) 0;
                    color: #9ca3af;
                }

                /* Pillars and Guide Styles */
                .pillars-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: var(--space-lg);
                }
                .pillar-card {
                    background-color: var(--color-bg-light);
                    padding: var(--space-lg);
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                .pillar-icon-wrapper {
                    display: inline-flex;
                    padding: var(--space-md);
                    background-color: var(--color-primary-light);
                    color: var(--color-primary);
                    border-radius: 50%;
                    margin-bottom: var(--space-md);
                }
                .pillar-title {
                    font-size: var(--font-size-lg);
                    font-weight: 600;
                    margin-bottom: var(--space-xs);
                }
                .pillar-description {
                    font-size: var(--font-size-sm);
                    color: var(--color-text-secondary);
                    line-height: 1.5;
                }
                .official-link-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-sm);
                    padding: var(--space-sm) var(--space-xl);
                    background-color: var(--color-primary);
                    color: white;
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                    border-radius: var(--radius-full);
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .official-link-button:hover {
                    background-color: var(--color-primary-dark);
                }
                .report-button {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-sm);
                    padding: var(--space-sm) var(--space-xl);
                    background-color: white;
                    color: var(--color-primary);
                    border: 1px solid var(--color-primary);
                    font-weight: 600;
                    font-size: var(--font-size-sm);
                    border-radius: var(--radius-full);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .report-button:hover {
                    background-color: var(--color-bg-light);
                }
                .button-group {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: var(--space-md);
                    margin-top: var(--space-xl);
                }

                .fade-in { animation: fadeIn 0.3s ease; }
                .slide-down { animation: slideDown 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default MyGapPage;
