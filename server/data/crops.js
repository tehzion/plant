// Malaysia-specific agricultural knowledge base
export const MALAYSIA_CROP_KNOWLEDGE = {
    durian: {
        commonVarieties: ['Musang King', 'D24', 'Black Thorn', 'Red Prawn', 'XO'],
        growingRegions: ['Pahang', 'Johor', 'Penang', 'Kedah'],
        soilType: 'Deep, well-drained loamy soil with pH 5.5-6.5',
        climate: 'Requires 1,500-2,500mm annual rainfall, temperature 24-30°C',
        commonDiseases: [
            'Phytophthora Root Rot - caused by waterlogged conditions during monsoon',
            'Stem Canker - fungal infection common in humid seasons',
            'Pink Disease - affects branches, spreads during rainy season'
        ],
        nutrientIssues: [
            'Boron deficiency - causes fruit drop and poor flowering',
            'Potassium deficiency - reduces fruit quality and shelf life',
            'Magnesium deficiency - yellowing between leaf veins'
        ],
        localFertilizers: ['NPK Sarawak 12-12-17', 'Baja Organik Felda', 'Guano Phosphate'],
        harvestSeason: 'June-August (main), December-February (minor)'
    },
    rubber: {
        commonVarieties: ['RRIM 600', 'RRIM 2000', 'RRIM 3000', 'PB 260'],
        growingRegions: ['Kedah', 'Perak', 'Negeri Sembilan', 'Johor', 'Pahang'],
        soilType: 'Well-drained laterite or alluvial soil, pH 4.5-6.5',
        climate: 'Requires 2,000-2,500mm rainfall, temperature 25-35°C',
        commonDiseases: [
            'Pink Disease (Corticium salmonicolor) - major issue in wet season',
            'White Root Disease - causes tree decline, common in older plantations',
            'Powdery Mildew - affects young leaves during dry periods',
            'Corynespora Leaf Fall - severe during monsoon transitions'
        ],
        nutrientIssues: [
            'Nitrogen deficiency - reduces latex yield significantly',
            'Phosphorus deficiency - poor root development',
            'Potassium deficiency - affects latex quality'
        ],
        localFertilizers: ['NPK FELDA 15-15-15', 'Rock Phosphate Bukit Merah', 'Kieserite'],
        tappingSeason: 'Year-round but yield peaks during dry months'
    },
    banana: {
        commonVarieties: ['Pisang Berangan', 'Cavendish', 'Pisang Mas', 'Pisang Raja'],
        growingRegions: ['Nationwide - all states suitable'],
        soilType: 'Deep alluvial soil with good drainage, pH 5.5-7.0',
        climate: 'Grows well in lowlands, requires 1,200-1,500mm rainfall',
        commonDiseases: [
            'Panama Disease (Fusarium Wilt Race 4) - major threat to Cavendish',
            'Black Sigatoka - leaf spot disease, severe in humid conditions',
            'Banana Bunchy Top Virus - spread by aphids',
            'Bacterial Soft Rot - common during wet season'
        ],
        nutrientIssues: [
            'Potassium deficiency - MOST COMMON, causes leaf margin yellowing',
            'Nitrogen deficiency - stunted growth, pale leaves',
            'Magnesium deficiency - premature yellowing'
        ],
        localFertilizers: ['NPK MARDI 15-15-15', 'Muriate of Potash (KCl)', 'Dolomite'],
        harvestSeason: 'Year-round with 9-12 month cycle'
    },
    coconut: {
        commonVarieties: ['Malayan Tall', 'Malayan Dwarf', 'MAWA Hybrid'],
        growingRegions: ['Coastal areas - Kedah, Perak, Terengganu, Sabah, Sarawak'],
        soilType: 'Sandy loam or laterite, pH 5.5-7.5, salt-tolerant',
        climate: 'Requires 1,500-2,500mm rainfall, thrives in coastal humidity',
        commonDiseases: [
            'Ganoderma Basal Stem Rot - major killer, no cure',
            'Bud Rot - bacterial/fungal infection of growing point',
            'Leaf Blight - fungal infection during monsoon',
            'Lethal Yellowing - phytoplasma disease'
        ],
        nutrientIssues: [
            'Boron deficiency - causes abnormal nuts and reduced yield',
            'Chlorine deficiency - leaf tip necrosis',
            'Potassium deficiency - yellowing fronds'
        ],
        localFertilizers: ['NPK Coconut Blend 12-4-24', 'Borax', 'Kieserite'],
        harvestSeason: 'Year-round harvest every 45-60 days'
    },
    oil_palm: {
        commonVarieties: ['Tenera (DxP)', 'FELDA Elite Series', 'Sime Darby Hybrids'],
        growingRegions: ['Sabah', 'Sarawak', 'Johor', 'Pahang', 'Perak'],
        soilType: 'Deep alluvial or coastal clay, pH 4.0-6.0',
        climate: 'Requires 2,000-2,500mm rainfall evenly distributed',
        commonDiseases: [
            'Ganoderma (BSR) - most serious disease, causes tree death',
            'Curvularia Leaf Spot - common in nurseries',
            'Fusarium Wilt - affects young palms',
            'Blast Disease - stunted growth in mature palms'
        ],
        nutrientIssues: [
            'Boron deficiency - hook leaf, short fronds',
            'Nitrogen deficiency - reduced frond production',
            'Potassium deficiency - orange frond, yield reduction'
        ],
        localFertilizers: ['NPK MPOB 12-12-17-2', 'EFB (Empty Fruit Bunch) compost', 'Kieserite'],
        harvestSeason: 'Continuous harvesting every 10-14 days'
    }
};

