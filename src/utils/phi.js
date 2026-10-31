// The waiting-period rules live in shared/mygapCompliance.js so the PHI
// calculator, the logbook and the report always agree.
export { MAX_PHI_DAYS, parsePhiDays as parsePHIDays, addDays } from '../../shared/mygapCompliance.js';
import { addDays } from '../../shared/mygapCompliance.js';

export const calculateSafeHarvestDate = (days, from = new Date()) => addDays(from, days);
