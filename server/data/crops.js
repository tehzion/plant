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
    rice: {
        commonVarieties: ['MR 219', 'MR 220 CL2', 'MR 297', 'MR 315'],
        growingRegions: ['Kedah', 'Perlis', 'Perak', 'Kelantan', 'Selangor', 'Pulau Pinang'],
        soilType: 'Clay or clay loam that holds standing water',
        climate: 'Two seasons a year in the main granary areas, irrigated',
        commonDiseases: [
            'Rice Blast - diamond or spindle-shaped lesions with grey centres and brown edges',
            'Brown Spot - small oval brown spots with grey or pale centres, often with a yellow halo',
            'Bacterial Leaf Blight - wavy yellow to white lesions spreading down from leaf tips and edges',
            'Bacterial Leaf Streak - narrow translucent streaks between veins that turn yellow-brown',
            'Sheath Blight - oval grey-green lesions with brown borders on sheaths near the water line',
            'Narrow Brown Leaf Spot - short, narrow brown streaks running along the veins',
            'Leaf Scald - zoned lesions from the leaf tip with alternating light and dark bands',
            'Tungro - yellow to orange leaves from the tip, stunting and fewer tillers (virus spread by green leafhopper)',
            'Brown Planthopper - hopperburn, round patches of plants drying brown',
            'Rice Hispa - white parallel scraping streaks and blotch mines on leaves'
        ],
        nutrientIssues: [
            'Nitrogen deficiency - older leaves pale yellow, plants thin',
            'Potassium deficiency - rusty brown leaf tips and edges on older leaves',
            'Zinc deficiency - dusty brown spots and bronzing on young plants'
        ],
        localFertilizers: ['Urea', 'NPK compound fertiliser for padi', 'Muriate of potash (MOP)'],
        harvestSeason: 'Two harvests a year in the main granary areas'
    },
    chilli: {
        commonVarieties: ['Kulai', 'MC 11', 'MC 12'],
        growingRegions: ['Johor', 'Kelantan', 'Pahang', 'Sabah'],
        soilType: 'Well-drained loam, pH 5.5-6.8',
        climate: 'Warm lowland crop, disease pressure rises in wet weather',
        commonDiseases: [
            'Anthracnose - sunken dark round fruit lesions, pale-centred leaf spots',
            'Cercospora Leaf Spot - round spots with grey-white centres and dark brown rims (frog-eye)',
            'Bacterial Leaf Spot - small water-soaked spots turning brown, leaves yellow and drop',
            'Chilli Leaf Curl Virus - leaves curl upward and inward, small puckered leaves, stunting (spread by whitefly)',
            'Chilli Mosaic Virus - light and dark green mottling and distorted leaves (spread by aphids)',
            'Powdery Mildew - white powder on leaf undersides with yellow patches above',
            'Bacterial Wilt - sudden wilting while leaves stay green',
            'Thrips damage - silvery scarring and upward curled leaves',
            'Broad Mite damage - downward curled, bronzed, brittle young leaves'
        ],
        nutrientIssues: [
            'Calcium deficiency - blossom-end rot on fruit',
            'Magnesium deficiency - yellowing between veins on older leaves',
            'Nitrogen deficiency - pale older leaves and slow growth'
        ],
        localFertilizers: ['NPK 15-15-15', 'NPK 12-12-17-2 + TE', 'Calcium nitrate'],
        harvestSeason: 'Year-round, picking from about 3 months after planting'
    },
    tomato: {
        commonVarieties: ['MT 1', 'Cameron Highlands hybrids'],
        growingRegions: ['Pahang (Cameron Highlands)', 'Sabah (Kundasang)', 'Johor'],
        soilType: 'Well-drained loam, pH 6.0-6.8',
        climate: 'Grows best in cool highlands, often under rain shelters',
        commonDiseases: [
            'Early Blight - brown spots with concentric target rings, older leaves first',
            'Late Blight - large greasy or water-soaked lesions with pale edges that spread fast',
            'Septoria Leaf Spot - many small round spots with grey centres and dark edges',
            'Bacterial Spot - small dark greasy spots, sometimes with yellow halos',
            'Target Spot - brown spots with faint rings, larger than Septoria spots',
            'Leaf Mold - yellow patches above with olive-green velvety growth underneath',
            'Tomato Yellow Leaf Curl Virus - small upward-curled yellow-edged leaves, stunting (spread by whitefly)',
            'Tomato Mosaic Virus - light and dark green mottling, fern-like distorted leaves',
            'Bacterial Wilt - sudden wilting while leaves stay green',
            'Spider Mites - fine yellow stippling and webbing on leaf undersides'
        ],
        nutrientIssues: [
            'Calcium deficiency - blossom-end rot on fruit',
            'Magnesium deficiency - yellowing between veins on older leaves',
            'Potassium deficiency - scorched leaf edges and uneven ripening'
        ],
        localFertilizers: ['NPK 15-15-15', 'NPK 12-12-17-2 + TE', 'Calcium nitrate'],
        harvestSeason: 'Year-round under rain shelters'
    },
    mango: {
        commonVarieties: ['Harumanis', 'Chokanan', 'Sala', 'Golden Lily'],
        growingRegions: ['Perlis', 'Kedah', 'Perak', 'Johor'],
        soilType: 'Deep, well-drained soil, pH 5.5-7.0',
        climate: 'Flowers best after a dry spell; wet weather at flowering raises disease',
        commonDiseases: [
            'Anthracnose - dark brown to black irregular spots on leaves, flowers and fruit',
            'Powdery Mildew - white powder on young leaves and flower panicles',
            'Bacterial Black Spot - raised black angular spots, sometimes cracked, on leaves and fruit',
            'Sooty Mould - black powdery coating on leaves, linked to sap-sucking insects',
            'Dieback - twigs dry from the tip backwards, leaves turn brown',
            'Mango Leaf Gall Midge - small raised wart-like galls on leaves',
            'Mango Leafhopper - sticky honeydew and sooty mould on flowers and leaves',
            'Scale Insects - small waxy bumps on leaves and twigs',
            'Red Rust - rusty orange algal patches on leaves'
        ],
        nutrientIssues: [
            'Nitrogen deficiency - pale older leaves and weak flushes',
            'Potassium deficiency - scorched leaf edges',
            'Zinc deficiency - small narrow leaves in rosettes'
        ],
        localFertilizers: ['NPK 15-15-15', 'NPK 12-12-17-2 + TE', 'Organic compost'],
        harvestSeason: 'Main crop around April-June in the north'
    },
    papaya: {
        commonVarieties: ['Sekaki', 'Eksotika', 'Hong Kong', 'Solo'],
        growingRegions: ['Johor', 'Perak', 'Pahang', 'Selangor', 'Sabah'],
        soilType: 'Well-drained loam or sandy loam, pH 5.5-6.7',
        climate: 'Warm lowland crop, sensitive to waterlogging and prolonged wet fruit surfaces',
        commonDiseases: [
            'Papaya Mealybug - white cottony wax on fruit, stems, and leaf undersides',
            'Scale Insect Infestation - white or brown waxy patches on fruit and stems',
            'Papaya Ringspot Virus - mosaic leaves and ring spots on fruit',
            'Anthracnose Fruit Rot - sunken dark fruit lesions in humid weather',
            'Phytophthora Stem or Fruit Rot - water-soaked rot after heavy rain',
            'Papaya Dieback - water-soaked leaf spots and crown rot that spread in wet weather (bacterial)',
            'Black Spot - small black raised spots on leaf undersides',
            'Powdery Mildew - white powdery patches on leaves',
            'Papaya Leaf Curl - leaves curl downward and become thick and leathery (virus spread by whitefly)',
            'Mite damage - yellow speckling and bronzing on leaves'
        ],
        nutrientIssues: [
            'Nitrogen deficiency - pale older leaves and weak growth',
            'Potassium deficiency - poor fruit quality and marginal leaf scorch',
            'Boron deficiency - distorted fruit and poor flowering'
        ],
        localFertilizers: ['NPK 15-15-15', 'NPK 12-12-17-2 + TE', 'Organic compost'],
        harvestSeason: 'Year-round in warm lowlands'
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
