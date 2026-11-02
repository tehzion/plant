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

    it('fills farm details from the profile and adds stock and worker tables', async () => {
        const records = [
            { id: 'b', type: 'purchase', activity_date: '2026-10-01', product_used: 'Mancozeb', amount: 10, unit: 'kg', supplier: 'Kedai Tani Raub', notes: 'stock' },
            { id: 's', type: 'pesticide', activity_date: '2026-10-02', plot_id: 'Blok A', crop: 'Durian', product_used: 'Mancozeb', amount: 2, unit: 'kg', notes: 'spray' },
            { id: 'h', type: 'harvest', activity_date: '2026-10-20', plot_id: 'Blok A', crop: 'Durian', amount: 120, unit: 'kg', lot_code: 'BLOKA-261020-01', buyer: 'FAMA', notes: 'harvest' },
            { id: 't', type: 'training', activity_date: '2026-10-05', topic: 'Safe spraying', operator: 'DOA officer', attendees: 'Ahmad, Siti', notes: 'course' },
        ];
        const farmProfile = { farmerName: 'Ahmad bin Ali', farmName: 'Kebun Durian Raub', mygapRef: 'MYGAP-123', certExpiry: '2027-06-30', workers: [{ id: 'w1', name: 'Siti', role: 'Sprayer', nationality: 'Malaysia' }] };
        const text = pdfText(await buildMyGapReportPdf({ logs: records, farmProfile, language: 'en', translations }));
        for (const expected of ['Ahmad bin Ali', 'Kebun Durian Raub', 'MYGAP-123', 'Input stock', 'Workers', 'Sprayer', 'BLOKA-261020-01', 'FAMA', 'Safe spraying', 'Kedai Tani Raub']) {
            expect(text).toContain(expected);
        }
        expect(text).toContain('8 kg');
    });

    it('names the file with the export date', () => {
        expect(mygapReportFileName(new Date('2026-10-31T10:00:00Z'))).toBe('myGAP-records-2026-10-31.pdf');
    });
});
