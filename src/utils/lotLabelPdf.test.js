import { buildLotLabelPdf, lotLabelText } from './lotLabelPdf.js';

describe('lot label', () => {
    beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))));
    afterEach(() => vi.unstubAllGlobals());

    it('encodes the lot details as plain text in the QR code', () => {
        expect(lotLabelText({ lotCode: 'BLOKA-261031-01', crop: 'Durian', plot: 'Blok A', date: '31/10/2026', farmName: 'Kebun Raub', amount: '120 kg' }))
            .toBe('LOT BLOKA-261031-01\nFarm: Kebun Raub\nPlot: Blok A\nCrop: Durian\nHarvest: 31/10/2026\nQty: 120 kg');
        expect(lotLabelText({ lotCode: 'X-1' })).toBe('LOT X-1');
    });

    it('builds a one-page label with the lot code', async () => {
        const doc = await buildLotLabelPdf({ lotCode: 'BLOKA-261031-01', crop: 'Durian', plot: 'Blok A' });
        expect(doc.internal.getNumberOfPages()).toBe(1);
        expect(doc.output()).toContain('BLOKA-261031-01');
    });
});
