import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

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

    // Colors
    // Colors - Updated to match App Green (Grab-like)
    const primaryColor = [16, 185, 129]; // #10B981
    const secondaryColor = [51, 51, 51];
    const healthyColor = [16, 185, 129]; // Match primary
    const unhealthyColor = [239, 68, 68]; // #EF4444

    // === HEADER ===
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.title'), pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf.generatedBy'), pageWidth / 2, 28, { align: 'center' });
    doc.text(`${t('pdf.reportDate')}: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });

    yPos = 55;

    // === PLANT IMAGE ===
    if (scanData.image && scanData.image.startsWith('data:image')) {
        try {
            const imgWidth = 80;
            const imgHeight = 60;
            const xPos = (pageWidth - imgWidth) / 2;
            doc.addImage(scanData.image, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 15;
        } catch (error) {
            console.error('Error adding image to PDF:', error);
        }
    }

    // === HEALTH STATUS BANNER ===
    const isHealthy = scanData.healthStatus === 'HEALTHY' || scanData.healthStatus === 'Sihat';
    const statusColor = isHealthy ? healthyColor : unhealthyColor;

    doc.setFillColor(...statusColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 24, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

    // Center text vertically in the banner
    const statusText = isHealthy ? t('results.healthy').toUpperCase() : t('results.unhealthy').toUpperCase();
    doc.text(statusText, pageWidth / 2, yPos + 16, { align: 'center' });

    yPos += 35;

    // === ANALYSIS DETAILS (Receipt Style) ===
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 10;

    doc.setTextColor(...secondaryColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.analysisDetails'), 15, yPos);
    yPos += 10;

    doc.setFontSize(10);

    const details = [
        [`${t('results.plantType')}:`, scanData.plantType || t('results.notSpecified')],
        [`${t('results.category')}:`, scanData.category || t('results.notSpecified')],
        [`${t('results.scale')}:`, scanData.farmScale || t('results.notSpecified')],
    ];

    // Add Malaysian Context if available
    if (scanData.malaysianContext) {
        if (scanData.malaysianContext.variety) {
            details.push([`${t('results.localVariety')}:`, scanData.malaysianContext.variety]);
        }
        if (scanData.malaysianContext.region) {
            details.push([`${t('results.keyRegions')}:`, scanData.malaysianContext.region]);
        }
        if (scanData.malaysianContext.seasonalConsideration) {
            // Truncate if too long (season advice can be long)
            const season = scanData.malaysianContext.seasonalConsideration;
            details.push([`${t('results.seasonalAdvice')}:`, season.length > 50 ? season.substring(0, 47) + '...' : season]);
        }
    }

    details.push([`${t('results.confidence')}:`, scanData.confidence ? `${scanData.confidence}%` : 'N/A']);

    if (!isHealthy && scanData.disease) {
        details.push([`${t('results.disease')}:`, scanData.disease]);
    }

    if (scanData.fungusType) {
        details.push([`${t('results.fungusSpecies')}:`, scanData.fungusType]);
    }

    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100); // Gray label
        doc.text(label, 15, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0); // Black value
        // Align value to the right for receipt feel? Or just offset. Let's keep offset but clean.
        doc.text(value.toString(), 70, yPos);
        yPos += 7;
    });

    yPos += 5;
    doc.line(15, yPos, pageWidth - 15, yPos); // Divider
    yPos += 10;

    // === SYMPTOMS ===
    if (scanData.symptoms && scanData.symptoms.length > 0) {
        checkPageBreak();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('results.symptoms'), 15, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        scanData.symptoms.forEach((symptom, index) => {
            const lines = doc.splitTextToSize(`${index + 1}. ${symptom}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak();
                doc.text(line, 15, yPos);
                yPos += 5;
            });
        });
        yPos += 5;
    }

    // === TREATMENT PLAN ===
    if (!isHealthy) {
        checkPageBreak();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('pdf.treatmentPlan'), 15, yPos);
        yPos += 8;

        // Immediate Actions
        if (scanData.immediateActions && scanData.immediateActions.length > 0) {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(t('results.immediateActions'), 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            scanData.immediateActions.forEach((action, index) => {
                const lines = doc.splitTextToSize(`${index + 1}. ${action}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak();
                    doc.text(line, 15, yPos);
                    yPos += 4.5;
                });
            });
            yPos += 3;
        }

        // Treatments
        if (scanData.treatments && scanData.treatments.length > 0) {
            checkPageBreak();
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(t('results.treatments'), 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            scanData.treatments.forEach((treatment, index) => {
                const lines = doc.splitTextToSize(`${index + 1}. ${treatment}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak();
                    doc.text(line, 15, yPos);
                    yPos += 4.5;
                });
            });
            yPos += 3;
        }

        // Prevention
        if (scanData.prevention && scanData.prevention.length > 0) {
            checkPageBreak();
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(t('results.prevention'), 15, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            scanData.prevention.forEach((prevent, index) => {
                const lines = doc.splitTextToSize(`${index + 1}. ${prevent}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak();
                    doc.text(line, 15, yPos);
                    yPos += 4.5;
                });
            });
            yPos += 5;
        }
    }

    // === NUTRITIONAL ANALYSIS ===
    if (scanData.nutritionalIssues?.hasDeficiency) {
        checkPageBreak();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('results.nutritionalIssues'), 15, yPos);
        yPos += 8;

        const { deficientNutrients } = scanData.nutritionalIssues;
        if (deficientNutrients && deficientNutrients.length > 0) {
            deficientNutrients.forEach((issue, index) => {
                const issueText = typeof issue === 'string' ? issue : `${issue.nutrient}: ${issue.symptoms?.[0] || ''}`;
                const lines = doc.splitTextToSize(`${index + 1}. ${issueText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '')}`, pageWidth - 30);
                lines.forEach(line => {
                    checkPageBreak();
                    doc.text(line, 15, yPos);
                    yPos += 5;
                });
            });
            yPos += 5;
        }
    }

    // === FERTILIZER RECOMMENDATIONS ===
    if (scanData.fertilizerRecommendations && scanData.fertilizerRecommendations.length > 0) {
        checkPageBreak();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('results.fertilizerRecommendations'), 15, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        scanData.fertilizerRecommendations.forEach((rec, index) => {
            let recText = '';
            if (typeof rec === 'string') {
                recText = rec;
            } else {
                // Parse object format: { productName, type, applicationMethod, frequency, dosage }
                recText = `${rec.productName || (language === 'ms' ? 'Baja' : 'Fertilizer')} - ${rec.dosage || ''} (${rec.frequency || ''}). ${rec.applicationMethod || ''}`;
            }

            // Remove emojis (Unicode ranges for common emoji sets)
            recText = recText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '').trim();

            const lines = doc.splitTextToSize(`${index + 1}. ${recText}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak();
                doc.text(line, 15, yPos);
                yPos += 4.5;
            });
        });
        yPos += 5;
    }

    // === FOOTER/DISCLAIMER ===
    const disclaimerY = pageHeight - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const disclaimerLines = doc.splitTextToSize(t('pdf.disclaimer'), pageWidth - 30);
    disclaimerLines.forEach((line, index) => {
        doc.text(line, 15, disclaimerY + (index * 4));
    });

    // Helper function to check if we need a new page
    function checkPageBreak(requiredSpace = 20) {
        if (yPos + requiredSpace > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
        }
    }

    // Save the PDF
    const fileName = `plant-analysis-${scanData.plantType || 'report'}-${Date.now()}.pdf`;
    doc.save(fileName);
};

export default generatePDFReport;
