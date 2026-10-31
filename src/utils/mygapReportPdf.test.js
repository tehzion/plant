import translations from '../i18n/translations';
import { buildMyGapReportPdf, mygapReportFileName } from './mygapReportPdf.js';

const logs = [
    { id: '1', type: 'pesticide', activity_date: '2026-10-28', plot_id: 'Blok A', crop: 'Durian', product_used: 'Mancozeb 80WP', quantity: '2 kg', operator: 'Ahmad', notes: 'After rain' },
    { id: '2', type: 'harvest', activity_date: '2026-10-15', plot_id: 'Blok B', crop: 'Cili', notes: '120 kg' },
];

const pdfText = (doc) => doc.output();

describe('myGAP report PDF', () => {
    beforeEach(() => {
        // No logo in the test environment; the header falls back to text.
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    });
    afterEach(() => vi.unstubAllGlobals());

    it('prints translated labels, the logbook table and the declaration, with no raw keys', async () => {
        const doc = await buildMyGapReportPdf({ logs, derivedChecklist: { check1: true }, language: 'en', translations, now: new Date('2026-10-31T00:00:00Z') });
        const text = pdfText(doc);
        for (const expected of ['myGAP Compliance Report', 'Farm details', 'Completed', 'Pending', 'Mancozeb 80WP', 'Declaration', 'Signature', 'KANB']) {
            expect(text).toContain(expected);
        }
        expect(text).not.toMatch(/\((common|mygap|pdf)\.[a-zA-Z]+\)/);
    });

    it('lists the plots and crops found in the records', async () => {
        const text = pdfText(await buildMyGapReportPdf({ logs, language: 'en', translations }));
        expect(text).toContain('Blok A, Blok B');
        expect(text).toContain('Durian, Cili');
    });

    it('still produces a report with an empty logbook', async () => {
        const doc = await buildMyGapReportPdf({ logs: [], language: 'ms', translations });
        expect(doc.internal.getNumberOfPages()).toBeGreaterThanOrEqual(1);
        expect(pdfText(doc)).toContain('Pengakuan');
    });

    it('shows not-applicable items, waiting-period conflicts and scan monitoring', async () => {
        const records = [
            { id: 's', type: 'pesticide', activity_date: '2026-10-01', plot_id: 'Blok A', crop: 'Durian', product_used: 'Mancozeb', registration_no: 'LRMP R1/99', phi_days: 14, notes: 'spray' },
            { id: 'h', type: 'harvest', activity_date: '2026-10-05', plot_id: 'Blok A', crop: 'Durian', notes: 'early' },
        ];
        const scans = [{ id: 'scan-1', timestamp: '2026-09-30T08:00:00Z', disease: 'Leaf spot', category: 'Durian', healthStatus: 'unhealthy' }];
        const text = pdfText(await buildMyGapReportPdf({ logs: records, derivedChecklist: { check4: 'na' }, scans, language: 'en', translations }));
        expect(text).toContain('Not applicable');
        expect(text).toContain('R1/99');
        expect(text).toContain('Harvested before');
        expect(text).toContain('Pest monitoring');
        expect(text).toContain('Leaf spot');
    });

    it('names the file with the export date', () => {
        expect(mygapReportFileName(new Date('2026-10-31T10:00:00Z'))).toBe('myGAP-records-2026-10-31.pdf');
    });
});
