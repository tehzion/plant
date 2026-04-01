import React, { useState } from 'react';
import { useLanguage } from '../i18n/i18n.jsx';
import translations from '../i18n/translations';
import {
    ShieldCheck, Sprout, HeartHandshake, Globe, AlertTriangle, ExternalLink, RefreshCw,
    ClipboardCheck, BookOpen, Plus, Calendar, FileText, CheckCircle2, Circle, Calculator, Timer, Download
} from 'lucide-react';
import { saveLogEntry, saveChecklistState } from '../utils/localStorage';
import { useAuth } from '../context/AuthContext';
import { useFarmStats } from '../hooks/useFarmStats';
import { useLocation } from '../hooks/useLocation';
import { useNotifications } from '../context/NotificationProvider.jsx';
import { jsPDF } from 'jspdf';
import ComplianceCalendar from '../components/dashboard/ComplianceCalendar';
import { createPdfTextRenderer } from '../utils/pdfTextRenderer';
import { createPdfPageFlow, getPdfTranslation } from '../utils/pdfReportLayout';
import './MyGap.css';

const MyGapPage = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { notify } = useNotifications();
    const { getLocation } = useLocation();

    const {
        logs, setLogbook: setLogs,
        checklistState: checklist, setChecklistState: setChecklist,
        derivedChecklist,
        autoCheckedItems,
        checklistPct,
        allEvents
    } = useFarmStats({ userId: user?.id, getLocation, notify });

    const [activeTab, setActiveTab] = useState('guide'); // 'guide' | 'checklist' | 'logbook' | 'phi'
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [newLog, setNewLog] = useState({ type: 'pesticide', notes: '' });

    // PHI Calculator State
    const [phiDays, setPhiDays] = useState('');
    const [pesticideName, setPesticideName] = useState('');
    const [phiResult, setPhiResult] = useState(null);

    const handleCheckToggle = async (id) => {
        const newState = { ...checklist, [id]: !checklist[id] };
        setChecklist(newState);
        await saveChecklistState(newState, user?.id ?? null);
    };

    const handleAddLog = async (e) => {
        e.preventDefault();
        const entry = await saveLogEntry(newLog, user?.id ?? null);
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

    const completedChecklistCount = checklistItems.filter((item) => Boolean(derivedChecklist[item.id])).length;
    const checklistProgressPct = checklistItems.length > 0
        ? Math.round((completedChecklistCount / checklistItems.length) * 100)
        : 0;

    const generateReport = async () => {
        const doc = new jsPDF();
        const renderer = createPdfTextRenderer(doc);
        const reportLang = language || 'en';
        const rt = (key) => getPdfTranslation(translations, reportLang, key);

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const primaryColor = [0, 177, 79];
        const secondaryColor = [232, 245, 233];
        const darkColor = [28, 36, 52];
        const lightText = [100, 116, 139];

        const pendingLabel = rt('common.pending');
        const pageLabel = rt('common.page');
        const ofLabel = rt('common.of');
        const flow = createPdfPageFlow({
            doc,
            renderer,
            pageWidth,
            pageHeight,
            initialY: 60,
            darkColor,
        });
        const { checkPageBreak, writeParagraph } = flow;
        const writeSectionTitle = async (title, options = {}) => {
            await flow.writeSectionTitle(title, {
                fontSize: 14,
                textColor: darkColor,
                marginBottom: 6,
                ...options,
            });
        };

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 22, 12, 'F');
        doc.setFillColor(...primaryColor);
        doc.path('M 25 15 C 25 15 30 20 30 25 C 30 30 25 32 25 32 C 25 32 20 30 20 25 C 20 20 25 15 25 15');
        doc.fill();

        await renderer.drawText('KANB Agropreneur Nasional', 42, 14, {
            maxWidth: 90,
            fontSize: 18,
            fontStyle: 'bold',
            color: [255, 255, 255],
        });
        await renderer.drawText(rt('mygap.reportTitle').toUpperCase(), 42, 24, {
            maxWidth: 90,
            fontSize: 12,
            color: [255, 255, 255],
        });

        const dateStr = new Date().toLocaleDateString(reportLang === 'ms' ? 'ms-MY' : 'en-MY');
        await renderer.drawText(`${rt('pdf.reportDate') || 'Date'}: ${dateStr}`, pageWidth - 74, 18, {
            maxWidth: 60,
            fontSize: 10,
            color: [255, 255, 255],
            align: 'right',
        });

        const totalChecks = checklistItems.length;
        const completedChecks = Object.values(derivedChecklist).filter(Boolean).length;
        const complianceRate = Math.round((completedChecks / totalChecks) * 100);
        const totalLogs = logs.length;

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 50, 182, 25, 3, 3, 'FD');

        await renderer.drawText(rt('mygap.complianceProgress') || 'Compliance Progress', 22, 56, {
            maxWidth: 42,
            fontSize: 10,
            color: darkColor,
        });
        await renderer.drawText(`${complianceRate}%`, 22, 63, {
            maxWidth: 42,
            fontSize: 14,
            fontStyle: 'bold',
            color: primaryColor,
        });

        await renderer.drawText(rt('mygap.checklistTitle'), 82, 56, {
            maxWidth: 42,
            fontSize: 10,
            color: darkColor,
        });
        await renderer.drawText(`${completedChecks}/${totalChecks}`, 82, 63, {
            maxWidth: 42,
            fontSize: 14,
            fontStyle: 'bold',
            color: darkColor,
        });

        await renderer.drawText(rt('mygap.logbookTitle'), 142, 56, {
            maxWidth: 42,
            fontSize: 10,
            color: darkColor,
        });
        await renderer.drawText(`${totalLogs}`, 142, 63, {
            maxWidth: 42,
            fontSize: 14,
            fontStyle: 'bold',
            color: darkColor,
        });

        flow.yPos = 85;

        await writeSectionTitle(rt('mygap.checklistTitle'));

        const checklistData = [
            { id: 'check1', label: rt('mygap.check1') },
            { id: 'check2', label: rt('mygap.check2') },
            { id: 'check3', label: rt('mygap.check3') },
            { id: 'check4', label: rt('mygap.check4') },
            { id: 'check5', label: rt('mygap.check5') },
            { id: 'check6', label: rt('mygap.check6') },
            { id: 'check7', label: rt('mygap.check7') },
            { id: 'check8', label: rt('mygap.check8') },
        ].map((item) => ({
            label: item.label,
            complete: Boolean(derivedChecklist[item.id]),
        }));

        for (const item of checklistData) {
            const statusText = item.complete ? (rt('common.completed') || 'Completed') : pendingLabel;
            const rowHeight = Math.max(
                renderer.measureTextHeight(item.label, 112, { fontSize: 10 }),
                renderer.measureTextHeight(statusText, 30, { fontSize: 9, fontStyle: 'bold' }),
                10 * PT_TO_MM,
            ) + 8;

            checkPageBreak(rowHeight + 4);
            doc.setFillColor(...(item.complete ? [240, 253, 244] : [248, 250, 252]));
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(14, flow.yPos, pageWidth - 28, rowHeight, 3, 3, 'FD');

            await renderer.drawText(item.label, 18, flow.yPos + 4, {
                maxWidth: 112,
                fontSize: 10,
                color: darkColor,
            });

            const badgeWidth = 34;
            const badgeX = pageWidth - 14 - badgeWidth - 4;
            doc.setFillColor(...(item.complete ? primaryColor : [239, 68, 68]));
            doc.roundedRect(badgeX, flow.yPos + 4, badgeWidth, rowHeight - 8, 3, 3, 'F');
            await renderer.drawText(statusText, badgeX, flow.yPos + (rowHeight - 8 - (9 * PT_TO_MM * 1.35)) / 2 + 4, {
                maxWidth: badgeWidth,
                fontSize: 9,
                fontStyle: 'bold',
                color: [255, 255, 255],
                align: 'center',
            });

            flow.yPos += rowHeight + 4;
        }

        flow.yPos += 8;
        await writeSectionTitle(rt('mygap.logbookSummary'));

        if (logs.length === 0) {
            await writeParagraph(rt('mygap.noLogs'), {
                x: 14,
                width: pageWidth - 28,
                fontSize: 10,
                color: lightText,
                gapAfter: 6,
            });
        } else {
            for (const log of logs.slice(0, 50)) {
                const dateLabel = new Date(log.timestamp).toLocaleDateString(reportLang === 'ms' ? 'ms-MY' : reportLang === 'zh' ? 'zh-MY' : 'en-MY');
                const typeLabel = rt(`mygap.${log.type}Log`).split(' ')[0];
                const notesHeight = renderer.measureTextHeight(log.notes || '-', pageWidth - 36, { fontSize: 9 });
                const cardHeight = notesHeight + 18;

                checkPageBreak(cardHeight + 4);
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(14, flow.yPos, pageWidth - 28, cardHeight, 3, 3, 'FD');

                await renderer.drawText(typeLabel, 18, flow.yPos + 4, {
                    maxWidth: 70,
                    fontSize: 9,
                    fontStyle: 'bold',
                    color: primaryColor,
                });
                await renderer.drawText(dateLabel, pageWidth - 66, flow.yPos + 4, {
                    maxWidth: 48,
                    fontSize: 8,
                    color: lightText,
                    align: 'right',
                });
                await renderer.drawText(log.notes || '-', 18, flow.yPos + 11, {
                    maxWidth: pageWidth - 36,
                    fontSize: 9,
                    color: darkColor,
                });

                flow.yPos += cardHeight + 4;
            }
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

            await renderer.drawText(`KANB Agropreneur Nasional - ${rt('mygap.reportTitle')}`, 14, pageHeight - 12, {
                maxWidth: 110,
                fontSize: 8,
                color: lightText,
            });
            await renderer.drawText(`${pageLabel} ${i} ${ofLabel} ${pageCount}`, pageWidth - 44, pageHeight - 12, {
                maxWidth: 30,
                fontSize: 8,
                color: lightText,
                align: 'right',
            });
        }

        doc.save('myGAP_Compliance_Report.pdf');
    };

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
                    <span>{t('mygap.tabChecklist')}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'logbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('logbook')}
                >
                    <FileText size={18} />
                    <span>{t('mygap.tabLogbook')}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calendar')}
                >
                    <Calendar size={18} />
                    <span>{t('mygap.tabCalendar')}</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'phi' ? 'active' : ''}`}
                    onClick={() => setActiveTab('phi')}
                >
                    <Calculator size={18} />
                    <span>{t('mygap.tabPhi')}</span>
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

                        <div className="compliance-progress-container">
                            <div className="progress-header">
                                <span className="progress-label">{t('mygap.complianceProgress') || 'Compliance Progress'}</span>
                                <span className="progress-stats">
                                    {completedChecklistCount}/{checklistItems.length} {t('mygap.completed') || 'Completed'} - {checklistProgressPct}%
                                </span>
                            </div>
                            <div className="progress-track">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${checklistProgressPct}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="checklist-items">
                            {checklistItems.map((item) => {
                                const isCompleted = derivedChecklist[item.id];
                                const isAuto = autoCheckedItems[item.id];
                                
                                return (
                                    <div
                                        key={item.id}
                                        className={`checklist-item ${isCompleted ? 'completed' : ''} ${isAuto ? 'is-auto-derived' : ''}`}
                                        onClick={() => {
                                            if (!isAuto) handleCheckToggle(item.id);
                                        }}
                                    >
                                        <div className="check-icon">
                                            {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </div>
                                        <div className="checklist-item-content">
                                            <span>{item.label}</span>
                                            {isAuto && (
                                                <span className="synced-badge">
                                                    <RefreshCw size={10} />
                                                    {t('mygap.syncedFromRecords') || 'Completed from farm records'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="fade-in">
                    <div className="content-card">
                        <h2 className="section-title">{t('mygap.tabCalendar')}</h2>
                        <p className="section-subtitle mb-lg">{t('mygap.logbookSubtitle')}</p>
                        <ComplianceCalendar events={allEvents} />
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
                                        placeholder={t('mygap.logNotesPlaceholder')}
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
                                    <p>{t('mygap.emptyLogs')}</p>
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
                                    placeholder={t('mygap.pesticideNamePlaceholder')}
                                />
                            </div>
                            <div className="form-group">
                                <label>{t('mygap.phiDays')}</label>
                                <input
                                    type="number"
                                    required
                                    value={phiDays}
                                    onChange={(e) => setPhiDays(e.target.value)}
                                    placeholder={t('mygap.phiDaysPlaceholder')}
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

        </div>
    );
};

export default MyGapPage;
