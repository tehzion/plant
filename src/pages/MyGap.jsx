    const generateReport = () => {
        const doc = new jsPDF();
        
        // Brand Colors
        const primaryColor = [0, 177, 79]; // #00B14F (Grab-like green)
        const secondaryColor = [232, 245, 233]; // #E8F5E9 (Light green)
        const darkColor = [28, 36, 52]; // #1C2434 (Dark text)
        const lightText = [100, 116, 139]; // #64748B (Secondary text)
        
        // --- Header Section ---
        // Green header background
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, 210, 45, 'F');
        
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
        doc.text(t('mygap.reportTitle').toUpperCase(), 42, 28);
        
        // Date Badge
        const dateStr = new Date().toLocaleDateString();
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`Date: ${dateStr}`, 160, 25);

        let yPos = 60;

        // --- Summary Stats Section ---
        const totalChecks = checklistItems.length;
        const completedChecks = Object.values(checklist).filter(Boolean).length;
        const complianceRate = Math.round((completedChecks / totalChecks) * 100);
        const totalLogs = logs.length;

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 50, 182, 25, 3, 3, 'FD');

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.text('Compliance Score', 30, 60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(`${complianceRate}%`, 30, 68);

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Checklist Status', 90, 60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${completedChecks}/${totalChecks}`, 90, 68);

        doc.setTextColor(...darkColor);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Activities', 150, 60);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totalLogs}`, 150, 68);

        yPos = 85;

        // --- Checklist Section ---
        doc.setTextColor(...darkColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('mygap.checklistTitle'), 14, yPos);
        yPos += 8;

        const checklistData = checklistItems.map(item => [
            item.label,
            checklist[item.id] ? 'COMPLIANT' : 'PENDING'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Requirement Standard', 'Status']],
            body: checklistData,
            theme: 'grid',
            headStyles: { 
                fillColor: secondaryColor, 
                textColor: primaryColor, 
                fontStyle: 'bold',
                lineWidth: 0
            },
            styles: { 
                fontSize: 10, 
                cellPadding: 6,
                lineColor: [226, 232, 240],
                textColor: darkColor
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 1) {
                    if (data.cell.raw === 'COMPLIANT') {
                        data.cell.styles.textColor = [0, 177, 79]; // Green
                    } else {
                        data.cell.styles.textColor = [239, 68, 68]; // Red
                    }
                }
            }
        });

        yPos = doc.lastAutoTable.finalY + 20;

        // --- Logbook Section ---
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 30;
        }

        doc.setTextColor(...darkColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(t('mygap.logbookSummary'), 14, yPos);
        yPos += 8;

        const logData = logs.length > 0 ? logs.slice(0, 50).map(log => [
            new Date(log.timestamp).toLocaleDateString(),
            t(`mygap.${log.type}Log`).split(' ')[0],
            log.notes
        ]) : [[ '-', '-', t('mygap.noLogs') ]];

        doc.autoTable({
            startY: yPos,
            head: [['Date', 'Type', 'Activity Notes']],
            body: logData,
            theme: 'grid',
            headStyles: { 
                fillColor: secondaryColor, 
                textColor: primaryColor, 
                fontStyle: 'bold',
                lineWidth: 0
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 5,
                lineColor: [226, 232, 240],
                textColor: lightText
            },
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 30, fontStyle: 'bold' },
                2: { cellWidth: 'auto' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        // --- Footer ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer Line
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 280, 196, 280);
            
            doc.setFontSize(8);
            doc.setTextColor(...lightText);
            doc.text(
                `Smart Plant Advisor - myGAP Compliance Report`,
                14,
                288
            );
            
            doc.text(
                `Page ${i} of ${pageCount}`,
                196,
                288,
                { align: 'right' }
            );
        }

        doc.save('myGAP_Compliance_Report.pdf');
    };