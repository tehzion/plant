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

    const generateReport = async () => {
        const doc = new jsPDF();
        const renderer = createPdfTextRenderer(doc);
        const reportLang = language || 'en';
        const rt = (key) => {
            const keys = key.split('.');
            let value = translations[reportLang];
            for (const k of keys) {
                value = value?.[k];
            }
            return value || key;
        };

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const primaryColor = [0, 177, 79];
        const secondaryColor = [232, 245, 233];
        const darkColor = [28, 36, 52];
        const lightText = [100, 116, 139];
        let yPos = 60;

        const pendingLabel = rt('common.pending');
        const pageLabel = rt('common.page');
        const ofLabel = rt('common.of');

        const checkPageBreak = (requiredSpace = 20) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 24;
            }
        };

        const writeLines = async (lines, options = {}) => {
            const {
                x = 14,
                width = pageWidth - 28,
                fontSize = 10,
                fontStyle = 'normal',
                color = darkColor,
                gapAfter = 0,
                align = 'left',
                lineHeight = 1.35,
            } = options;

            for (const line of lines) {
                const text = line || ' ';
                const textHeight = renderer.measureTextHeight(text, width, { fontSize, fontStyle, lineHeight });
                checkPageBreak(textHeight + 2);
                await renderer.drawText(text, x, yPos, {
                    maxWidth: width,
                    fontSize,
                    fontStyle,
                    color,
                    align,
                    lineHeight,
                });
                yPos += textHeight;
            }

            yPos += gapAfter;
        };

        const writeParagraph = async (text, options = {}) => {
            const lines = renderer.getWrappedLines(text, options.width ?? pageWidth - 28, options);
            await writeLines(lines, options);
        };

        const writeSectionTitle = async (title, options = {}) => {
            const {
                fontSize = 14,
                color = darkColor,
                marginBottom = 6,
            } = options;

            const height = renderer.measureTextHeight(title, pageWidth - 28, { fontSize, fontStyle: 'bold' });
            checkPageBreak(height + marginBottom + 4);
            await renderer.drawText(title, 14, yPos, {
                maxWidth: pageWidth - 28,
                fontSize,
                fontStyle: 'bold',
                color,
            });
            yPos += height + marginBottom;
        };

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, pageWidth, 45, 'F');
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 22, 12, 'F');
        doc.setFillColor(...primaryColor);
        doc.path('M 25 15 C 25 15 30 20 30 25 C 30 30 25 32 25 32 C 25 32 20 30 20 25 C 20 20 25 15 25 15');
        doc.fill();

        await renderer.drawText('Smart Plant Advisor', 42, 14, {
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

        yPos = 85;

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
            doc.roundedRect(14, yPos, pageWidth - 28, rowHeight, 3, 3, 'FD');

            await renderer.drawText(item.label, 18, yPos + 4, {
                maxWidth: 112,
                fontSize: 10,
                color: darkColor,
            });

            const badgeWidth = 34;
            const badgeX = pageWidth - 14 - badgeWidth - 4;
            doc.setFillColor(...(item.complete ? primaryColor : [239, 68, 68]));
            doc.roundedRect(badgeX, yPos + 4, badgeWidth, rowHeight - 8, 3, 3, 'F');
            await renderer.drawText(statusText, badgeX, yPos + (rowHeight - 8 - (9 * PT_TO_MM * 1.35)) / 2 + 4, {
                maxWidth: badgeWidth,
                fontSize: 9,
                fontStyle: 'bold',
                color: [255, 255, 255],
                align: 'center',
            });

            yPos += rowHeight + 4;
        }

        yPos += 8;
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
                doc.roundedRect(14, yPos, pageWidth - 28, cardHeight, 3, 3, 'FD');

                await renderer.drawText(typeLabel, 18, yPos + 4, {
                    maxWidth: 70,
                    fontSize: 9,
                    fontStyle: 'bold',
                    color: primaryColor,
                });
                await renderer.drawText(dateLabel, pageWidth - 66, yPos + 4, {
                    maxWidth: 48,
                    fontSize: 8,
                    color: lightText,
                    align: 'right',
                });
                await renderer.drawText(log.notes || '-', 18, yPos + 11, {
                    maxWidth: pageWidth - 36,
                    fontSize: 9,
                    color: darkColor,
                });

                yPos += cardHeight + 4;
            }
        }

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

            await renderer.drawText(`Smart Plant Advisor - ${rt('mygap.reportTitle')}`, 14, pageHeight - 12, {
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
                                    {Object.values(checklist).filter(Boolean).length}/{checklistItems.length} {t('mygap.completed') || 'Completed'} - {Math.round((Object.values(checklist).filter(Boolean).length / checklistItems.length) * 100)}%
                                </span>
                            </div>
                            <div className="progress-track">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${Math.round((Object.values(checklist).filter(Boolean).length / checklistItems.length) * 100)}%` }}
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
                                        className={`checklist-item ${isCompleted ? 'completed' : ''}`}
                                        onClick={() => handleCheckToggle(item.id)}
                                    >
                                        <div className="check-icon">
                                            {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                        </div>
                                        <div className="checklist-item-content">
                                            <span>{item.label}</span>
                                            {isAuto && (
                                                <span className="synced-badge">
                                                    <RefreshCw size={10} />
                                                    {t('common.synced') || 'Synced from data'}
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
                .checklist-item-content {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .synced-badge {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.65rem;
                    color: var(--color-primary);
                    opacity: 0.8;
                    font-weight: 600;
                }
                .synced-badge svg {
                    animation: spin 3s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .compliance-progress-container {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: var(--radius-lg);
                    padding: var(--space-md) var(--space-lg);
                    margin-bottom: var(--space-xl);
                }
                .progress-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-sm);
                }
                .progress-label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--color-text-primary);
                }
                .progress-stats {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--color-primary);
                }
                .progress-track {
                    width: 100%;
                    height: 8px;
                    background-color: #e2e8f0;
                    border-radius: var(--radius-full);
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background-color: var(--color-primary);
                    border-radius: var(--radius-full);
                    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
