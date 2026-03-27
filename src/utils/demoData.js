/**
 * Realistic mock data for the demo user (test@test.com)
 * used to seed the dashboard if local database is empty.
 */

export const DEMO_SCANS = [
    {
        id: 'demo-scan-1',
        disease: 'Leaf Rust',
        healthStatus: 'unhealthy',
        severity: 'moderate',
        category: 'Fruits',
        plantType: 'Durian',
        confidence: 94,
        locationName: 'Bentong, Pahang',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
        image_url: 'https://images.unsplash.com/photo-1596436805366-51d293d5616b?w=400&q=80',
        additionalNotes: 'Detected early signs of Phakopsora pachyrhizi on lower leaves.'
    },
    {
        id: 'demo-scan-2',
        disease: 'Healthy',
        healthStatus: 'healthy',
        severity: 'low',
        category: 'Fruits',
        plantType: 'Durian',
        confidence: 98,
        locationName: 'Bentong, Pahang',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
        image_url: null,
        additionalNotes: 'Tree appears vigorous. High chlorophyll content noted.'
    },
    {
        id: 'demo-scan-3',
        disease: 'Stem Borer',
        healthStatus: 'unhealthy',
        severity: 'severe',
        category: 'Fruits',
        plantType: 'Coconut',
        confidence: 89,
        locationName: 'Kuala Selangor, Selangor',
        created_at: new Date(Date.now() - 8 * 86400000).toISOString(), // 8 days ago
        image_url: 'https://images.unsplash.com/photo-1596003906949-67221c37965c?w=400&q=80',
        additionalNotes: 'Visible entry holes in the trunk. Recommend pesticide application.'
    }
];

export const DEMO_NOTES = [
    {
        id: 'demo-note-1',
        activity_type: 'harvest',
        note: 'Harvested D24 Durian from Plot A. High quality fruit.',
        kg_harvested: 150,
        quality_grade: 'Grade A',
        price_per_kg: 45,
        created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
        id: 'demo-note-2',
        activity_type: 'fertilize',
        note: 'Applied NPK 15-15-15 to Durian trees in Plot B.',
        chemical_name: 'NPK 15-15-15',
        chemical_qty: '50kg',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
        id: 'demo-note-3',
        activity_type: 'scout',
        note: 'Found high disease incidence in the north corner.',
        disease_incidence: 15,
        scout_severity: 'Moderate',
        disease_name_observed: 'Leaf Rust',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    }
];

export const DEMO_PLOTS = [
    {
        id: 'demo-plot-1',
        name: 'Durian Orchard A',
        crop_type: 'Durian',
        area: 5,
        unit: 'acres',
        soil_ph: 6.2,
        npk_n: 45,
        npk_p: 30,
        npk_k: 40,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
        id: 'demo-plot-2',
        name: 'Coconut Grove',
        crop_type: 'Coconut',
        area: 3,
        unit: 'acres',
        soil_ph: 6.5,
        created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    }
];
export const DEMO_LOGBOOK = [
    {
        id: 'demo-log-1',
        type: 'Harvest',
        notes: 'D24 Durian Harvested from Plot A.',
        timestamp: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
        id: 'demo-log-2',
        type: 'Fertilizer',
        notes: 'Applied NPK 15-15-15 to Plot B.',
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
        id: 'demo-log-3',
        type: 'Scout',
        notes: 'Autonomous scouting via AI Scan: Leaf Rust (unhealthy)',
        timestamp: new Date(Date.now() - 4 * 86400000).toISOString()
    }
];
