
// Script to inject a "broken" scan for testing
const injectBrokenScan = () => {
    const brokenScan = {
        id: 'broken-scan-123',
        timestamp: new Date().toISOString(),
        plantType: 'Tomato',
        category: 'Vegetables',
        // MISSING nutritionalIssues entirely
        healthStatus: 'Unhealthy',
        disease: 'Tomato Blight',
        severity: 'High',
        // Missing other fields to test robustness
    };

    const history = JSON.parse(localStorage.getItem('sea_plant_scan_history') || '[]');
    history.unshift(brokenScan);
    localStorage.setItem('sea_plant_scan_history', JSON.stringify(history));
    console.log('Injected broken scan: broken-scan-123');
};

injectBrokenScan();
