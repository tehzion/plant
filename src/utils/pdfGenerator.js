import jsPDF from 'jspdf';
import { getProductRecommendations } from '../data/productRecommendations.js';
import { isHealthy } from './statusUtils';
import { containsComplexPdfText, createPdfTextRenderer } from './pdfTextRenderer';

const PT_TO_MM = 25.4 / 72;

const getTranslation = (translations, language, key) => {
    const keys = key.split('.');
    let value = translations?.[language];
    for (const part of keys) {
        value = value?.[part];
    }
    return value || key;
};

const resolveImageFormat = (dataUrl) => {
    if (typeof dataUrl !== 'string') return 'JPEG';
    if (dataUrl.startsWith('data:image/png')) return 'PNG';
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
    return 'JPEG';
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

const loadImageToCanvasDataUrl = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    image.onerror = reject;
    image.src = url;
});

const sanitizeProductText = (value) => String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const resolvePdfImageData = async (source) => {
    if (!source || typeof source !== 'string') {
        return null;
    }

    if (source.startsWith('data:image')) {
        return source;
    }

    try {
        const response = await fetch(source, { mode: 'cors' });
        if (!response.ok) {
            throw new Error(`Image fetch failed with status ${response.status}`);
        }
        const blob = await response.blob();
        return await blobToDataUrl(blob);
    } catch (fetchError) {
        try {
            return await loadImageToCanvasDataUrl(source);
        } catch (imageError) {
            console.error('Failed to resolve PDF image:', fetchError, imageError);
            return null;
        }
    }
};

