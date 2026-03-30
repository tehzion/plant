import {
    ScanLine,
    Calendar,
    Microscope,
    FlaskConical,
    Wheat,
    MapPin,
    BarChart2,
    ShieldCheck,
} from 'lucide-react';

/**
 * Global Design Tokens for Dashboard Stats & Charts
 */
export const QUALITY_COLORS = {
    Excellent: '#10b981', // Emerald 500
    Good:      '#3b82f6', // Blue 500
    Fair:      '#f59e0b', // Amber 500
    Poor:      '#ef4444', // Red 500
};

export const EXPENSE_COLORS = {
    Fertilizer: '#10b981',
    Pesticide:  '#f59e0b',
    Labor:      '#3b82f6',
    Equipment:  '#14b8a6',
    Other:      '#64748b',
};

export const HEALTH_COLORS = {
    healthy:  '#10b981',
    diseased: '#f59e0b',
};

/**
 * Static configuration for activity types in the daily log.
 * used by ActivityForm and UserDashboardPanel.
 */
export const ACTIVITY_TYPES_CFG = [
    { value: 'note',      label: 'Note',      key: 'actNote',      chemical: false },
    { value: 'scout',     label: 'Scout',     key: 'actScout',     chemical: false },
    { value: 'spray',     label: 'Spray',     key: 'actSpray',     chemical: true  },
    { value: 'fertilize', label: 'Fertilize', key: 'actFertilize', chemical: true  },
    { value: 'prune',     label: 'Prune',     key: 'actPrune',     chemical: false },
    { value: 'inspect',   label: 'Inspect',   key: 'actInspect',   chemical: false },
    { value: 'harvest',   label: 'Harvest',   key: 'actHarvest',   chemical: false },
    { value: 'other',     label: 'Other',     key: 'actOther',     chemical: false },
];

/**
 * Quality Grades and mapping
 */
export const QUALITY_GRADES_CFG = [
    { value: 'Excellent', key: 'profile.qualityExcellent' },
    { value: 'Good',      key: 'profile.qualityGood'      },
    { value: 'Fair',      key: 'profile.qualityFair'      },
    { value: 'Poor',      key: 'profile.qualityPoor'      },
];

/**
 * Expense Categories and mapping
 */
export const EXPENSE_CATEGORIES_CFG = [
    { value: 'Fertilizer', key: 'profile.catFertilizer' },
    { value: 'Pesticide',  key: 'profile.catPesticide'  },
    { value: 'Labor',      key: 'profile.catLabor'      },
    { value: 'Equipment',  key: 'profile.catEquipment'  },
    { value: 'Other',      key: 'profile.catOther'      },
];

/**
 * Plot Units
 */
export const PLOT_UNITS_CFG = [
    { value: 'acres',    key: 'profile.acres',    label: 'Acres' },
    { value: 'sqft',     key: 'profile.sqft',     label: 'Sqft'  },
    { value: 'hectares', key: 'profile.hectares', label: 'Ha'    },
];

/**
 * Visual metadata for activity badges.
 */
export const ACTIVITY_BADGE_COLOR = {
    note:      { bg: '#f3f4f6', color: '#6b7280' },
    scout:     { bg: '#fee2e2', color: '#b91c1c' },
    spray:     { bg: '#fef9c3', color: '#b45309' },
    fertilize: { bg: '#d1fae5', color: '#065f46' },
    prune:     { bg: '#ede9fe', color: '#6d28d9' },
    inspect:   { bg: '#dbeafe', color: '#1d4ed8' },
    harvest:   { bg: '#f0fdf4', color: '#166534' },
    other:     { bg: '#f3f4f6', color: '#6b7280' },
};

/**
 * Initial empty state for the daily log form.
 */
export const EMPTY_FORM = {
    activity_type: 'note', plot_id: '', note: '',
    chemical_name: '', chemical_qty: '', application_timing: 'AM',
    temperature_am: '', humidity: '',
    growth_stage: 'Vegetative', pest_notes: '', disease_incidence: '',
    disease_name_observed: '', scout_severity: 'Low',
    kg_harvested: '', quality_grade: 'Good', price_per_kg: '', buyer_name: '',
    pruned_count: '', pruning_type: 'Thinning',
    inspection_type: 'Pest/Disease', inspection_status: 'Good',
    expense_amount: '', expense_category: 'Other',
    photo_base64: '',
};

/**
 * Dashboard Quick Actions Configuration.
 */
export const QUICK_ACTIONS = [
    {
        id: 'scan',
        icon: ScanLine,
        labelKey: 'home.newScan',
        fallback: 'Scan',
        hintKey: 'profile.quickScanHint',
        hintFallback: 'New diagnosis',
        tone: { icon: '#00B14F', bg: '#ecfdf3' },
        action: (nav) => nav('/?scan=true'),
    },
    {
        id: 'daily-log',
        icon: Calendar,
        labelKey: 'profile.tabNotes',
        fallback: 'Daily Log',
        hintKey: 'profile.quickLogHint',
        hintFallback: 'Record activity',
        tone: { icon: '#0284c7', bg: '#eff6ff' },
        action: (_, setTab, setAddingNote) => {
            setTab('notes');
            setAddingNote(true);
        },
    },
    {
        id: 'scout',
        icon: Microscope,
        labelKey: 'profile.actScout',
        fallback: 'Scout',
        hintKey: 'profile.quickScoutHint',
        hintFallback: 'Field check',
        tone: { icon: '#0f766e', bg: '#ecfeff' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('scout');
        },
    },
    {
        id: 'spray',
        icon: FlaskConical,
        labelKey: 'profile.actSpray',
        fallback: 'Spray',
        hintKey: 'profile.quickSprayHint',
        hintFallback: 'Treatment log',
        tone: { icon: '#d97706', bg: '#fff7ed' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('spray');
        },
    },
    {
        id: 'harvest',
        icon: Wheat,
        labelKey: 'profile.actHarvest',
        fallback: 'Harvest',
        hintKey: 'profile.quickHarvestHint',
        hintFallback: 'Yield update',
        tone: { icon: '#a16207', bg: '#fefce8' },
        action: (_, setTab, setAddingNote, setType) => {
            setTab('notes');
            setAddingNote(true);
            setType('harvest');
        },
    },
    {
        id: 'plots',
        icon: MapPin,
        labelKey: 'profile.tabPlots',
        fallback: 'Plots',
        hintKey: 'profile.quickPlotsHint',
        hintFallback: 'Map new block',
        tone: { icon: '#f59e0b', bg: '#fffbeb' },
        action: (_, setTab, setAddingNote, setType, setAddingPlot) => {
            setTab('plots');
            setAddingPlot(true);
        },
    },
];

/**
 * Fallback values for dashboard statistics when data is missing.
 */
export const STATS_FALLBACK = {
    overview: [
        { labelKey: 'profile.statsScans', fallback: 'Total Scans', count: 0, icon: ScanLine, color: '#00B14F' },
        { labelKey: 'profile.statsActive', fallback: 'Alerts', count: 0, icon: BarChart2, color: '#f59e0b' },
    ]
};
