import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getProductRecommendations } from '../data/productRecommendations.js';

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
    doc.text(t('common.appTitle'), pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(t('common.appSlogan'), pageWidth / 2, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf.generatedBy'), pageWidth / 2, 30, { align: 'center' });
    doc.text(`${t('pdf.reportDate')}: ${new Date().toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY')}`, pageWidth / 2, 36, { align: 'center' });

    yPos = 55;

    // ... (Image logic remains same)
    // === PLANT IMAGE ===
    if (scanData.image && scanData.image.startsWith('data:image')) {
        try {
            const imgWidth = 90;
            const imgHeight = 65;
            const xPos = (pageWidth - imgWidth) / 2;
            doc.addImage(scanData.image, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        } catch (error) {
            console.error('Error adding image to PDF:', error);
        }
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
        if (scanData.malaysianContext.seasonalConsideration) {
            metadataRows.push([t('results.seasonalAdvice'), scanData.malaysianContext.seasonalConsideration]);
        }
    }

    metadataRows.push([t('results.confidence'), scanData.confidence ? `${scanData.confidence}%` : 'N/A']);

    if (!isHealthy && scanData.disease) {
        metadataRows.push([t('results.disease'), scanData.disease]);
    }

    if (scanData.fungusType) {
        metadataRows.push([t('results.fungusSpecies'), scanData.fungusType]);
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
        yPos += 10;
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
            scanData.immediateActions.forEach((action, index) => {
                const lines = doc.splitTextToSize(`- ${action}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
            });
            yPos += 8;
        }

        // Treatments (Simplified Header)
        if (scanData.treatments && scanData.treatments.length > 0) {
            checkPageBreak(30);
            // Removed redundant 'Treatments' sub-header based on user feedback
            // doc.setFontSize(12);
            // doc.setFont('helvetica', 'bold');
            // doc.text(t('results.treatments'), 15, yPos);
            // yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(31, 41, 55); // Ensure text color is consistent
            scanData.treatments.forEach((treatment, index) => {
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

    // === HEALTHY CARE PLAN ===
    if (isHealthy && scanData.healthyCarePlan) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...healthyColor);
        doc.text(t('results.healthyCarePlan') || 'Healthy Care Plan', 15, yPos);
        yPos += 10;

        const carePlan = scanData.healthyCarePlan;
        const sections = [
            { title: t('results.dailyCare'), items: carePlan.dailyCare },
            { title: t('results.weeklyCare'), items: carePlan.weeklyCare },
            { title: t('results.monthlyCare'), items: carePlan.monthlyCare },
            { title: t('results.bestPractices'), items: carePlan.bestPractices }
        ];

        sections.forEach(section => {
            if (section.items && section.items.length > 0) {
                checkPageBreak(30);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(31, 41, 55);
                doc.text(section.title, 15, yPos);
                yPos += 8;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                section.items.forEach((item, index) => {
                    const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 30);
                    lines.forEach(line => {
                        checkPageBreak(6);
                        doc.text(line, 20, yPos);
                        yPos += 6;
                    });
                });
                yPos += 8;
            }
        });
    }

    // === NUTRITIONAL ANALYSIS ===
    if (scanData.nutritionalIssues?.hasDeficiency) {
        checkPageBreak(40);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6); // Amber
        doc.text(t('results.nutritionalIssues'), 15, yPos);
        yPos += 10;

        const { deficientNutrients } = scanData.nutritionalIssues;
        if (deficientNutrients && deficientNutrients.length > 0) {
            deficientNutrients.forEach((issue, index) => {
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

    // === PRODUCT RECOMMENDATIONS ===
    const products = getProductRecommendations(scanData.plantType, scanData.disease);
    if (products && (products.diseaseControl?.length > 0 || products.nutrition?.length > 0)) {
        checkPageBreak(50);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(t('pdf.productRecommendations'), 15, yPos);
        yPos += 10;

        // Disease Control Products
        if (products.diseaseControl?.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(t('results.diseaseControlProducts'), 15, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            products.diseaseControl.forEach((prod) => {
                const text = `${t(prod.name)} - ${t(prod.description)}`;
                const lines = doc.splitTextToSize(`• ${text}`, pageWidth - 35);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
                yPos += 2;
            });
            yPos += 6;
        }

        // Nutrition Products
        if (products.nutrition?.length > 0) {
            checkPageBreak(30);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            const nutritionTitle = (!scanData.disease || scanData.disease.toLowerCase().includes('healthy'))
                ? t('results.growthAndMaintenance')
                : t('results.fertilizersAndNutrition');
            doc.text(nutritionTitle, 15, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            products.nutrition.forEach((prod) => {
                const text = `${t(prod.name)} - ${t(prod.description)}`;
                const lines = doc.splitTextToSize(`• ${text}`, pageWidth - 35);
                lines.forEach(line => {
                    checkPageBreak(6);
                    doc.text(line, 20, yPos);
                    yPos += 6;
                });
                yPos += 2;
            });
            yPos += 6;
        }
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
