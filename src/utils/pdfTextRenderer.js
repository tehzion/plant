const CJK_REGEX = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
const MM_TO_PX = 96 / 25.4;
const PT_TO_MM = 25.4 / 72;
const PT_TO_PX = 96 / 72;
const DEFAULT_FONT_STACK = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans GB", "SimHei", "Malgun Gothic", "Meiryo", "Arial Unicode MS", sans-serif';

const getCanvasContext = () => {
    const canvas = document.createElement('canvas');
    return canvas.getContext('2d');
};

const toRgb = (color) => {
    if (Array.isArray(color)) {
        return color;
    }
    return [0, 0, 0];
};

export const containsComplexPdfText = (value = '') => CJK_REGEX.test(String(value));

export const normalizePdfText = (value) => String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u2022/g, '-')
    .replace(/\t/g, '    ');

const buildCjkLines = (context, text, maxWidthPx) => {
    const lines = [];
    const rawLines = normalizePdfText(text).split('\n');

    rawLines.forEach((rawLine) => {
        if (!rawLine) {
            lines.push('');
            return;
        }

        let currentLine = '';
        for (const character of rawLine) {
            const nextLine = `${currentLine}${character}`;
            if (currentLine && context.measureText(nextLine).width > maxWidthPx) {
                lines.push(currentLine);
                currentLine = character;
            } else {
                currentLine = nextLine;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }
    });

    return lines.length > 0 ? lines : [''];
};

export const createPdfTextRenderer = (doc) => {
    const getWrappedLines = (text, maxWidth, options = {}) => {
        const content = normalizePdfText(text);
        const fontSize = options.fontSize ?? 10;
        const fontStyle = options.fontStyle ?? 'normal';

        if (!containsComplexPdfText(content)) {
            return doc.splitTextToSize(content, maxWidth);
        }

        const context = getCanvasContext();
        context.font = `${fontStyle} ${fontSize * PT_TO_PX}px ${DEFAULT_FONT_STACK}`;
        return buildCjkLines(context, content, maxWidth * MM_TO_PX);
    };

    const measureTextHeight = (text, maxWidth, options = {}) => {
        const lineHeight = options.lineHeight ?? 1.35;
        const fontSize = options.fontSize ?? 10;
        const lines = getWrappedLines(text, maxWidth, options);
        return Math.max(lines.length, 1) * fontSize * PT_TO_MM * lineHeight;
    };

    const drawText = async (text, x, y, options = {}) => {
        const content = normalizePdfText(text);
        const lines = getWrappedLines(content, options.maxWidth ?? 60, options);
        const fontSize = options.fontSize ?? 10;
        const fontStyle = options.fontStyle ?? 'normal';
        const color = toRgb(options.color);
        const lineHeight = options.lineHeight ?? 1.35;
        const maxWidth = options.maxWidth ?? 60;
        const align = options.align ?? 'left';

        if (!containsComplexPdfText(content)) {
            doc.setFont('helvetica', fontStyle);
            doc.setFontSize(fontSize);
            doc.setTextColor(...color);
            doc.text(lines, x, y, { align, baseline: 'top' });
            return measureTextHeight(content, maxWidth, options);
        }

        const cssWidthPx = Math.max(1, Math.ceil(maxWidth * MM_TO_PX));
        const fontSizePx = fontSize * PT_TO_PX;
        const lineHeightPx = fontSizePx * lineHeight;
        const paddingPx = Math.ceil(fontSizePx * 0.25);
        const cssHeightPx = Math.max(
            1,
            Math.ceil(lines.length * lineHeightPx + (paddingPx * 2)),
        );
        const scale = 2;

        const canvas = document.createElement('canvas');
        canvas.width = cssWidthPx * scale;
        canvas.height = cssHeightPx * scale;

        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        context.clearRect(0, 0, cssWidthPx, cssHeightPx);
        context.font = `${fontStyle} ${fontSizePx}px ${DEFAULT_FONT_STACK}`;
        context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        context.textBaseline = 'top';

        lines.forEach((line, index) => {
            const measuredWidth = context.measureText(line).width;
            let lineX = 0;
            if (align === 'right') {
                lineX = cssWidthPx - measuredWidth;
            } else if (align === 'center') {
                lineX = (cssWidthPx - measuredWidth) / 2;
            }

            context.fillText(
                line,
                Math.max(0, lineX),
                paddingPx + (index * lineHeightPx),
            );
        });

        const heightMm = cssHeightPx / MM_TO_PX;
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, maxWidth, heightMm);
        return heightMm;
    };

    return {
        getWrappedLines,
        measureTextHeight,
        drawText,
    };
};

