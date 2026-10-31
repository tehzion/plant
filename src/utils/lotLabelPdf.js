import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { createPdfTextRenderer } from './pdfTextRenderer';
import { BRAND, loadBrandLogo } from './pdfReportLayout';

// A 100 x 60 mm harvest lot label for crates or bags. The QR code holds plain
// text (no link), so scanning it shows the lot details without going online.
export const lotLabelText = ({ lotCode, crop, plot, date, farmName, amount }) => [
    `LOT ${lotCode}`,
    farmName && `Farm: ${farmName}`,
    plot && `Plot: ${plot}`,
    crop && `Crop: ${crop}`,
    date && `Harvest: ${date}`,
    amount && `Qty: ${amount}`,
].filter(Boolean).join('\n');

export const buildLotLabelPdf = async (lot = {}) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [60, 100] });
    const renderer = createPdfTextRenderer(doc);
    const qr = await QRCode.toDataURL(lotLabelText(lot), { margin: 0, width: 300, errorCorrectionLevel: 'M' });

    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.8);
    doc.roundedRect(2, 2, 96, 56, 3, 3, 'S');

    const logo = await loadBrandLogo();
    if (logo) {
        try { doc.addImage(logo, 'PNG', 4, 4, 30, 30 / (300 / 83)); } catch { /* text fallback below */ }
    } else {
        await renderer.drawText(BRAND.name, 5, 5, { maxWidth: 50, fontSize: 7, fontStyle: 'bold', color: BRAND.primary });
    }
    doc.addImage(qr, 'PNG', 62, 14, 32, 32);

    await renderer.drawText(lot.lotCode || '-', 5, 15, { maxWidth: 55, fontSize: 14, fontStyle: 'bold', color: BRAND.dark });
    const lines = [
        lot.farmName,
        [lot.plot, lot.crop].filter(Boolean).join(' / '),
        lot.date,
        lot.amount,
    ].filter(Boolean);
    let y = 24;
    for (const line of lines) {
        y += await renderer.drawText(line, 5, y, { maxWidth: 55, fontSize: 9, color: BRAND.dark });
    }
    return doc;
};
