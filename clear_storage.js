
// Script to clear localStorage for stability reset
const clearStorage = () => {
    try {
        localStorage.removeItem('sea_plant_scan_history');
        console.log('Successfully cleared old scan history.');
    } catch (e) {
        console.error('Failed to clear storage:', e);
    }
};

clearStorage();
