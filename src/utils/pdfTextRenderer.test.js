import { createPdfTextRenderer, containsComplexPdfText } from './pdfTextRenderer.js';

const createMockCanvas = () => {
    const context = {
        font: '',
        fillStyle: '',
        textBaseline: '',
        measureText: (text) => ({ width: String(text).length * 10 }),
        scale: () => {},
        clearRect: () => {},
        fillText: () => {},
    };

    return {
        width: 0,
        height: 0,
        getContext: () => context,
        toDataURL: () => 'data:image/png;base64,mock-canvas',
    };
};

describe('pdfTextRenderer', () => {
    it('detects complex CJK text correctly', () => {
        expect(containsComplexPdfText('Powdery mildew')).toBe(false);
        expect(containsComplexPdfText('病害诊断')).toBe(true);
    });

    it('uses native jsPDF text rendering for simple latin text', async () => {
        const doc = {
            splitTextToSize: () => ['Simple text'],
            setFont: vi.fn(),
            setFontSize: vi.fn(),
            setTextColor: vi.fn(),
            text: vi.fn(),
            addImage: vi.fn(),
        };

        const renderer = createPdfTextRenderer(doc);
        await renderer.drawText('Simple text', 12, 24, { maxWidth: 60 });

        expect(doc.text).toHaveBeenCalled();
        expect(doc.addImage).not.toHaveBeenCalled();
    });

    it('falls back to image-based rendering for CJK text blocks', async () => {
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
            if (tagName === 'canvas') {
                return createMockCanvas();
            }
            return originalCreateElement(tagName);
        });

        const doc = {
            splitTextToSize: vi.fn(),
            setFont: vi.fn(),
            setFontSize: vi.fn(),
            setTextColor: vi.fn(),
            text: vi.fn(),
            addImage: vi.fn(),
        };

        const renderer = createPdfTextRenderer(doc);
        const height = await renderer.drawText('病害诊断建议', 12, 24, { maxWidth: 50, fontSize: 10 });

        expect(height).toBeGreaterThan(0);
        expect(doc.addImage).toHaveBeenCalled();
        expect(doc.text).not.toHaveBeenCalled();
    });
});