// Malaysia monsoon and climate information
export const MALAYSIA_CLIMATE = {
    monsoonSeasons: {
        northeastMonsoon: {
            period: 'November - March',
            affected: 'East Coast (Kelantan, Terengganu, Pahang)',
            rainfall: 'Heavy rainfall 2,500-3,000mm',
            plantCare: 'Ensure good drainage, reduce fertilizer application, watch for fungal diseases'
        },
        southwestMonsoon: {
            period: 'May - September',
            affected: 'West Coast and inland areas',
            rainfall: 'Moderate 1,500-2,000mm',
            plantCare: 'Peak growth period, increase fertilization, optimal for planting'
        },
        interMonsoon: {
            periods: 'April & October',
            rainfall: 'High rainfall with thunderstorms',
            plantCare: 'High disease pressure, apply preventive fungicides'
        }
    },
    regionalConsiderations: {
        eastCoast: 'Prepare for extended wet period Nov-Jan, improve drainage systems',
        westCoast: 'More stable year-round, peak growth May-Sep',
        sabahSarawak: 'No distinct dry season, continuous high humidity, disease pressure year-round',
        highlands: 'Lower temperatures, different disease profiles, modified fertilizer requirements'
    }
};

// Malaysian agricultural supplier information
export const MALAYSIA_SUPPLIERS = {
    fertilizers: [
        'Baja Kimia Malaysia (locations nationwide)',
        'Petronas Chemicals Fertilizer (NPK blends)',
        'FELDA Fertilizer (oil palm specialists)',
        'Ban Soon Hoe (Penang, Kedah)',
        'Kim Hin Joo (Johor, Selangor)'
    ],
    pesticides: [
        'FMC Agricultural Solutions Malaysia',
        'Bayer CropScience Malaysia',
        'Syngenta Malaysia',
        'Local: Kumpulan Sasbadi (East Malaysia)'
    ],
    govtAgencies: [
        'DOA - Department of Agriculture (every district)',
        'MARDI - Malaysian Agricultural Research Institute',
        'MPOB - Malaysian Palm Oil Board',
        'MPIC - Malaysian Pineapple Industry Board',
        'LGM - Malaysian Rubber Board'
    ]
};
