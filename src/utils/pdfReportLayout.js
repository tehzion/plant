export const getPdfTranslation = (translations, language, key) => {
    const keys = key.split('.');
    let value = translations?.[language];

    for (const part of keys) {
        value = value?.[part];
    }

    return value || key;
};

export const createPdfPageFlow = ({
    doc,
    renderer,
    pageWidth,
    pageHeight,
    initialY = 20,
    darkColor = [28, 36, 52],
    marginX = 14,
    pageBottomMargin = 20,
    nextPageY = 24,
}) => {
    let yPos = initialY;

    const checkPageBreak = (requiredSpace = 20) => {
        if (yPos + requiredSpace > pageHeight - pageBottomMargin) {
            doc.addPage();
            yPos = nextPageY;
        }
    };

    const writeLines = async (lines, options = {}) => {
        const {
            x = marginX,
            width = pageWidth - (marginX * 2),
            fontSize = 10,
            fontStyle = 'normal',
            color = darkColor,
            gapAfter = 0,
            lineHeight = 1.35,
            align = 'left',
        } = options;

        for (const line of lines) {
            const lineText = line || ' ';
            const blockHeight = renderer.measureTextHeight(lineText, width, {
                fontSize,
                fontStyle,
                lineHeight,
            });

            checkPageBreak(blockHeight + 2);
            await renderer.drawText(lineText, x, yPos, {
                maxWidth: width,
                fontSize,
                fontStyle,
                color,
                lineHeight,
                align,
            });
            yPos += blockHeight;
        }

        yPos += gapAfter;
    };

    const writeParagraph = async (text, options = {}) => {
        const width = options.width ?? pageWidth - (marginX * 2);
        const lines = renderer.getWrappedLines(text, width, options);
        await writeLines(lines, { ...options, width });
    };

    const writeSectionTitle = async (title, options = {}) => {
        const {
            fillColor = null,
            textColor = darkColor,
            fontSize = 12,
            x = marginX,
            width = pageWidth - (marginX * 2),
            paddingY = 3,
            marginBottom = 8,
        } = options;

        const blockHeight = renderer.measureTextHeight(title, width, {
            fontSize,
            fontStyle: 'bold',
        });

        checkPageBreak(blockHeight + marginBottom + paddingY + 4);

        if (fillColor) {
            doc.setFillColor(...fillColor);
            doc.roundedRect(x - 1, yPos - 2, width + 2, blockHeight + (paddingY * 2), 3, 3, 'F');
        }

        await renderer.drawText(title, x, yPos, {
            maxWidth: width,
            fontSize,
            fontStyle: 'bold',
            color: textColor,
        });

        yPos += blockHeight + marginBottom;
    };

    const flow = {
        checkPageBreak,
        writeLines,
        writeParagraph,
        writeSectionTitle,
    };

    Object.defineProperty(flow, 'yPos', {
        get() {
            return yPos;
        },
        set(value) {
            yPos = value;
        },
    });

    return flow;
};

// Shared KANB branding for every exported PDF: the real logo on a white
// header with a green accent rule, and a matching footer on each page.
export const BRAND = Object.freeze({
    name: 'KANB Agropreneur Nasional',
    primary: [0, 177, 79],
    primaryDark: [0, 140, 62],
    primaryLight: [232, 245, 233],
    dark: [28, 36, 52],
    muted: [100, 116, 139],
    border: [226, 232, 240],
});

const LOGO_PATH = 'assets/kanb-logo.png';
const LOGO_ASPECT = 300 / 83;
let logoPromise = null;

export const loadBrandLogo = () => {
    if (!logoPromise) {
        logoPromise = (async () => {
            try {
                const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
                const response = await fetch(`${base}${LOGO_PATH}`);
                if (!response.ok) return null;
                const blob = await response.blob();
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch {
                return null;
            }
        })().then((dataUrl) => {
            if (!dataUrl) logoPromise = null; // retry next export
            return dataUrl;
        });
    }
    return logoPromise;
};

export const HEADER_HEIGHT = 34;

export const drawBrandHeader = async ({ doc, renderer, title, subtitle = '', dateText = '', logo = null }) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, pageWidth, 3, 'F');

    const logoHeight = 15;
    if (logo) {
        try {
            doc.addImage(logo, 'PNG', 11, 8, logoHeight * LOGO_ASPECT, logoHeight);
        } catch {
            logo = null;
        }
    }
    if (!logo) {
        await renderer.drawText('KANB', 14, 10, { maxWidth: 60, fontSize: 18, fontStyle: 'bold', color: BRAND.primary });
        await renderer.drawText('AGROPRENEUR NASIONAL', 14, 18.5, { maxWidth: 60, fontSize: 8, fontStyle: 'bold', color: BRAND.dark });
    }

    const rightX = 92;
    const rightWidth = pageWidth - 14 - rightX;
    const titleHeight = await renderer.drawText(title, rightX, 10, { maxWidth: rightWidth, fontSize: 13, fontStyle: 'bold', color: BRAND.dark, align: 'right' });
    let lineY = 10 + titleHeight + 0.5;
    if (subtitle) {
        lineY += await renderer.drawText(subtitle, rightX, lineY, { maxWidth: rightWidth, fontSize: 9, color: BRAND.muted, align: 'right' });
    }
    if (dateText) {
        lineY += await renderer.drawText(dateText, rightX, lineY, { maxWidth: rightWidth, fontSize: 9, color: BRAND.muted, align: 'right' });
    }

    // The rule sits below whichever is taller: the logo or the title block.
    const ruleY = Math.max(HEADER_HEIGHT - 4, lineY + 2);
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(0.6);
    doc.line(14, ruleY, pageWidth - 14, ruleY);
    doc.setLineWidth(0.2);
    return ruleY + 8;
};

export const drawBrandFooters = async ({ doc, renderer, leftText, pageLabel = 'Page', ofLabel = 'of' }) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageCount = doc.internal.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setDrawColor(...BRAND.border);
        doc.setLineWidth(0.2);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        await renderer.drawText(leftText, 14, pageHeight - 12, { maxWidth: 130, fontSize: 8, color: BRAND.muted });
        await renderer.drawText(`${pageLabel} ${pageIndex} ${ofLabel} ${pageCount}`, pageWidth - 54, pageHeight - 12, { maxWidth: 40, fontSize: 8, color: BRAND.muted, align: 'right' });
    }
};
