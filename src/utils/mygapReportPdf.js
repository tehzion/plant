import { jsPDF } from 'jspdf';
import { createPdfTextRenderer } from './pdfTextRenderer';
import { BRAND, createPdfPageFlow, drawBrandFooters, drawBrandHeader, getPdfTranslation, loadBrandLogo } from './pdfReportLayout';
import { checklistCompletion, computeInputStock, findPhiConflicts, logActivityDate, MYGAP_CHECKLIST_IDS, NOT_APPLICABLE, parseLocalDate, safeHarvestDateFor } from '../../shared/mygapCompliance.js';
import { isHealthy } from './statusUtils';

export { MYGAP_CHECKLIST_IDS };

const PENDING_FILL = [255, 247, 237];
const PENDING_TEXT = [180, 83, 9];
const ROW_FILL = [248, 250, 252];

const dateLocaleFor = (language) => (language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-MY' : 'en-MY');

const logDate = (log) => logActivityDate(log);

const parseScanDate = (scan) => {
    const date = new Date(scan.timestamp || scan.created_at || '');
    return Number.isNaN(date.getTime()) ? null : date;
};

const uniqueValues = (logs, field) => [...new Set(logs.map((log) => String(log[field] || '').trim()).filter(Boolean))];

export const mygapReportFileName = (now = new Date()) => `myGAP-records-${now.toISOString().slice(0, 10)}.pdf`;

/**
 * Builds the myGAP record report: farm summary, checklist status, the full
 * activity logbook as a table, and a signed declaration block for audits.
 */
export const buildMyGapReportPdf = async ({ logs = [], derivedChecklist = {}, scans = [], farmProfile = {}, language = 'en', translations = {}, now = new Date() } = {}) => {
    const doc = new jsPDF();
    const renderer = createPdfTextRenderer(doc);
    const rt = (key, fallback = key) => {
        const value = getPdfTranslation(translations, language, key);
        return value && value !== key ? value : fallback;
    };
    const locale = dateLocaleFor(language);
    const formatDate = (date) => (date ? date.toLocaleDateString(locale) : '-');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - 28;
    const reportTitle = rt('mygap.reportTitle', 'myGAP Compliance Report');

    const sortedLogs = [...logs].sort((a, b) => (logDate(b)?.getTime() || 0) - (logDate(a)?.getTime() || 0));
    const datedLogs = sortedLogs.map(logDate).filter(Boolean);
    const periodText = datedLogs.length
        ? `${formatDate(datedLogs[datedLogs.length - 1])} – ${formatDate(datedLogs[0])}`
        : '-';

    const startY = await drawBrandHeader({
        doc,
        renderer,
        title: reportTitle,
        subtitle: rt('mygap.reportSubtitle', 'Farm record summary – not an official myGAP certificate'),
        dateText: `${rt('pdf.reportDate', 'Report date')}: ${formatDate(now)}`,
        logo: await loadBrandLogo(),
    });

    const flow = createPdfPageFlow({ doc, renderer, pageWidth, pageHeight, initialY: startY, darkColor: BRAND.dark });
    const sectionTitle = async (title, minimumFollowingSpace = 24) => {
        // Keep a heading on the same page as at least its first row.
        flow.checkPageBreak(minimumFollowingSpace + 12);
        await flow.writeSectionTitle(title, { fontSize: 12, textColor: BRAND.primaryDark, marginBottom: 4 });
    };

    // Farm details from the farm profile and the records; anything missing is
    // left as a line to complete by hand.
    const tenureLabels = { owned: ['mygap.landOwned', 'Own land'], leased: ['mygap.landLeased', 'Leased'], tol: ['mygap.landTol', 'Temporary occupation licence (TOL)'], other: ['mygap.landOther', 'Other'] };
    const tenure = tenureLabels[farmProfile.landTenure];
    const detailRows = [
        [rt('mygap.farmerName', 'Farmer name'), farmProfile.farmerName || ''],
        [rt('mygap.farmName', 'Farm name'), farmProfile.farmName || ''],
        [rt('mygap.farmAddress', 'Farm address'), farmProfile.farmAddress || ''],
        ...(tenure ? [[rt('mygap.landTenure', 'Land status'), rt(tenure[0], tenure[1])]] : []),
        [rt('mygap.registrationNo', 'myGAP reference no.'), farmProfile.mygapRef || ''],
        ...(farmProfile.certExpiry ? [[rt('mygap.certExpiry', 'myGAP certificate expiry'), formatDate(parseLocalDate(farmProfile.certExpiry))]] : []),
        [rt('mygap.plots', 'Farm / plots'), uniqueValues(sortedLogs, 'plot_id').join(', ')],
        [rt('mygap.crops', 'Crops'), uniqueValues(sortedLogs, 'crop').join(', ')],
        [rt('mygap.reportPeriod', 'Records period'), periodText],
    ];
    await sectionTitle(rt('mygap.farmDetails', 'Farm details'), 40);
    const labelWidth = 48;
    for (const [rowLabel, value] of detailRows) {
        const valueHeight = value ? renderer.measureTextHeight(value, contentWidth - labelWidth - 6, { fontSize: 9.5 }) : 5;
        const rowHeight = Math.max(valueHeight, 5) + 3;
        flow.checkPageBreak(rowHeight);
        await renderer.drawText(rowLabel, 14, flow.yPos, { maxWidth: labelWidth - 2, fontSize: 9.5, fontStyle: 'bold', color: BRAND.muted });
        if (value) {
            await renderer.drawText(value, 14 + labelWidth, flow.yPos, { maxWidth: contentWidth - labelWidth - 6, fontSize: 9.5, color: BRAND.dark });
        } else {
            doc.setDrawColor(...BRAND.border);
            doc.line(14 + labelWidth, flow.yPos + 4.5, pageWidth - 14, flow.yPos + 4.5);
        }
        flow.yPos += rowHeight;
    }
    flow.yPos += 4;

    // Summary tiles.
    const summary = checklistCompletion(derivedChecklist);
    const completedChecks = summary.completed;
    const complianceRate = summary.percent;
    const pesticideCount = sortedLogs.filter((log) => log.type === 'pesticide').length;
    const tiles = [
        [rt('mygap.complianceProgress', 'Compliance progress'), `${complianceRate}%`, BRAND.primary],
        [rt('mygap.checklistTitle', 'Checklist'), `${completedChecks}/${summary.applicable}`, BRAND.dark],
        [rt('mygap.logbookTitle', 'Activity logbook'), String(sortedLogs.length), BRAND.dark],
        [rt('mygap.pesticideApplications', 'Pesticide applications'), String(pesticideCount), BRAND.dark],
    ];
    const tileGap = 4;
    const tileWidth = (contentWidth - (tileGap * (tiles.length - 1))) / tiles.length;
    const tileHeight = 22;
    flow.checkPageBreak(tileHeight + 6);
    for (const [index, [tileLabel, value, color]] of tiles.entries()) {
        const x = 14 + index * (tileWidth + tileGap);
        doc.setFillColor(...ROW_FILL);
        doc.setDrawColor(...BRAND.border);
        doc.roundedRect(x, flow.yPos, tileWidth, tileHeight, 2, 2, 'FD');
        await renderer.drawText(tileLabel, x + 3, flow.yPos + 3, { maxWidth: tileWidth - 6, fontSize: 8, color: BRAND.muted, lineHeight: 1.2 });
        await renderer.drawText(value, x + 3, flow.yPos + 12.5, { maxWidth: tileWidth - 6, fontSize: 14, fontStyle: 'bold', color });
    }
    flow.yPos += tileHeight + 8;

    // Checklist.
    await sectionTitle(rt('mygap.checklistTitle', 'Compliance checklist'));
    const completedLabel = rt('mygap.completed', 'Completed');
    const pendingLabel = rt('common.pending', 'Pending');
    const naLabel = rt('mygap.naLabel', 'Not applicable');
    const badgeWidth = 30;
    for (const id of MYGAP_CHECKLIST_IDS) {
        const notApplicable = derivedChecklist[id] === NOT_APPLICABLE;
        const complete = derivedChecklist[id] === true;
        const itemLabel = rt(`mygap.${id}`, id);
        const textWidth = contentWidth - badgeWidth - 12;
        const rowHeight = Math.max(renderer.measureTextHeight(itemLabel, textWidth, { fontSize: 9.5 }), 5) + 6;
        flow.checkPageBreak(rowHeight + 2);
        doc.setFillColor(...(complete ? BRAND.primaryLight : ROW_FILL));
        const badge = notApplicable
            ? { fill: [241, 245, 249], border: BRAND.border, text: BRAND.muted, label: naLabel }
            : complete
                ? { fill: BRAND.primary, border: BRAND.primary, text: [255, 255, 255], label: completedLabel }
                : { fill: PENDING_FILL, border: PENDING_TEXT, text: PENDING_TEXT, label: pendingLabel };
        doc.setDrawColor(...BRAND.border);
        doc.roundedRect(14, flow.yPos, contentWidth, rowHeight, 2, 2, 'FD');
        await renderer.drawText(itemLabel, 18, flow.yPos + 3, { maxWidth: textWidth, fontSize: 9.5, color: BRAND.dark });
        const badgeX = pageWidth - 14 - badgeWidth - 3;
        const badgeHeight = 6;
        const badgeY = flow.yPos + (rowHeight - badgeHeight) / 2;
        doc.setFillColor(...badge.fill);
        doc.setDrawColor(...badge.border);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, 'FD');
        await renderer.drawText(badge.label, badgeX, badgeY + 1.2, {
            maxWidth: badgeWidth, fontSize: 8, fontStyle: 'bold', color: badge.text, align: 'center', lineHeight: 1.1,
        });
        flow.yPos += rowHeight + 2;
    }
    flow.yPos += 6;

    // Logbook table.
    const columns = [
        { key: 'date', label: rt('mygap.colDate', 'Date'), width: 20 },
        { key: 'activity', label: rt('mygap.colActivity', 'Activity'), width: 20 },
        { key: 'plot', label: rt('mygap.colPlotCrop', 'Plot / crop'), width: 28 },
        { key: 'product', label: rt('mygap.colProduct', 'Product & quantity'), width: 42 },
        { key: 'safe', label: rt('mygap.colSafeHarvest', 'Safe harvest'), width: 20 },
        { key: 'operator', label: rt('mygap.colOperator', 'Done by'), width: 20 },
        { key: 'notes', label: rt('mygap.colNotes', 'Notes'), width: contentWidth - 150 },
    ];
    const conflicts = new Map(findPhiConflicts(sortedLogs).map((conflict) => [conflict.harvestId, conflict]));
    const fieldLine = (key, fallback, value) => (value ? `${rt(key, fallback)}: ${value}` : '');
    const cellPadding = 1.8;
    const drawTableHeader = async () => {
        const headerHeight = Math.max(...columns.map((column) => renderer.measureTextHeight(column.label, column.width - cellPadding * 2, { fontSize: 8, fontStyle: 'bold', lineHeight: 1.2 }))) + cellPadding * 2;
        doc.setFillColor(...BRAND.primary);
        doc.rect(14, flow.yPos, contentWidth, headerHeight, 'F');
        let x = 14;
        for (const column of columns) {
            await renderer.drawText(column.label, x + cellPadding, flow.yPos + cellPadding, { maxWidth: column.width - cellPadding * 2, fontSize: 8, fontStyle: 'bold', color: [255, 255, 255], lineHeight: 1.2 });
            x += column.width;
        }
        flow.yPos += headerHeight;
    };

    await sectionTitle(rt('mygap.logbookSummary', 'Activity logbook'), 30);
    if (sortedLogs.length === 0) {
        await flow.writeParagraph(rt('mygap.noLogs', 'No activity records yet.'), { fontSize: 9.5, color: BRAND.muted, gapAfter: 6 });
    } else {
        await drawTableHeader();
        for (const [index, log] of sortedLogs.entries()) {
            const cells = {
                date: formatDate(logDate(log)),
                activity: rt(`mygap.${log.type}Log`, log.type || '-'),
                plot: [log.plot_id, log.crop].filter(Boolean).join(' / ') || '-',
                product: [
                    [log.product_used, log.quantity].filter(Boolean).join(' – '),
                    fieldLine('mygap.topic', 'Training topic', log.topic),
                    log.amount != null && log.amount !== '' ? `${log.amount} ${log.unit || ''}`.trim() : '',
                    fieldLine('mygap.lotCode', 'Lot code', log.lot_code),
                    fieldLine('mygap.activeIngredient', 'Active ingredient', log.active_ingredient),
                    fieldLine('mygap.lrmpNo', 'LRMP no.', log.registration_no),
                    fieldLine('mygap.areaTreated', 'Area treated', log.area_treated),
                    fieldLine('mygap.supplier', 'Supplier', log.supplier),
                    fieldLine('mygap.buyer', 'Buyer', log.buyer),
                    fieldLine('mygap.price', 'Price (RM)', log.price),
                ].filter(Boolean).join('\n') || '-',
                safe: formatDate(safeHarvestDateFor(log)),
                operator: log.operator || '-',
                notes: [
                    fieldLine('mygap.targetPest', 'Pest or disease treated', log.target_pest),
                    fieldLine('mygap.attendees', 'Who attended', log.attendees),
                    log.notes,
                    conflicts.has(log.id) ? rt('mygap.phiConflict', 'Harvested before the waiting period ended (safe from {date}).').replace('{date}', formatDate(conflicts.get(log.id).safeFrom)) : '',
                    log.updated_at ? `(${rt('mygap.edited', 'Edited')})` : '',
                ].filter(Boolean).join('\n') || '-',
            };
            const rowHeight = Math.max(...columns.map((column) => renderer.measureTextHeight(cells[column.key], column.width - cellPadding * 2, { fontSize: 8, lineHeight: 1.25 }))) + cellPadding * 2;
            if (flow.yPos + rowHeight > pageHeight - 22) {
                doc.addPage();
                flow.yPos = 20;
                await drawTableHeader();
            }
            if (index % 2 === 1) {
                doc.setFillColor(...ROW_FILL);
                doc.rect(14, flow.yPos, contentWidth, rowHeight, 'F');
            }
            let x = 14;
            for (const column of columns) {
                await renderer.drawText(cells[column.key], x + cellPadding, flow.yPos + cellPadding, {
                    maxWidth: column.width - cellPadding * 2,
                    fontSize: 8,
                    lineHeight: 1.25,
                    color: column.key === 'activity' ? BRAND.primaryDark : BRAND.dark,
                    fontStyle: column.key === 'activity' ? 'bold' : 'normal',
                });
                x += column.width;
            }
            doc.setDrawColor(...BRAND.border);
            doc.line(14, flow.yPos + rowHeight, pageWidth - 14, flow.yPos + rowHeight);
            flow.yPos += rowHeight;
        }
        flow.yPos += 8;
    }

    // Simple tables for monitoring, workers and stock, with the header
    // repeated when a table continues on a new page.
    const drawTable = async (title, tableColumns, rows) => {
        if (!rows.length) return;
        await sectionTitle(title, 26);
        const drawHeader = async () => {
            doc.setFillColor(...BRAND.primary);
            doc.rect(14, flow.yPos, contentWidth, 7, 'F');
            let x = 14;
            for (const column of tableColumns) {
                await renderer.drawText(column.label, x + cellPadding, flow.yPos + 1.6, { maxWidth: column.width - cellPadding * 2, fontSize: 8, fontStyle: 'bold', color: [255, 255, 255], lineHeight: 1.2 });
                x += column.width;
            }
            flow.yPos += 7;
        };
        await drawHeader();
        for (const cells of rows) {
            const rowHeight = Math.max(...tableColumns.map((column) => renderer.measureTextHeight(cells[column.key] || '-', column.width - cellPadding * 2, { fontSize: 8, lineHeight: 1.25 }))) + cellPadding * 2;
            if (flow.yPos + rowHeight > pageHeight - 22) {
                doc.addPage();
                flow.yPos = 20;
                await drawHeader();
            }
            let x = 14;
            for (const column of tableColumns) {
                await renderer.drawText(cells[column.key] || '-', x + cellPadding, flow.yPos + cellPadding, { maxWidth: column.width - cellPadding * 2, fontSize: 8, lineHeight: 1.25, color: BRAND.dark });
                x += column.width;
            }
            doc.setDrawColor(...BRAND.border);
            doc.line(14, flow.yPos + rowHeight, pageWidth - 14, flow.yPos + rowHeight);
            flow.yPos += rowHeight;
        }
        flow.yPos += 8;
    };

    // Pest monitoring: plant scans double as monitoring records (myGAP 4-4).
    const monitoring = [...scans]
        .map((scan) => ({ scan, date: parseScanDate(scan) }))
        .filter(({ date }) => date)
        .sort((a, b) => b.date - a.date)
        .slice(0, 40);
    await drawTable(rt('mygap.monitoringTitle', 'Pest monitoring (from plant scans)'), [
        { key: 'date', label: rt('mygap.colDate', 'Date'), width: 24 },
        { key: 'crop', label: rt('mygap.colPlotCrop', 'Plot / crop'), width: 46 },
        { key: 'finding', label: rt('mygap.colFinding', 'Finding'), width: contentWidth - 70 },
    ], monitoring.map(({ scan, date }) => ({
        date: formatDate(date),
        crop: [scan.plotId || scan.plot_id, scan.category || scan.plantType].filter(Boolean).join(' / '),
        finding: isHealthy(scan) ? rt('mygap.healthyFinding', 'No disease found') : [scan.disease, scan.severity].filter(Boolean).join(' – '),
    })));

    // Input stock (purchases minus applications).
    const formatAmount = (value) => Number(value).toLocaleString(locale, { maximumFractionDigits: 3 });
    await drawTable(rt('mygap.stockTitle', 'Input stock'), [
        { key: 'product', label: rt('assessment.mygap.productUsed', 'Product'), width: contentWidth - 102 },
        { key: 'purchased', label: rt('mygap.colPurchased', 'Bought'), width: 34 },
        { key: 'used', label: rt('mygap.colUsed', 'Used'), width: 34 },
        { key: 'balance', label: rt('mygap.colBalance', 'Balance'), width: 34 },
    ], computeInputStock(sortedLogs).map((item) => ({
        product: item.product,
        purchased: `${formatAmount(item.purchased)} ${item.unit}`,
        used: `${formatAmount(item.used)} ${item.unit}`,
        balance: `${formatAmount(item.balance)} ${item.unit}`,
    })));

    // Workers (myGAP 4-9); training sessions are in the logbook above.
    await drawTable(rt('mygap.workersTitle', 'Workers'), [
        { key: 'name', label: rt('mygap.workerName', 'Name'), width: 56 },
        { key: 'idNumber', label: rt('mygap.workerId', 'IC / passport no.'), width: 44 },
        { key: 'nationality', label: rt('mygap.nationality', 'Nationality'), width: 36 },
        { key: 'role', label: rt('mygap.role', 'Role'), width: contentWidth - 136 },
    ], (farmProfile.workers || []).map((worker) => ({ ...worker })));

    // Declaration and signature, kept together on one page.
    const declarationText = rt('mygap.declarationText', 'I confirm that the records in this report are accurate and complete to the best of my knowledge.');
    const declarationHeight = renderer.measureTextHeight(declarationText, contentWidth, { fontSize: 9.5 }) + 34;
    flow.checkPageBreak(declarationHeight + 16);
    await flow.writeSectionTitle(rt('mygap.declarationTitle', 'Declaration'), { fontSize: 12, textColor: BRAND.primaryDark, marginBottom: 4 });
    await flow.writeParagraph(declarationText, { fontSize: 9.5, color: BRAND.dark, gapAfter: 14 });
    const signatureWidth = (contentWidth - 10) / 2;
    for (const [index, signatureLabel] of [rt('mygap.signature', 'Signature'), rt('mygap.signedDate', 'Date')].entries()) {
        const x = 14 + index * (signatureWidth + 10);
        doc.setDrawColor(...BRAND.dark);
        doc.line(x, flow.yPos, x + signatureWidth, flow.yPos);
        await renderer.drawText(signatureLabel, x, flow.yPos + 1.5, { maxWidth: signatureWidth, fontSize: 8.5, color: BRAND.muted });
    }
    flow.yPos += 10;

    await drawBrandFooters({
        doc,
        renderer,
        leftText: `${BRAND.name} · ${reportTitle}`,
        pageLabel: rt('common.page', 'Page'),
        ofLabel: rt('common.of', 'of'),
    });

    return doc;
};
