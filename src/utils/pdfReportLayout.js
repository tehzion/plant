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