const normalizeList = (value) => {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/\r?\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const sanitizeFileStem = (value) => {
    if (!value || containsComplexPdfText(value)) {
        return 'report';
    }

    const normalized = String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || 'report';
};

const formatLocationValue = (scanData, t) => {
    if (typeof scanData.locationName === 'string' && scanData.locationName.trim()) {
        return scanData.locationName;
    }

    if (typeof scanData.location === 'string' && scanData.location.trim()) {
        return scanData.location;
    }

    if (scanData.location && typeof scanData.location === 'object') {
        const lat = Number(scanData.location.lat);
        const lng = Number(scanData.location.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }

    return t('common.locationNA');
};

export const generatePDFReport = async (scanData, inputLanguage = 'en', translations = {}, options = {}) => {
    const language = inputLanguage || 'en';
    const doc = new jsPDF();
    const renderer = createPdfTextRenderer(doc);
    const t = (key) => getTranslation(translations, language, key);
    const pageLabel = t('common.page');
    const ofLabel = t('common.of');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = [0, 177, 79];
    const secondaryColor = [232, 245, 233];
    const darkColor = [28, 36, 52];
    const lightText = [100, 116, 139];
    const unhealthyColor = [239, 68, 68];

    let yPos = 20;

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
            lineHeight = 1.35,
            align = 'left',
        } = options;

        for (const line of lines) {
            const lineText = line || ' ';
            const blockHeight = renderer.measureTextHeight(lineText, width, { fontSize, fontStyle, lineHeight });
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
        const lines = renderer.getWrappedLines(text, options.width ?? pageWidth - 28, options);
        await writeLines(lines, options);
    };

    const writeList = async (items, options = {}) => {
        const {
            x = 18,
            width = pageWidth - 32,
            bullet = '-',
            fontSize = 10,
            color = darkColor,
            gapAfter = 8,
        } = options;

        for (const item of items) {
            const content = bullet ? `${bullet} ${item}` : String(item);
            const lines = renderer.getWrappedLines(content, width, { fontSize });
            await writeLines(lines, {
                x,
                width,
                fontSize,
                color,
                gapAfter: 0,
            });
        }

        yPos += gapAfter;
    };

    const writeSectionTitle = async (title, options = {}) => {
        const {
            fillColor = null,
            textColor = darkColor,
            fontSize = 12,
            x = 14,
            width = pageWidth - 28,
            paddingY = 3,
            marginBottom = 8,
        } = options;

        const textHeight = renderer.measureTextHeight(title, width - 8, { fontSize, fontStyle: 'bold' });
        const blockHeight = textHeight + (paddingY * 2);
        checkPageBreak(blockHeight + marginBottom);

        if (fillColor) {
            doc.setFillColor(...fillColor);
            doc.roundedRect(x, yPos, width, blockHeight, 2, 2, 'F');
        }

        await renderer.drawText(title, x + 4, yPos + paddingY, {
            maxWidth: width - 8,
            fontSize,
            fontStyle: 'bold',
            color: textColor,
        });
        yPos += blockHeight + marginBottom;
    };

    const localizeField = (value, prefix) => {
        if (!value) return t('common.unknown');
        const trimmedValue = value.toString().trim();
        const potentialKeys = [
            `${prefix}${trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1).replace(/\s+/g, '')}`,
            `${prefix}${trimmedValue.toLowerCase()}`,
            `${prefix}${trimmedValue.toLowerCase()}s`,
            `home.${trimmedValue.charAt(0).toLowerCase() + trimmedValue.slice(1).replace(/Scale| farming/g, '')}Scale`,
            `home.${trimmedValue.toLowerCase()}`,
            `results.${trimmedValue.toLowerCase()}`,
        ];

        for (const key of potentialKeys) {
            const translated = t(key);
            if (translated !== key) {
                return translated;
            }
        }

        return value;
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
    await renderer.drawText(t('pdf.title').toUpperCase(), 42, 24, {
        maxWidth: 90,
        fontSize: 12,
        color: [255, 255, 255],
    });

    const localeString = t('common.dateLocale') || 'en-MY';
    const reportDateText = `${t('pdf.reportDate')}: ${new Date().toLocaleDateString(localeString)}`;
    await renderer.drawText(reportDateText, pageWidth - 74, 18, {
        maxWidth: 60,
        fontSize: 10,
        color: [255, 255, 255],
        align: 'right',
    });

    yPos = 56;

    const treeImage = await resolvePdfImageData(scanData.image || scanData.image_url);
    const leafImage = await resolvePdfImageData(scanData.leafImage || scanData.leaf_image_url);

    try {
        if (treeImage && leafImage) {
            const imageWidth = 80;
            const imageHeight = 60;
            const gap = 10;
            const startX = (pageWidth - ((imageWidth * 2) + gap)) / 2;

            doc.addImage(treeImage, resolveImageFormat(treeImage), startX, yPos, imageWidth, imageHeight);
            doc.addImage(leafImage, resolveImageFormat(leafImage), startX + imageWidth + gap, yPos, imageWidth, imageHeight);
            yPos += imageHeight + 14;
        } else if (treeImage) {
            const imageWidth = 90;
            const imageHeight = 65;
            const startX = (pageWidth - imageWidth) / 2;

            doc.addImage(treeImage, resolveImageFormat(treeImage), startX, yPos, imageWidth, imageHeight);
            yPos += imageHeight + 14;
        } else if (leafImage) {
            const imageWidth = 90;
            const imageHeight = 65;
            const startX = (pageWidth - imageWidth) / 2;

            doc.addImage(leafImage, resolveImageFormat(leafImage), startX, yPos, imageWidth, imageHeight);
            yPos += imageHeight + 14;
        }
    } catch (error) {
        console.error('Error adding image to PDF:', error);
    }

    const healthy = isHealthy(scanData);
    const statusColor = healthy ? primaryColor : unhealthyColor;
    doc.setFillColor(...statusColor);
    doc.roundedRect(14, yPos, pageWidth - 28, 18, 3, 3, 'F');
    await renderer.drawText(
        healthy ? t('results.healthy').toUpperCase() : t('results.unhealthy').toUpperCase(),
        18,
        yPos + 4,
        {
            maxWidth: pageWidth - 36,
            fontSize: 16,
            fontStyle: 'bold',
            color: [255, 255, 255],
            align: 'center',
        },
    );
    yPos += 28;

    await writeSectionTitle(t('pdf.analysisDetails'), {
        textColor: darkColor,
        fontSize: 14,
        paddingY: 0,
        marginBottom: 6,
        x: 14,
        width: pageWidth - 28,
    });

    const metadataRows = [
        [t('results.plantType'), scanData.plantType],
        [t('results.category'), localizeField(scanData.category, 'home.category')],
        [t('results.scale'), localizeField(scanData.farmScale, 'home.')],
    ];

    if (scanData.malaysianContext?.variety) {
        metadataRows.push([t('results.localVariety'), scanData.malaysianContext.variety]);
    }
    if (scanData.malaysianContext?.region) {
        metadataRows.push([t('results.keyRegions'), scanData.malaysianContext.region]);
    }
    if (scanData.location || scanData.locationName) {
        metadataRows.push([t('common.location'), formatLocationValue(scanData, t)]);
    }
    if (!healthy && scanData.disease) {
        metadataRows.push([t('results.diagnosis') || t('results.disease'), scanData.disease]);
    }
    if (scanData.fungusType) {
        metadataRows.push([t('results.fungusSpecies'), scanData.fungusType]);
    }
    if (scanData.pathogenType) {
        metadataRows.push([t('results.pathogen'), scanData.pathogenType]);
    }

    const labelWidth = 58;
    const valueWidth = pageWidth - 28 - labelWidth;
    for (const [label, value] of metadataRows.filter((row) => row[1])) {
        const rowHeight = Math.max(
            renderer.measureTextHeight(label, labelWidth - 8, { fontSize: 10, fontStyle: 'bold' }),
            renderer.measureTextHeight(String(value), valueWidth - 8, { fontSize: 10 }),
            8 * PT_TO_MM,
        ) + 6;

        checkPageBreak(rowHeight + 2);
        doc.setFillColor(...secondaryColor);
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, yPos, labelWidth, rowHeight, 'FD');
        doc.rect(14 + labelWidth, yPos, valueWidth, rowHeight, 'S');

        await renderer.drawText(label, 18, yPos + 3, {
            maxWidth: labelWidth - 8,
            fontSize: 10,
            fontStyle: 'bold',
            color: lightText,
        });
        await renderer.drawText(String(value), 18 + labelWidth, yPos + 3, {
            maxWidth: valueWidth - 8,
            fontSize: 10,
            color: darkColor,
        });

        yPos += rowHeight;
    }
    yPos += 10;

    const description = scanData.description || scanData.additionalNotes;
    if (description) {
        await writeSectionTitle(t('results.aboutDisease'), {
            textColor: darkColor,
            fontSize: 12,
            paddingY: 0,
            marginBottom: 6,
        });
        await writeParagraph(description, {
            x: 14,
            width: pageWidth - 28,
            fontSize: 10,
            color: darkColor,
            gapAfter: 8,
        });
    }

    const symptoms = normalizeList(scanData.symptoms);
    if (symptoms.length > 0) {
        await writeSectionTitle(t('results.symptoms'), {
            textColor: darkColor,
            fontSize: 14,
            paddingY: 0,
            marginBottom: 6,
        });
        await writeList(symptoms.map((symptom, index) => `${index + 1}. ${symptom}`), {
            x: 14,
            width: pageWidth - 28,
            bullet: '',
        });
    }

    const causes = normalizeList(scanData.causes);
    if (causes.length > 0) {
        await writeSectionTitle(t('results.causes'), {
            textColor: darkColor,
            fontSize: 14,
            paddingY: 0,
            marginBottom: 6,
        });
        await writeList(causes, {
            x: 18,
            width: pageWidth - 32,
            bullet: '-',
        });
    }

    if (!healthy) {
        await writeSectionTitle(t('pdf.treatmentPlan').toUpperCase(), {
            fillColor: [254, 242, 242],
            textColor: unhealthyColor,
            fontSize: 12,
            marginBottom: 8,
        });

        const immediateActions = normalizeList(scanData.immediateActions);
        if (immediateActions.length > 0) {
            await writeSectionTitle(t('results.immediateActions'), {
                textColor: darkColor,
                fontSize: 11,
                paddingY: 0,
                marginBottom: 6,
            });
            await writeList(immediateActions, {
                x: 18,
                width: pageWidth - 32,
                bullet: '-',
            });
        }

        const treatments = normalizeList(scanData.treatments);
        if (treatments.length > 0) {
            await writeSectionTitle(t('results.treatments'), {
                textColor: darkColor,
                fontSize: 11,
                paddingY: 0,
                marginBottom: 6,
            });
            await writeList(treatments, {
                x: 18,
                width: pageWidth - 32,
                bullet: '-',
            });
        }
    }

    const prevention = normalizeList(scanData.prevention);
    if (prevention.length > 0) {
        await writeSectionTitle((t('results.prevention') || 'Prevention').toUpperCase(), {
            fillColor: secondaryColor,
            textColor: primaryColor,
            fontSize: 12,
            marginBottom: 8,
        });
        await writeList(prevention, {
            x: 18,
            width: pageWidth - 32,
            bullet: '-',
        });
    }

    if (scanData.nutritionalIssues?.hasDeficiency) {
        await writeSectionTitle(t('results.nutritionalIssues'), {
            textColor: [217, 119, 6],
            fontSize: 14,
            paddingY: 0,
            marginBottom: 6,
        });

        const deficientNutrients = Array.isArray(scanData.nutritionalIssues.deficientNutrients)
            ? scanData.nutritionalIssues.deficientNutrients
            : [];

        const nutrientRows = deficientNutrients.map((issue) => {
            if (typeof issue === 'string') return issue;
            const symptomsText = normalizeList(issue.symptoms).join(', ');
            return [issue.nutrient, symptomsText].filter(Boolean).join(': ');
        });

        await writeList(nutrientRows, {
            x: 14,
            width: pageWidth - 28,
            bullet: '!',
            color: darkColor,
        });
    }

    const hasExplicitProducts = Object.prototype.hasOwnProperty.call(options, 'productRecommendations');
    const products = hasExplicitProducts
        ? (options.productRecommendations || null)
        : getProductRecommendations(scanData.plantType, scanData.disease);
    const fertilizerProducts = products?.fertilizers || products?.nutrition || [];
    const supplementProducts = products?.supplements || [];
    const fallbackProducts = products?.otherPopular || [];

    if (products && (
        products.diseaseControl?.length > 0
        || fertilizerProducts.length > 0
        || supplementProducts.length > 0
        || fallbackProducts.length > 0
    )) {
        await writeSectionTitle(t('pdf.productRecommendations'), {
            textColor: primaryColor,
            fontSize: 14,
            paddingY: 0,
            marginBottom: 8,
        });
        doc.setDrawColor(...primaryColor);
        doc.line(14, yPos - 6, pageWidth - 14, yPos - 6);

        const renderProductList = async (productList, categoryTitle) => {
            if (!Array.isArray(productList) || productList.length === 0) return;

            await writeSectionTitle(categoryTitle, {
                textColor: darkColor,
                fontSize: 11,
                paddingY: 0,
                marginBottom: 6,
            });

            for (const product of productList) {
                const detailLabel = product.count || (product.price ? `RM ${product.price}` : '');
                const name = detailLabel ? `${t(product.name)} (${detailLabel})` : t(product.name);
                await writeParagraph(name, {
                    x: 20,
                    width: pageWidth - 34,
                    fontSize: 10,
                    fontStyle: 'bold',
                    color: darkColor,
                    gapAfter: 2,
                });
                const description = sanitizeProductText(product.shortDescription || product.description);
                if (description) {
                    await writeParagraph(t(description), {
                        x: 20,
                        width: pageWidth - 34,
                        fontSize: 10,
                        color: lightText,
                        gapAfter: 6,
                    });
                }
            }
        };

        await renderProductList(products.diseaseControl, t('results.diseaseControlProducts'));
        await renderProductList(
            fertilizerProducts,
            (!scanData.disease || healthy)
                ? t('results.growthAndMaintenance')
                : t('results.fertilizersAndNutrition'),
        );
        await renderProductList(supplementProducts, t('results.recommendedSupplements'));

        if (fallbackProducts.length > 0) {
            if (products?.fallbackMeta?.used) {
                await writeParagraph(
                    t('results.fallbackProductsLabel'),
                    {
                        x: 14,
                        width: pageWidth - 28,
                        fontSize: 9,
                        color: lightText,
                        gapAfter: 6,
                    },
                );
            }

            await renderProductList(
                fallbackProducts,
                products?.fallbackMeta?.used
                    ? t('results.fallbackProductsTitle')
                    : t('results.otherPopular'),
            );
        }
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

        await renderer.drawText(t('pdf.generatedBy'), 14, pageHeight - 12, {
            maxWidth: 90,
            fontSize: 8,
            color: lightText,
        });
        await renderer.drawText(`${pageLabel} ${pageIndex} ${ofLabel} ${pageCount}`, pageWidth - 44, pageHeight - 12, {
            maxWidth: 30,
            fontSize: 8,
            color: lightText,
            align: 'right',
        });
    }

    const fileName = `plant-analysis-${sanitizeFileStem(scanData.plantType)}-${Date.now()}.pdf`;
    doc.save(fileName);
};

export default generatePDFReport;
