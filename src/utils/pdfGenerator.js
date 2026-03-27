import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getProductRecommendations } from '../data/productRecommendations.js';
import { isHealthy } from './statusUtils';

/**
 * Generate a comprehensive PDF report for plant disease analysis
 * @param {Object} scanData - The scan data from analysis
 * @param {string} language - Language code ('en' or 'ms')
 * @param {Object} translations - Translation object
 * @returns {Promise<void>}
 */
export const generatePDFReport = async (scanData, inputLanguage = 'en', translations) => {
    // Force English if Chinese is selected, as jsPDF standard fonts don't support CJK
    const language = inputLanguage === 'zh' ? 'en' : inputLanguage;
    
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

    // Brand Colors - Standardized
    const primaryColor = [0, 177, 79]; // #00B14F (Grab-like green)
    const secondaryColor = [232, 245, 233]; // #E8F5E9 (Light green)
    const darkColor = [28, 36, 52]; // #1C2434 (Dark text)
    const lightText = [100, 116, 139]; // #64748B (Secondary text)
    const unhealthyColor = [239, 68, 68]; // #EF4444 (Red)

    // === HEADER SECTION ===
    // Green header background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo Placeholder (White Circle)
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 22, 12, 'F');
    // Leaf Icon (Simplified drawing)
    doc.setFillColor(...primaryColor);
    doc.path('M 25 15 C 25 15 30 20 30 25 C 30 30 25 32 25 32 C 25 32 20 30 20 25 C 20 20 25 15 25 15');
    doc.fill();

    // App Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Smart Plant Advisor', 42, 20);

    // Report Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf.title').toUpperCase(), 42, 28);

    // Date Badge
    const localeString = t('common.dateLocale') || 'en-MY';
    const dateStr = new Date().toLocaleDateString(localeString);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${t('pdf.reportDate')}: ${dateStr}`, pageWidth - 20, 25, { align: 'right' });

    yPos = 60;

    // === IMAGES SECTION ===
    const hasTreeImage = scanData.image && scanData.image.startsWith('data:image');
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
    const healthy = isHealthy(scanData);
    const statusColor = healthy ? primaryColor : unhealthyColor;

    doc.setFillColor(...statusColor);
    doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const statusText = healthy ? t('results.healthy').toUpperCase() : t('results.unhealthy').toUpperCase();
    doc.text(statusText, pageWidth / 2, yPos + 18, { align: 'center' });

    yPos += 40;

    // === ANALYSIS DETAILS (Using AutoTable) ===
    doc.setTextColor(...darkColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.analysisDetails'), 14, yPos);
    yPos += 8;

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
        const locName = scanData.locationName || scanData.location || 'common.locationNA';
        const displayLoc = locName.startsWith('common.') ? t(locName) : locName;
        metadataRows.push([t('common.location'), displayLoc]);
    }

    if (!healthy && scanData.disease) {
        metadataRows.push([t('results.diagnosis') || t('results.disease'), scanData.disease]);
    }

    if (scanData.fungusType) {
        metadataRows.push([t('results.fungusSpecies'), scanData.fungusType]);
        metadataRows.push([t('results.pathogen'), scanData.pathogenType || t('results.fungi')]);
    }

    doc.autoTable({
        startY: yPos,
        body: metadataRows,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 5,
            lineColor: [226, 232, 240],
            textColor: darkColor
        },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: lightText, width: 60, fillColor: secondaryColor },
            1: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Don't update yPos inside here as it might be called multiple times
        }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;

    // Helper function to check if we need a new page
    function checkPageBreak(requiredSpace = 20) {
        if (yPos + requiredSpace > pageHeight - 30) {
            doc.addPage();
            yPos = 30; // Reset Y position with some top margin
            doc.setFont('helvetica', 'normal');
        }
    }

    // === DESCRIPTION (If available) ===
    if (scanData.description) {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkColor);
        doc.text(t('results.aboutDisease') || 'About This Condition', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(scanData.description, pageWidth - 28);
        descLines.forEach(line => {
            checkPageBreak(5);
            doc.text(line, 14, yPos);
            yPos += 5;
        });
        yPos += 10;
    }

    // === SYMPTOMS ===
    if (scanData.symptoms && scanData.symptoms.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkColor);
        doc.text(t('results.symptoms'), 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        scanData.symptoms.forEach((symptom, index) => {
            const lines = doc.splitTextToSize(`${index + 1}. ${symptom}`, pageWidth - 28);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 14, yPos);
                yPos += 6;
            });
        });
        yPos += 10;
    }

    // === CAUSES ===
    if (scanData.causes && scanData.causes.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkColor);
        doc.text(t('results.causes') || 'Causes & Conditions', 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        scanData.causes.forEach((cause, index) => {
            const lines = doc.splitTextToSize(`• ${cause}`, pageWidth - 28);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 18, yPos);
                yPos += 6;
            });
        });
        yPos += 10;
    }

    // === TREATMENT PLAN ===
    if (!healthy) {
        checkPageBreak(40);
        
        // Section Header with Background
        doc.setFillColor(254, 242, 242); // Light red bg
        doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...unhealthyColor);
        doc.text(t('pdf.treatmentPlan').toUpperCase(), 18, yPos + 7);
        yPos += 18;

        // Immediate Actions
        if (scanData.immediateActions && scanData.immediateActions.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkColor);
            doc.text(t('results.immediateActions'), 14, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            scanData.immediateActions.forEach((action) => {
                const lines = doc.splitTextToSize(`- ${action}`, pageWidth - 28);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 18, yPos);
                    yPos += 6;
                });
            });
            yPos += 8;
        }

        // Treatments
        if (scanData.treatments && scanData.treatments.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkColor);
            doc.text(t('results.treatments') || 'Treatment Options', 14, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            scanData.treatments.forEach((treatment) => {
                const lines = doc.splitTextToSize(`- ${treatment}`, pageWidth - 28);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 18, yPos);
                    yPos += 6;
                });
            });
            yPos += 12;
        }
    }

    // === PREVENTION ===
    if (scanData.prevention && scanData.prevention.length > 0) {
        checkPageBreak(30);
        
        // Section Header with Background
        doc.setFillColor(...secondaryColor); // Light green bg
        doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text((t('results.prevention') || 'Prevention').toUpperCase(), 18, yPos + 7);
        yPos += 18;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkColor);
        scanData.prevention.forEach((item) => {
            const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 28);
            lines.forEach(line => {
                checkPageBreak(6);
                doc.text(line, 18, yPos);
                yPos += 6;
            });
        });
        yPos += 12;
    }

    // === NUTRITIONAL ANALYSIS ===
    if (scanData.nutritionalIssues?.hasDeficiency) {
        checkPageBreak(40);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6); // Amber
        doc.text(t('results.nutritionalIssues'), 14, yPos);
        yPos += 10;

        const { deficientNutrients } = scanData.nutritionalIssues;
        if (deficientNutrients && deficientNutrients.length > 0) {
            deficientNutrients.forEach((issue) => {
                const issueText = typeof issue === 'string' ? issue : `${issue.nutrient}: ${issue.symptoms?.[0] || ''}`;
                // Safer emoji stripping for CJK support
                const cleanText = issueText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '');
                const lines = doc.splitTextToSize(`! ${cleanText}`, pageWidth - 28);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 14, yPos);
                    yPos += 6;
                });
            });
            yPos += 12;
        }
    }

    // === PRODUCT RECOMMENDATIONS ===
    const products = getProductRecommendations(scanData.plantType, scanData.disease);
    if (products && (products.diseaseControl?.length > 0 || products.nutrition?.length > 0)) {
        checkPageBreak(50);
        
        // Header
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t('pdf.productRecommendations'), 14, yPos);
        doc.line(14, yPos + 2, pageWidth - 14, yPos + 2); // Underline
        yPos += 12;

        const renderProductList = (productList, categoryTitle) => {
            if (!productList || productList.length === 0) return;

            checkPageBreak(30);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkColor);
            doc.text(categoryTitle, 14, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');

            productList.forEach((prod) => {
                checkPageBreak(25);
                const nameLink = `${t(prod.name)} (${prod.count || 'N/A'})`;
                
                // Bullet point
                doc.setTextColor(...primaryColor);
                doc.text('•', 16, yPos);
                
                // Product Name
                doc.setTextColor(...darkColor);
                doc.setFont('helvetica', 'bold');
                doc.text(nameLink, 20, yPos);
                yPos += 5;

                // Description
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...lightText);
                const descLines = doc.splitTextToSize(`${t(prod.description)}`, pageWidth - 35);
                descLines.forEach(line => {
                    doc.text(line, 20, yPos);
                    yPos += 5;
                });

                yPos += 4;
            });
        };

        renderProductList(products.diseaseControl, t('results.diseaseControlProducts'));
        renderProductList(products.nutrition, (!scanData.disease || isHealthy(scanData)) ? t('results.growthAndMaintenance') : t('results.fertilizersAndNutrition'));
    }

    // === FOOTER (All Pages) ===
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer Line
        doc.setDrawColor(226, 232, 240);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        
        doc.setFontSize(8);
        doc.setTextColor(...lightText);
        doc.setFont('helvetica', 'normal');
        
        // Disclaimer (Left)
        doc.text(
            `Smart Plant Advisor - ${t('pdf.generatedBy')}`,
            14,
            pageHeight - 10
        );
        
        // Page Number (Right)
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - 14,
            pageHeight - 10,
            { align: 'right' }
        );
    }

    // Save the PDF
    const fileName = `plant-analysis-${scanData.plantType || 'report'}-${Date.now()}.pdf`;
    doc.save(fileName);
};

export default generatePDFReport;
