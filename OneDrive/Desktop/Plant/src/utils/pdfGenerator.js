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
    const primaryColor = [95, 168, 62];
    const secondaryColor = [51, 51, 51];
    const healthyColor = [76, 175, 80];
    const unhealthyColor = [244, 67, 54];

    // === HEADER ===
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.title'), pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(t('pdf.generatedBy'), pageWidth / 2, 25, { align: 'center' });
    doc.text(`${t('pdf.reportDate')}: ${new Date().toLocaleDateString()}`, pageWidth / 2, 32, { align: 'center' });

    yPos = 50;

    // === PLANT IMAGE ===
    if (scanData.image && scanData.image.startsWith('data:image')) {
        try {
            const imgWidth = 80;
            const imgHeight = 60;
            const xPos = (pageWidth - imgWidth) / 2;
            doc.addImage(scanData.image, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            yPos += imgHeight + 10;
        } catch (error) {
            console.error('Error adding image to PDF:', error);
        }
    }

    // === HEALTH STATUS BANNER ===
    const isHealthy = scanData.healthStatus === 'HEALTHY';
    const statusColor = isHealthy ? healthyColor : unhealthyColor;

    doc.setFillColor(...statusColor);
    doc.roundedRect(15, yPos, pageWidth - 30, 15, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const statusText = isHealthy ? t('results.healthy') : t('results.unhealthy');
    doc.text(statusText, pageWidth / 2, yPos + 10, { align: 'center' });

    yPos += 25;

    // === ANALYSIS DETAILS ===
    doc.setTextColor(...secondaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('pdf.analysisDetails'), 15, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const details = [
        [`${t('results.plantType')}:`, scanData.plantType || t('results.notSpecified')],
        [`${t('results.category')}:`, scanData.category || t('results.notSpecified')],
        [`${t('results.scale')}:`, scanData.farmScale || t('results.notSpecified')],
        [`${t('results.confidence')}:`, scanData.confidence ? `${scanData.confidence}%` : 'N/A'],
    ];

    if (!isHealthy && scanData.disease) {
        details.push([`${t('results.disease')}:`, scanData.disease]);
    }

    if (scanData.fungusType) {
        details.push([`${t('results.fungusSpecies')}:`, scanData.fungusType]);
    }

    if (scanData.pathogenType) {
        details.push([`${t('results.pathogenType')}:`, scanData.pathogenType]);
    }

    if (isHealthy && scanData.estimatedAge) {
        details.push([`${t('results.estimatedAge')}:`, scanData.estimatedAge]);
    }

    details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 15, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 70, yPos);
        yPos += 6;
    });

    yPos += 5;

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
    if (scanData.fertilizerRecommendations && scanData.fertilizerRecommendations.length > 0) {
        checkPageBreak();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(t('results.fertilizerRecommendations'), 15, yPos);
        yPos += 7;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        scanData.fertilizerRecommendations.forEach((rec, index) => {
            const lines = doc.splitTextToSize(`${index + 1}. ${rec}`, pageWidth - 30);
            lines.forEach(line => {
                checkPageBreak();
                doc.text(line, 15, yPos);
                yPos += 4.5;
            });
        });
        yPos += 5;
    }

    // === PRODUCT RECOMMENDATIONS ===
    if (scanData.productRecommendations && scanData.productRecommendations.length > 0) {
        checkPageBreak();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('pdf.productRecommendations'), 15, yPos);
        yPos += 8;

        for (const product of scanData.productRecommendations) {
            checkPageBreak(30);

            doc.setFillColor(245, 245, 245);
            doc.roundedRect(15, yPos - 3, pageWidth - 30, 25, 2, 2, 'F');

            doc.setTextColor(...primaryColor);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(product.productName, 17, yPos + 2);

            doc.setTextColor(...secondaryColor);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`${product.category} | ${product.supplier}`, 17, yPos + 7);
            doc.text(`Price: ${product.price}`, 17, yPos + 12);
            doc.text(`Usage: ${product.usage}`, 17, yPos + 17);

            // Add QR code for product URL
            if (product.productUrl) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(product.productUrl, { width: 60 });
                    doc.addImage(qrDataUrl, 'PNG', pageWidth - 30, yPos - 2, 20, 20);
                } catch (error) {
                    console.error('Error generating QR code:', error);
                }
            }

            yPos += 28;
        }
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
