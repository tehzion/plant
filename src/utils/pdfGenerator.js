import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getProductRecommendations, suppliers } from '../data/productRecommendations.js';

/**
 * Generate a comprehensive PDF report for plant disease analysis
 * @param {Object} scanData - The scan data from analysis
 * @param {string} language - Language code ('en' or 'ms')
 * @param {Object} translations - Translation object
 * @returns {Promise<void>}
 */
export const generatePDFReport = async (scanData, language = 'en', translations) => {
    const doc = new jsPDF();
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Helper for localizing categories and scales
    const localizeField = (value, prefix) => {
        if (!value) return t('common.unknown');
        const trimmedValue = value.toString().trim();

        // Try exact keys first
        const potentialKeys = [
            `${prefix}${trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1).replace(/\s+/g, '')}`,
            `${prefix}${trimmedValue.toLowerCase()}`,
            `${prefix}${trimmedValue.toLowerCase()}s`,
            `home.${trimmedValue.charAt(0).toLowerCase() + trimmedValue.slice(1).replace(/Scale| farming/g, '')}Scale`,
            `home.${trimmedValue.toLowerCase()}`,
            `results.${trimmedValue.toLowerCase()}`
        ];

        for (const key of potentialKeys) {
            const translated = t(key);
            if (translated && translated !== key) return translated;
        }

        return value;
    };

    // Colors - App Green (Brand Specific)
    const primaryColor = [0, 177, 79]; // #00B14F
    const healthyColor = [0, 177, 79]; // #00B14F - Consistent with primary
    const unhealthyColor = [239, 68, 68]; // #EF4444
    const grayText = [107, 114, 128]; // #6B7280

    // === HEADER ===
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(t('common.appTitle') || 'Agropreneur', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(t('common.appSlogan') || 'Cultivating Smarter Futures', pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    // Ensure "Dijana oleh..." is used if explicitly translated, otherwise fallback
    doc.text(t('pdf.generatedBy'), pageWidth / 2, 36, { align: 'center' });
    doc.text(`${t('pdf.reportDate')}: ${new Date().toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY')}`, pageWidth / 2, 41, { align: 'center' });

    yPos = 55;

    // === IMAGES ===
    const hasTreeImage = scanData.image && scanData.image.startsWith('data:image');
    // Check leafImage - sometimes it's "null" string or actual null
    const hasLeafImage = scanData.leafImage && scanData.leafImage.startsWith('data:image');

    try {
        if (hasTreeImage && hasLeafImage) {
            // Side by Side
            const imgWidth = 80;
            const imgHeight = 60;
            const gap = 10;
            const totalWidth = (imgWidth * 2) + gap;
            const startX = (pageWidth - totalWidth) / 2;

            doc.addImage(scanData.image, 'JPEG', startX, yPos, imgWidth, imgHeight);
            doc.addImage(scanData.leafImage, 'JPEG', startX + imgWidth + gap, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        } else if (hasTreeImage) {
            // Single Centered
            const imgWidth = 90;
            const imgHeight = 65;
            const xPos = (pageWidth - imgWidth) / 2;
            doc.addImage(scanData.image, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        }
    } catch (error) {
        console.error('Error adding image to PDF:', error);
    }

    // === HEALTH STATUS BANNER ===
    const isHealthy = scanData.healthStatus?.toLowerCase() === 'healthy' ||
        scanData.healthStatus === 'Sihat' ||
        scanData.disease?.toLowerCase().includes('tiada masalah') ||
        scanData.disease?.toLowerCase().includes('no issues');
    const statusColor = isHealthy ? healthyColor : unhealthyColor;

    doc.setFillColor(...statusColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 4, 4, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const statusText = isHealthy ? t('results.healthy').toUpperCase() : t('results.unhealthy').toUpperCase();
    doc.text(statusText, pageWidth / 2, yPos + 16, { align: 'center' });

    yPos += 35;

    // === ANALYSIS DETAILS (Using AutoTable) ===
    doc.setTextColor(31, 41, 55); // #1F2937
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.analysisDetails'), 15, yPos);
    yPos += 5;

    const metadataRows = [
        [t('results.plantType'), scanData.plantType],
        [t('results.category'), localizeField(scanData.category, 'home.category')],
        [t('results.scale'), localizeField(scanData.farmScale, 'home.')],
    ];

    if (scanData.malaysianContext) {
        if (scanData.malaysianContext.variety) {
            metadataRows.push([t('results.localVariety'), scanData.malaysianContext.variety]);
        }
        if (scanData.malaysianContext.region) {
            metadataRows.push([t('results.keyRegions'), scanData.malaysianContext.region]);
        }
    }

    // LOCATIONS
    if (scanData.location || scanData.locationName) {
        metadataRows.push([t('common.location'), scanData.locationName || scanData.location || t('common.locationNA')]);
    }

    if (!isHealthy && scanData.disease) {
        metadataRows.push([t('results.disease'), scanData.disease]);
    }

    if (scanData.fungusType) {
        metadataRows.push([t('results.fungusSpecies'), scanData.fungusType]);
        metadataRows.push([t('results.pathogen'), scanData.pathogenType || 'Fungi']);
    }

    doc.autoTable({
        startY: yPos,
        theme: 'plain',
        body: metadataRows,
        styles: {
            fontSize: 10,
            cellPadding: 3,
        },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: grayText, width: 60 },
            1: { cellWidth: 'auto' }
        },
        margin: { left: 15, right: 15 },
        didDrawPage: (data) => {
            yPos = data.cursor.y + 10;
        }
    });

    // === DESCRIPTION (If available) ===
    if (scanData.description) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(t('results.aboutDisease') || 'About This Condition', 15, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(scanData.description, pageWidth - 30);
        descLines.forEach(line => {
            checkPageBreak(5);
            doc.text(line, 15, yPos);
            yPos += 5;
        });
        yPos += 5;
    }

    // === SYMPTOMS ===
    if (scanData.symptoms && scanData.symptoms.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(t('results.symptoms'), 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        scanData.symptoms.forEach((symptom, index) => {
            const lines = doc.splitTextToSize(`${index + 1}. ${symptom}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 15, yPos);
                yPos += 6;
            });
        });
        yPos += 8;
    }

    // === CAUSES (New) ===
    if (scanData.causes && scanData.causes.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
        doc.text(t('results.causes') || 'Causes & Conditions', 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        scanData.causes.forEach((cause, index) => {
            const lines = doc.splitTextToSize(`• ${cause}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 20, yPos);
                yPos += 6;
            });
        });
        yPos += 8;
    }

    // === TREATMENT PLAN ===
    if (!isHealthy) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...unhealthyColor);
        doc.text(t('pdf.treatmentPlan'), 15, yPos);
        yPos += 10;

        // Immediate Actions
        if (scanData.immediateActions && scanData.immediateActions.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(t('results.immediateActions'), 15, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            scanData.immediateActions.forEach((action) => {
                const lines = doc.splitTextToSize(`- ${action}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
            });
            yPos += 8;
        }

        // Treatments
        if (scanData.treatments && scanData.treatments.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(t('results.treatments') || 'Treatment Options', 15, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            scanData.treatments.forEach((treatment) => {
                const lines = doc.splitTextToSize(`- ${treatment}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
            });
            yPos += 10;
        }
    }

    // === PREVENTION (New) ===
    if (scanData.prevention && scanData.prevention.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...healthyColor); // Use green for prevention
        doc.text(t('results.prevention') || 'Prevention & Best Practices', 15, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(31, 41, 55);
        scanData.prevention.forEach((item) => {
            const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 20, yPos);
                yPos += 6;
            });
        });
        yPos += 10;
    }

    // === NUTRITIONAL ANALYSIS (Enhanced) ===
    if (scanData.nutritionalIssues?.hasDeficiency) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6); // Amber
        doc.text(t('results.nutritionalIssues'), 15, yPos);
        yPos += 10;

        const { deficientNutrients } = scanData.nutritionalIssues;
        if (deficientNutrients && deficientNutrients.length > 0) {
            deficientNutrients.forEach((issue) => {
                const issueText = typeof issue === 'string' ? issue : `${issue.nutrient}: ${issue.symptoms?.[0] || ''}`;
                const cleanText = issueText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '');
                const lines = doc.splitTextToSize(`! ${cleanText}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 15, yPos);
                    yPos += 6;
                });
            });
            yPos += 10;
        }
    }

    // === PRODUCT RECOMMENDATIONS (With Suppliers) ===
    const products = getProductRecommendations(scanData.plantType, scanData.disease);
    if (products && (products.diseaseControl?.length > 0 || products.nutrition?.length > 0)) {
        checkPageBreak(50);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t('pdf.productRecommendations'), 15, yPos);
        yPos += 10;

        const renderProductList = (productList, categoryTitle) => {
            if (!productList || productList.length === 0) return;

            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(categoryTitle, 15, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            productList.forEach((prod) => {
                checkPageBreak(25); // Products need more space
                // Product Name & Desc
                const nameLink = `${t(prod.name)} (${prod.count || 'N/A'})`;
                doc.setFont('helvetica', 'bold');
                doc.text(`• ${nameLink}`, 20, yPos);
                yPos += 5;

                doc.setFont('helvetica', 'normal');
                const descLines = doc.splitTextToSize(`${t(prod.description)}`, pageWidth - 40);
                descLines.forEach(line => {
                    doc.text(line, 25, yPos);
                    yPos += 5;
                });

                yPos += 5;
            });
        };

        renderProductList(products.diseaseControl, t('results.diseaseControlProducts'));
        renderProductList(products.nutrition, (!scanData.disease || scanData.disease.toLowerCase().includes('healthy')) ? t('results.growthAndMaintenance') : t('results.fertilizersAndNutrition'));
    }

    // === FOOTER/DISCLAIMER ===
    const disclaimerY = pageHeight - 25;
    doc.setDrawColor(230, 230, 230);
    doc.line(15, disclaimerY - 5, pageWidth - 15, disclaimerY - 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 163, 175); // #9CA3AF
    const disclaimerLines = doc.splitTextToSize(t('pdf.disclaimer'), pageWidth - 30);
    disclaimerLines.forEach((line, index) => {
        doc.text(line, pageWidth / 2, disclaimerY + (index * 4), { align: 'center' });
    });

    // Helper function to check if we need a new page
    function checkPageBreak(requiredSpace = 20) {
        if (yPos + requiredSpace > pageHeight - 30) {
            doc.addPage();
            yPos = 25;
        }
    }

    // Save the PDF
    const fileName = `plant-analysis-${scanData.plantType || 'report'}-${Date.now()}.pdf`;
    doc.save(fileName);
};

export default generatePDFReport;
