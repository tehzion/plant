import OpenAI from 'openai';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';
import { MALAYSIA_CROP_KNOWLEDGE, MALAYSIA_SUPPLIERS } from '../data/crops.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Cache GPT-5 mini product recommendations for 1 hour
const recommendationCache = new NodeCache({ stdTTL: 3600 });

/**
 * Helper function to call PlantNet API
 */
export async function identifyPlantWithPlantNet(imageBase64) {
    try {
        console.log('🔍 Identifying plant species...');

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('images', imageBuffer, {
            filename: 'plant.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('organs', 'leaf');

        const response = await fetch(
            `https://my-api.plantnet.org/v2/identify/all?api-key=${process.env.PLANTNET_API_KEY}`,
            {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const bestMatch = data.results[0];
            const result = {
                scientificName: bestMatch.species.scientificNameWithoutAuthor,
                commonNames: bestMatch.species.commonNames || [],
                family: bestMatch.species.family?.scientificNameWithoutAuthor || 'Unknown',
                genus: bestMatch.species.genus?.scientificNameWithoutAuthor || 'Unknown',
                confidence: Math.round(bestMatch.score * 100),
                allMatches: data.results.slice(0, 5).map(match => ({
                    name: match.species.scientificNameWithoutAuthor,
                    commonNames: match.species.commonNames || [],
                    confidence: Math.round(match.score * 100)
                }))
            };

            console.log(`✅ Species identified: ${result.scientificName}`);
            return result;
        } else {
            console.warn('⚠️ No species matches found');
            return null;
        }

    } catch (error) {
        console.error('❌ Primary identification method failed');
        return null;
    }
}

// Helper to clean JSON string from Markdown
function cleanJsonString(str) {
    if (!str) return '';
    // Remove markdown code blocks
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '');
    return cleaned.trim();
}

const GENERIC_PRODUCT_TERMS = new Set([
    'chemical',
    'chemicals',
    'kimia',
    'organic',
    'organik',
    'fertilizer',
    'fertilisers',
    'fertiliser',
    'baja',
    'pesticide',
    'racun',
    'fungicide',
    'insecticide',
    'herbicide',
    'product',
    'produk',
    'unknown',
    'tidak diketahui',
    'n/a',
    'na',
    'none',
    'null',
    '-',
]);

const normalizeLookupText = (value = '') =>
    String(value)
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s/%+-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const PRODUCT_WORD_BLOCKLIST = new Set([
    'chemical',
    'chemicals',
    'kimia',
    'organic',
    'organik',
    'fertilizer',
    'fertilisers',
    'fertiliser',
    'baja',
    'pesticide',
    'racun',
    'fungicide',
    'insecticide',
    'herbicide',
    'product',
    'produk',
    'unknown',
    'tidak',
    'diketahui',
    'none',
    'null',
    'na',
    'n/a',
]);

export function isGenericProductName(name) {
    const normalized = normalizeLookupText(name);
    if (!normalized) return true;
    if (GENERIC_PRODUCT_TERMS.has(normalized)) return true;

    const words = normalized.split(' ').filter(Boolean);
    return words.length > 0 && words.every((word) => PRODUCT_WORD_BLOCKLIST.has(word));
}

const translateText = (language, variants) => {
    if (language === 'ms') return variants.ms;
    if (language === 'zh') return variants.zh;
    return variants.en;
};

const inferDeficiencyKeyword = (result = {}) => {
    const joined = [
        result?.disease,
        result?.additionalNotes,
        result?.pathogenType,
        ...(result?.nutritionalIssues?.deficientNutrients || []).map((item) => item?.nutrient),
        ...(result?.nutritionalIssues?.symptoms || []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    if (joined.includes('nitrogen') || joined.includes('nitrogen deficiency')) return 'nitrogen';
    if (joined.includes('potassium') || joined.includes('kalium')) return 'potassium';
    if (joined.includes('magnesium')) return 'magnesium';
    if (joined.includes('phosphorus') || joined.includes('phosphate')) return 'phosphorus';
    if (joined.includes('boron')) return 'boron';
    if (joined.includes('calcium')) return 'calcium';
    if (joined.includes('iron')) return 'iron';
    return null;
};

const getFallbackFertilizerNames = (language, malaysiaCropInfo, result = {}) => {
    const deficiency = inferDeficiencyKeyword(result);
    const cropSpecific = malaysiaCropInfo?.info?.localFertilizers || [];
    const defaultsByDeficiency = {
        nitrogen: ['Urea 46%', 'NPK 21-0-0+24S', 'Ammonium Sulphate'],
        potassium: ['MOP (Muriate of Potash)', 'NPK 12-12-17+2MgO', 'SOP (Sulphate of Potash)'],
        magnesium: ['Kieserite', 'Dolomite', 'NPK 12-12-17+2MgO'],
        phosphorus: ['Rock Phosphate', 'MAP (Monoammonium Phosphate)', 'NPK 15-15-15'],
        boron: ['Borax', 'Solubor', 'NPK 12-12-17+2MgO'],
        calcium: ['Calcium Nitrate', 'Agricultural Lime', 'Calcium Borate'],
        iron: ['Chelated Iron (Fe-EDTA)', 'Ferrous Sulphate', 'Micronutrient Foliar Mix'],
    };
    const generalDefaults = [
        ...cropSpecific,
        'NPK 15-15-15',
        'Baja Organik Ayam',
        'Kieserite',
    ];

    const base = deficiency ? (defaultsByDeficiency[deficiency] || generalDefaults) : generalDefaults;
    const unique = [...new Set([...base, ...cropSpecific].filter(Boolean))].slice(0, 3);
    return unique.length > 0 ? unique : ['NPK 15-15-15', 'Baja Organik Ayam'];
};

const getFallbackApplicationMethod = (language) => translateText(language, {
    en: 'Apply evenly around the drip line and water in after application',
    ms: 'Tabur sekata di keliling kanopi dan siram selepas aplikasi',
    zh: '沿树冠滴水线均匀施用，并在施肥后浇水',
});

const getFallbackFrequency = (language) => translateText(language, {
    en: 'Every 2-4 weeks depending on crop stage',
    ms: 'Setiap 2-4 minggu mengikut peringkat tanaman',
    zh: '根据作物生长阶段每2到4周施用一次',
});

const getFallbackAmount = (language) => translateText(language, {
    en: 'Follow label rate or local extension guidance',
    ms: 'Ikut kadar label atau panduan pegawai pertanian tempatan',
    zh: '按产品标签剂量或当地农技指导施用',
});

const clampConfidence = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(100, Math.round(numeric)));
};

const normalizeArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
        return value
            .split(/\r?\n|•|;/g)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const normalizeDiseaseCategory = (value = '') => {
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return 'unknown';
    if (normalized.includes('nutri')) return 'nutrient';
    if (normalized.includes('fung')) return 'fungal';
    if (normalized.includes('bacter')) return 'bacterial';
    if (normalized.includes('viral') || normalized.includes('virus')) return 'viral';
    if (normalized.includes('pest') || normalized.includes('insect')) return 'pest';
    if (normalized.includes('healthy')) return 'healthy';
    if (normalized.includes('environment')) return 'environmental';
    return normalized;
};

const buildNoIssuesLabel = (language) => translateText(language, {
    en: 'No Issues',
    ms: 'Tiada Masalah',
    zh: '无问题',
});

const buildRetakeGuidance = (language) => translateText(language, {
    en: 'Please retake a closer, brighter leaf photo before applying treatment.',
    ms: 'Sila ambil semula foto daun yang lebih dekat dan lebih terang sebelum membuat rawatan.',
    zh: '请先重新拍摄一张更近、更明亮的叶片照片，再决定处理方案。',
});

const buildGeneralDiagnosisFallback = (language) => translateText(language, {
    en: 'The image suggests a plant issue, but the evidence is not strong enough to confirm a single diagnosis yet.',
    ms: 'Imej ini menunjukkan kemungkinan isu tanaman, tetapi bukti masih belum cukup kuat untuk mengesahkan satu diagnosis.',
    zh: '图像显示植物可能存在问题，但证据仍不足以确认单一诊断。',
});

const buildRetakeActionItems = (language) => ([
    translateText(language, {
        en: 'Retake the photo in bright natural light',
        ms: 'Ambil semula foto dalam cahaya semula jadi yang terang',
        zh: '请在明亮自然光下重新拍照',
    }),
    translateText(language, {
        en: 'Fill most of the frame with one affected leaf',
        ms: 'Pastikan satu daun yang terjejas memenuhi kebanyakan bingkai',
        zh: '让一片受影响叶片占据画面的大部分',
    }),
    translateText(language, {
        en: 'Add a second close-up if the spots are small',
        ms: 'Tambah satu lagi foto dekat jika tompok sangat kecil',
        zh: '如果病斑很小，请再添加一张近距离照片',
    }),
]);

const buildRetakePrevention = (language) => ([
    translateText(language, {
        en: 'Avoid spraying until the diagnosis is clearer',
        ms: 'Elakkan semburan sehingga diagnosis lebih jelas',
        zh: '在诊断更明确前，避免贸然喷药',
    }),
    translateText(language, {
        en: 'Monitor nearby leaves for the same pattern',
        ms: 'Pantau daun berhampiran untuk corak yang sama',
        zh: '观察附近叶片是否出现相同症状',
    }),
]);

export function assessSpeciesIdentification(plantNetResult, category = '') {
    if (!plantNetResult) {
        return {
            confirmed: false,
            confidence: 55,
            margin: 0,
            primaryName: category || 'Unknown crop',
            scientificName: null,
            topCandidates: category ? [{ name: category, confidence: 55 }] : [],
        };
    }

    const confidence = clampConfidence(plantNetResult.confidence ?? plantNetResult.score, 0);
    const allMatches = Array.isArray(plantNetResult.allMatches)
        ? plantNetResult.allMatches
            .map((match, index) => ({
                name: match?.name || match?.scientificName || (index === 0 ? plantNetResult.scientificName : ''),
                commonNames: Array.isArray(match?.commonNames) ? match.commonNames : [],
                confidence: clampConfidence(match?.confidence, 0),
            }))
            .filter((match) => match.name)
        : [];

    const normalizedMatches = allMatches.length > 0
        ? allMatches
        : [{
            name: plantNetResult.scientificName,
            commonNames: plantNetResult.commonNames || [],
            confidence,
        }];

    const secondConfidence = normalizedMatches[1]?.confidence ?? 0;
    const margin = confidence - secondConfidence;
    const confirmed = confidence >= 60 && margin >= 15;
    const primaryCommon = plantNetResult.commonNames?.[0] || category || plantNetResult.scientificName;

    return {
        confirmed,
        confidence,
        margin,
        primaryName: primaryCommon,
        scientificName: plantNetResult.scientificName,
        topCandidates: normalizedMatches.slice(0, 3),
    };
}

const getSpeciesContextBlock = (speciesAssessment, plantNetResult, category, language) => {
    if (!speciesAssessment || !plantNetResult) {
        return translateText(language, {
            en: `Crop category hint: ${category || 'Unknown crop'}. Treat this as a hint, not a confirmed species.`,
            ms: `Petunjuk kategori tanaman: ${category || 'Tanaman tidak diketahui'}. Anggap ini sebagai petunjuk sahaja, bukan spesies yang disahkan.`,
            zh: `作物类别提示：${category || '未知作物'}。请仅将其视为提示，不要当作已确认物种。`,
        });
    }

    const candidateLines = speciesAssessment.topCandidates
        .map((candidate) => `- ${candidate.name} (${candidate.confidence}%)`)
        .join('\n');

    if (speciesAssessment.confirmed) {
        return translateText(language, {
            en: `Species context: treat ${plantNetResult.scientificName} as the likely crop. Confidence ${speciesAssessment.confidence}% with ${speciesAssessment.margin}% gap to the next candidate.\nTop candidates:\n${candidateLines}`,
            ms: `Konteks spesies: anggap ${plantNetResult.scientificName} sebagai tanaman yang paling mungkin. Keyakinan ${speciesAssessment.confidence}% dengan jurang ${speciesAssessment.margin}% berbanding calon kedua.\nCalon teratas:\n${candidateLines}`,
            zh: `物种上下文：可将 ${plantNetResult.scientificName} 视为最可能的作物。置信度 ${speciesAssessment.confidence}% ，且领先下一候选 ${speciesAssessment.margin}% 。\n候选列表：\n${candidateLines}`,
        });
    }

    return translateText(language, {
        en: `Species context is weak. Do NOT treat any species as confirmed. Use these only as hypotheses plus the user-selected category "${category || 'Unknown crop'}".\nTop candidates:\n${candidateLines}`,
        ms: `Spesies masih tidak pasti. JANGAN anggap mana-mana spesies sebagai disahkan. Gunakan senarai ini hanya sebagai hipotesis bersama kategori pengguna "${category || 'Tanaman tidak diketahui'}".\nCalon teratas:\n${candidateLines}`,
        zh: `物种判断较弱。请不要把任何物种当作已确认结果，只能把它们当作假设，并结合用户选择的类别“${category || '未知作物'}”。\n候选列表：\n${candidateLines}`,
    });
};

const buildImageQualityContext = (imageQuality = {}, language = 'en') => {
    if (!imageQuality || typeof imageQuality !== 'object') return '';

    const tree = imageQuality.tree || {};
    const leaf = imageQuality.leaf || {};
    const lines = [];

    if (Number.isFinite(tree.brightness)) {
        lines.push(`Tree image brightness: ${tree.brightness.toFixed(1)} / 255`);
    }
    if (Number.isFinite(tree.blurScore)) {
        lines.push(`Tree image detail score: ${tree.blurScore.toFixed(1)}`);
    }
    if (Number.isFinite(tree.greenRatio)) {
        lines.push(`Tree image green ratio: ${(tree.greenRatio * 100).toFixed(1)}%`);
    }
    if (tree.primaryIssue) {
        lines.push(`Tree image quality flag: ${tree.primaryIssue}`);
    }
    if (leaf.primaryIssue) {
        lines.push(`Leaf image quality flag: ${leaf.primaryIssue}`);
    }

    if (lines.length === 0) return '';

    const label = translateText(language, {
        en: 'Frontend image-quality hints',
        ms: 'Petunjuk kualiti imej dari frontend',
        zh: '前端图像质量提示',
    });

    return `${label}:\n${lines.map((line) => `- ${line}`).join('\n')}`;
};

export function normalizeParsedLogResult(parsed = {}) {
    const normalizedChemical = isGenericProductName(parsed.chemicalName) ? null : parsed.chemicalName;
    return {
        ...parsed,
        chemicalName: normalizedChemical,
    };
}

export function normalizeAnalysisResult(result = {}, language = 'en', malaysiaCropInfo = null) {
    const fallbackNames = getFallbackFertilizerNames(language, malaysiaCropInfo, result);
    const originalRecommendations = Array.isArray(result.fertilizerRecommendations)
        ? result.fertilizerRecommendations
        : [];

    const normalizedRecommendations = originalRecommendations.map((entry, index) => {
        const safeName = isGenericProductName(entry?.fertilizerName)
            ? fallbackNames[index] || fallbackNames[0]
            : entry.fertilizerName;

        return {
            fertilizerName: safeName,
            type: entry?.type || 'Chemical',
            applicationMethod: entry?.applicationMethod || getFallbackApplicationMethod(language),
            frequency: entry?.frequency || getFallbackFrequency(language),
            amount: entry?.amount || getFallbackAmount(language),
        };
    });

    if (normalizedRecommendations.length === 0 && result?.nutritionalIssues?.hasDeficiency) {
        fallbackNames.slice(0, 2).forEach((name) => {
            normalizedRecommendations.push({
                fertilizerName: name,
                type: 'Chemical',
                applicationMethod: getFallbackApplicationMethod(language),
                frequency: getFallbackFrequency(language),
                amount: getFallbackAmount(language),
            });
        });
    }

    return {
        ...result,
        fertilizerRecommendations: normalizedRecommendations,
    };
}

const buildFewShotExampleObject = (language, type) => {
    const templates = {
        healthy: {
            disease: translateText(language, { en: 'No Issues', ms: 'Tiada Masalah', zh: '无问题' }),
            additionalNotes: translateText(language, {
                en: 'Leaves look vibrant and evenly colored, so the plant appears healthy and actively growing.',
                ms: 'Daun kelihatan segar dan warnanya sekata, jadi tanaman ini nampak sihat dan sedang membesar dengan baik.',
                zh: '叶片颜色均匀且有活力，因此植株看起来健康并保持良好生长。',
            }),
            healthStatus: 'healthy',
            severity: 'mild',
            confidence: 91,
            pathogenType: 'None',
            symptoms: [
                translateText(language, { en: 'Even green foliage', ms: 'Daun hijau sekata', zh: '叶色均匀翠绿' }),
                translateText(language, { en: 'No visible lesions', ms: 'Tiada lesi kelihatan', zh: '未见明显病斑' }),
            ],
            actions: [
                translateText(language, { en: 'Maintain regular irrigation', ms: 'Teruskan pengairan berkala', zh: '保持规律灌溉' }),
                translateText(language, { en: 'Continue weekly scouting', ms: 'Teruskan pemantauan mingguan', zh: '继续每周巡查' }),
            ],
            treatments: [
                translateText(language, { en: 'No curative treatment needed', ms: 'Tiada rawatan pemulihan diperlukan', zh: '无需治疗性处理' }),
                translateText(language, { en: 'Use balanced maintenance fertilizer only', ms: 'Gunakan baja penyelenggaraan seimbang sahaja', zh: '仅施用均衡维护肥即可' }),
            ],
            prevention: [
                translateText(language, { en: 'Keep canopy ventilated', ms: 'Pastikan kanopi mempunyai pengudaraan baik', zh: '保持树冠通风' }),
                translateText(language, { en: 'Avoid waterlogging after heavy rain', ms: 'Elakkan takungan air selepas hujan lebat', zh: '大雨后避免积水' }),
            ],
            deficiency: false,
            fertilizers: ['NPK 15-15-15', 'Baja Organik Ayam'],
            productSearchTags: ['fertilizer', 'foliar-feed'],
        },
        fungal: {
            disease: translateText(language, { en: 'Leaf Spot', ms: 'Bintik Daun', zh: '叶斑病' }),
            additionalNotes: translateText(language, {
                en: 'We estimate a fungal leaf spot because the lesions are circular with dark margins and scattered across older leaves.',
                ms: 'Kami anggarkan ini ialah bintik daun kulat kerana lesi berbentuk bulat dengan tepi gelap pada daun tua.',
                zh: '我们推测这是真菌性叶斑，因为病斑呈圆形并带有深色边缘，集中在较老叶片上。',
            }),
            healthStatus: 'unhealthy',
            severity: 'moderate',
            confidence: 88,
            pathogenType: 'Fungal',
            symptoms: [
                translateText(language, { en: 'Circular brown lesions', ms: 'Lesi bulat berwarna perang', zh: '圆形褐色病斑' }),
                translateText(language, { en: 'Yellow halo around spots', ms: 'Halo kuning di sekeliling tompok', zh: '病斑周围有黄晕' }),
            ],
            actions: [
                translateText(language, { en: 'Prune badly affected leaves', ms: 'Pangkas daun yang teruk terjejas', zh: '修剪受害严重的叶片' }),
                translateText(language, { en: 'Improve airflow before next rain event', ms: 'Baiki pengudaraan sebelum hujan seterusnya', zh: '在下一轮降雨前改善通风' }),
            ],
            treatments: [
                translateText(language, { en: 'Apply Mancozeb foliar spray', ms: 'Lakukan semburan daun Mancozeb', zh: '喷施代森锰锌叶面药剂' }),
                translateText(language, { en: 'Repeat with copper fungicide if pressure stays high', ms: 'Ulang dengan racun kulat kuprum jika tekanan penyakit kekal tinggi', zh: '若病压持续偏高，可重复使用铜制杀菌剂' }),
            ],
            prevention: [
                translateText(language, { en: 'Avoid overhead irrigation late in the day', ms: 'Elakkan pengairan renjis lewat petang', zh: '避免傍晚进行高位喷灌' }),
                translateText(language, { en: 'Remove infected debris from the field', ms: 'Buang sisa berpenyakit dari kebun', zh: '清除田间带病残体' }),
            ],
            deficiency: false,
            fertilizers: ['NPK 15-15-15', 'Kieserite'],
            productSearchTags: ['fungicide', 'mancozeb', 'copper'],
        },
        nutrient: {
            disease: translateText(language, { en: 'Potassium Deficiency', ms: 'Kekurangan Kalium', zh: '缺钾' }),
            additionalNotes: translateText(language, {
                en: 'We estimate a potassium deficiency because the leaf edges are yellowing and scorching first on older leaves.',
                ms: 'Kami anggarkan kekurangan kalium kerana tepi daun menguning dan terbakar pada daun tua terlebih dahulu.',
                zh: '我们推测是缺钾，因为较老叶片边缘先出现黄化和焦枯。',
            }),
            healthStatus: 'unhealthy',
            severity: 'moderate',
            confidence: 86,
            pathogenType: 'Nutritional',
            symptoms: [
                translateText(language, { en: 'Leaf margin yellowing', ms: 'Tepi daun menguning', zh: '叶缘黄化' }),
                translateText(language, { en: 'Scorching on older leaves', ms: 'Kesan terbakar pada daun tua', zh: '老叶边缘焦枯' }),
            ],
            actions: [
                translateText(language, { en: 'Correct the potassium shortage promptly', ms: 'Betulkan kekurangan kalium dengan segera', zh: '尽快纠正缺钾问题' }),
                translateText(language, { en: 'Check drainage to avoid root stress', ms: 'Semak saliran untuk elak tekanan akar', zh: '检查排水以避免根系受压' }),
            ],
            treatments: [
                translateText(language, { en: 'Apply MOP around the root zone', ms: 'Tabur MOP di zon akar', zh: '在根区施用氯化钾' }),
                translateText(language, { en: 'Follow with balanced NPK after recovery', ms: 'Susuli dengan NPK seimbang selepas pemulihan', zh: '恢复后再补施均衡复合肥' }),
            ],
            prevention: [
                translateText(language, { en: 'Track leaf symptoms by age', ms: 'Pantau simptom mengikut umur daun', zh: '按叶龄追踪症状变化' }),
                translateText(language, { en: 'Use scheduled soil and leaf analysis', ms: 'Gunakan analisis tanah dan daun secara berkala', zh: '定期进行土壤和叶片分析' }),
            ],
            deficiency: true,
            fertilizers: ['MOP (Muriate of Potash)', 'NPK 12-12-17+2MgO'],
            productSearchTags: ['potash', 'fertilizer', 'npk-12-12-17'],
        },
    };

    const selected = templates[type];

    return {
        diagnosticReasoning: {
            leafLocationAnalysis: selected.deficiency
                ? translateText(language, { en: 'Symptoms start on older leaves', ms: 'Gejala bermula pada daun tua', zh: '症状先出现在老叶上' })
                : translateText(language, { en: 'Symptoms are scattered on mature leaves', ms: 'Gejala bertabur pada daun matang', zh: '症状分布在成熟叶片上' }),
            symptomPatternAnalysis: selected.deficiency
                ? translateText(language, { en: 'Marginal yellowing and scorch pattern fits potassium stress', ms: 'Corak kekuningan tepi daun sesuai dengan tekanan kalium', zh: '叶缘黄化和焦枯符合缺钾特征' })
                : translateText(language, { en: 'Spot pattern suggests a fungal lesion', ms: 'Corak tompok menunjukkan lesi kulat', zh: '病斑形态提示真菌性病斑' }),
            lesionAnalysis: type === 'healthy'
                ? translateText(language, { en: 'No lesion or necrotic area detected', ms: 'Tiada lesi atau kawasan nekrosis dikesan', zh: '未检测到病斑或坏死区域' })
                : translateText(language, { en: 'Round lesions with dark border are visible', ms: 'Lesi bulat dengan sempadan gelap kelihatan', zh: '可见带深色边缘的圆形病斑' }),
            conclusion: selected.additionalNotes,
        },
        disease: selected.disease,
        additionalNotes: selected.additionalNotes,
        healthStatus: selected.healthStatus,
        severity: selected.severity,
        confidence: selected.confidence,
        plantType: translateText(language, {
            en: 'Durian (Durio zibethinus)',
            ms: 'Durian (Durio zibethinus)',
            zh: '榴莲 (Durio zibethinus)',
        }),
        malaysianContext: {
            variety: translateText(language, { en: 'Musang King', ms: 'Musang King', zh: '猫山王' }),
            region: translateText(language, { en: 'Pahang and Johor', ms: 'Pahang dan Johor', zh: '彭亨与柔佛' }),
            seasonalConsideration: translateText(language, {
                en: 'Monitor humidity during monsoon transitions',
                ms: 'Pantau kelembapan semasa peralihan monsun',
                zh: '在季风转换期密切留意湿度变化',
            }),
        },
        pathogenType: selected.pathogenType,
        symptoms: selected.symptoms,
        immediateActions: selected.actions,
        treatments: selected.treatments,
        prevention: selected.prevention,
        healthyCarePlan: {
            dailyCare: [
                translateText(language, { en: 'Check soil moisture before watering', ms: 'Periksa kelembapan tanah sebelum menyiram', zh: '浇水前先检查土壤湿度' }),
                translateText(language, { en: 'Inspect leaf color and vigor', ms: 'Periksa warna dan kesegaran daun', zh: '观察叶色和长势' }),
            ],
            weeklyCare: [
                translateText(language, { en: 'Scout for new lesions or pests', ms: 'Pantau lesi baharu atau perosak', zh: '每周巡查新病斑和虫害' }),
                translateText(language, { en: 'Clear weeds around the canopy', ms: 'Bersihkan rumpai di sekitar kanopi', zh: '清理树冠周围杂草' }),
            ],
            monthlyCare: [
                translateText(language, { en: 'Review fertilizer schedule', ms: 'Semak jadual pembajaan', zh: '检查施肥计划' }),
                translateText(language, { en: 'Check drainage after heavy rain', ms: 'Semak saliran selepas hujan lebat', zh: '大雨后检查排水情况' }),
            ],
            bestPractices: [
                translateText(language, { en: 'Keep tools clean between plots', ms: 'Pastikan alat bersih antara plot', zh: '不同地块之间注意工具清洁' }),
                translateText(language, { en: 'Record changes in the daily log', ms: 'Catat perubahan dalam log harian', zh: '将变化记录在每日日志中' }),
            ],
        },
        nutritionalIssues: {
            hasDeficiency: selected.deficiency,
            severity: selected.deficiency ? 'Moderate' : 'Mild',
            symptoms: selected.deficiency ? selected.symptoms : [],
            deficientNutrients: selected.deficiency ? [{
                nutrient: 'Potassium',
                severity: 'Moderate',
                symptoms: selected.symptoms,
                recommendations: selected.treatments,
            }] : [],
        },
        fertilizerRecommendations: selected.fertilizers.map((fertilizerName) => ({
            fertilizerName,
            type: 'Chemical',
            applicationMethod: getFallbackApplicationMethod(language),
            frequency: getFallbackFrequency(language),
            amount: getFallbackAmount(language),
        })),
        malaysianGovernmentSupport: {
            recommendedAgency: selected.deficiency ? 'DOA' : 'MARDI',
            services: [
                translateText(language, { en: 'Field advisory visit', ms: 'Lawatan nasihat lapangan', zh: '田间技术指导' }),
                translateText(language, { en: 'Soil and leaf analysis support', ms: 'Sokongan analisis tanah dan daun', zh: '土壤与叶片分析支持' }),
            ],
            contactInfo: translateText(language, {
                en: 'Contact the nearest district agriculture office',
                ms: 'Hubungi pejabat pertanian daerah terdekat',
                zh: '联系最近的县农业局',
            }),
        },
        economicImpact: {
            estimatedYieldLoss: selected.deficiency
                ? translateText(language, { en: '5-10% if untreated', ms: '5-10% jika tidak dirawat', zh: '若不处理，预计减产5-10%' })
                : translateText(language, { en: 'Low if handled early', ms: 'Rendah jika ditangani awal', zh: '若及早处理，影响较低' }),
            treatmentCost: 'RM 40 - 120',
            roi: 'High',
        },
        productSearchTags: selected.productSearchTags,
    };
};

export function buildAnalyzeFewShotExamples(language = 'en') {
    return [
        { label: 'Healthy example', payload: buildFewShotExampleObject(language, 'healthy') },
        { label: 'Fungal disease example', payload: buildFewShotExampleObject(language, 'fungal') },
        { label: 'Nutrient deficiency example', payload: buildFewShotExampleObject(language, 'nutrient') },
    ]
        .map(({ label, payload }) => `${label}:\n${JSON.stringify(payload, null, 2)}`)
        .join('\n\n');
}

const buildDiagnosisStageFewShotExamples = (language = 'en') => {
    const examples = [
        {
            label: 'Healthy leaf vs mild stress',
            payload: {
                capture_assessment: {
                    imageQualityConfidence: 90,
                    leafDetailSufficient: true,
                    requiresRetake: false,
                    retakeReason: '',
                    qualityFlags: [],
                },
                diagnosis_assessment: {
                    plantType: translateText(language, { en: 'Chili (Capsicum annuum)', ms: 'Cili (Capsicum annuum)', zh: '辣椒 (Capsicum annuum)' }),
                    primaryDiagnosis: buildNoIssuesLabel(language),
                    healthStatus: 'healthy',
                    severity: 'mild',
                    diagnosisConfidence: 88,
                    diseaseCategory: 'healthy',
                    pathogenType: 'None',
                    symptoms: [
                        translateText(language, { en: 'Even green color', ms: 'Warna hijau sekata', zh: '叶色均匀翠绿' }),
                        translateText(language, { en: 'No lesions or chewing damage', ms: 'Tiada lesi atau kesan gigitan', zh: '未见病斑或啃食痕迹' }),
                    ],
                    additionalNotes: translateText(language, {
                        en: 'The leaf looks healthy overall, so no treatment is needed right now.',
                        ms: 'Daun kelihatan sihat secara keseluruhan, jadi tiada rawatan diperlukan buat masa ini.',
                        zh: '叶片整体看起来健康，目前不需要特别处理。',
                    }),
                    needsMoreEvidence: false,
                    abstainReason: '',
                    differentialDiagnoses: [],
                    diagnosticEvidence: {
                        leafAgeAffected: translateText(language, { en: 'No clear age pattern', ms: 'Tiada corak umur daun yang jelas', zh: '无明显叶龄分布' }),
                        lesionShape: translateText(language, { en: 'None seen', ms: 'Tiada kelihatan', zh: '未见明显病斑' }),
                        lesionBorderHalo: translateText(language, { en: 'No halo or dark border', ms: 'Tiada halo atau tepi gelap', zh: '无晕圈或深色边缘' }),
                        distributionPattern: translateText(language, { en: 'Uniform leaf surface', ms: 'Permukaan daun seragam', zh: '叶面分布均匀' }),
                        colorPattern: translateText(language, { en: 'Consistent green', ms: 'Hijau sekata', zh: '颜色稳定偏绿' }),
                        likelyCauseCategory: 'healthy',
                        evidenceFor: [translateText(language, { en: 'No disease lesions are visible', ms: 'Tiada lesi penyakit yang kelihatan', zh: '未见病害斑点' })],
                        evidenceAgainst: [translateText(language, { en: 'No sign of marginal scorch or angular spots', ms: 'Tiada tanda tepi terbakar atau tompok bersegi', zh: '没有叶缘灼伤或角斑迹象' })],
                        rejectedDiagnosis: translateText(language, { en: 'Fungal leaf spot', ms: 'Bintik daun kulat', zh: '真菌性叶斑病' }),
                        rejectedReason: translateText(language, { en: 'No necrotic lesion pattern is visible', ms: 'Corak lesi nekrotik tidak kelihatan', zh: '未见坏死病斑形态' }),
                    },
                },
            },
        },
        {
            label: 'Fungal spot vs nutrient deficiency',
            payload: {
                capture_assessment: {
                    imageQualityConfidence: 84,
                    leafDetailSufficient: true,
                    requiresRetake: false,
                    retakeReason: '',
                    qualityFlags: [],
                },
                diagnosis_assessment: {
                    plantType: translateText(language, { en: 'Durian (Durio zibethinus)', ms: 'Durian (Durio zibethinus)', zh: '榴莲 (Durio zibethinus)' }),
                    primaryDiagnosis: translateText(language, { en: 'Leaf Spot', ms: 'Bintik Daun', zh: '叶斑病' }),
                    healthStatus: 'unhealthy',
                    severity: 'moderate',
                    diagnosisConfidence: 82,
                    diseaseCategory: 'fungal',
                    pathogenType: 'Fungal',
                    symptoms: [
                        translateText(language, { en: 'Circular brown lesions', ms: 'Lesi bulat perang', zh: '圆形褐色病斑' }),
                        translateText(language, { en: 'Yellow halo around several spots', ms: 'Halo kuning di beberapa tompok', zh: '多处病斑周围有黄晕' }),
                    ],
                    additionalNotes: translateText(language, {
                        en: 'The round lesions and dark margins fit a fungal spot better than a nutrient shortage.',
                        ms: 'Lesi bulat dan tepi gelap lebih sesuai dengan bintik daun kulat berbanding kekurangan nutrien.',
                        zh: '圆形病斑和深色边缘更符合真菌性叶斑，而不是单纯缺肥。',
                    }),
                    needsMoreEvidence: false,
                    abstainReason: '',
                    differentialDiagnoses: [
                        {
                            name: translateText(language, { en: 'Potassium deficiency', ms: 'Kekurangan kalium', zh: '缺钾' }),
                            likelihood: 32,
                            reason: translateText(language, { en: 'Yellowing is present, but lesion halos point away from pure nutrient stress', ms: 'Walaupun ada kekuningan, halo lesi tidak menyokong tekanan nutrien semata-mata', zh: '虽然有黄化，但病斑晕圈并不支持单纯缺肥' }),
                        },
                    ],
                    diagnosticEvidence: {
                        leafAgeAffected: translateText(language, { en: 'Mostly mature leaves', ms: 'Kebanyakannya daun matang', zh: '主要在成熟叶片上' }),
                        lesionShape: translateText(language, { en: 'Circular spots', ms: 'Tompok bulat', zh: '圆形病斑' }),
                        lesionBorderHalo: translateText(language, { en: 'Dark margin with yellow halo', ms: 'Tepi gelap dengan halo kuning', zh: '深色边缘并带黄晕' }),
                        distributionPattern: translateText(language, { en: 'Scattered spots', ms: 'Tompok bertaburan', zh: '病斑分散分布' }),
                        colorPattern: translateText(language, { en: 'Brown center with chlorotic halo', ms: 'Tengah perang dengan halo klorosis', zh: '褐色中心伴黄化晕圈' }),
                        likelyCauseCategory: 'fungal',
                        evidenceFor: [translateText(language, { en: 'Classic lesion margins are visible', ms: 'Sempadan lesi klasik kelihatan', zh: '可见典型病斑边缘' })],
                        evidenceAgainst: [translateText(language, { en: 'Not mainly marginal scorching', ms: 'Bukan corak tepi daun terbakar utama', zh: '并非以叶缘灼伤为主' })],
                        rejectedDiagnosis: translateText(language, { en: 'Potassium deficiency', ms: 'Kekurangan kalium', zh: '缺钾' }),
                        rejectedReason: translateText(language, { en: 'The lesions are discrete instead of diffuse leaf-edge stress', ms: 'Lesi adalah berasingan, bukan tekanan tepi daun yang merebak', zh: '病斑是离散的，而不是弥散性叶缘失调' }),
                    },
                },
            },
        },
        {
            label: 'Bacterial angular lesion vs fungal spot',
            payload: {
                capture_assessment: {
                    imageQualityConfidence: 80,
                    leafDetailSufficient: true,
                    requiresRetake: false,
                    retakeReason: '',
                    qualityFlags: [],
                },
                diagnosis_assessment: {
                    plantType: translateText(language, { en: 'Cucumber (Cucumis sativus)', ms: 'Timun (Cucumis sativus)', zh: '黄瓜 (Cucumis sativus)' }),
                    primaryDiagnosis: translateText(language, { en: 'Angular Leaf Spot', ms: 'Bintik Daun Bersudut', zh: '角斑病' }),
                    healthStatus: 'unhealthy',
                    severity: 'moderate',
                    diagnosisConfidence: 76,
                    diseaseCategory: 'bacterial',
                    pathogenType: 'Bacterial',
                    symptoms: [
                        translateText(language, { en: 'Angular lesions limited by veins', ms: 'Lesi bersudut mengikut urat daun', zh: '病斑受叶脉限制呈角形' }),
                        translateText(language, { en: 'Water-soaked patches', ms: 'Tompok berair', zh: '出现水渍状斑块' }),
                    ],
                    additionalNotes: translateText(language, {
                        en: 'The vein-limited angular pattern supports a bacterial lesion more than a fungal round spot.',
                        ms: 'Corak bersudut yang mengikut urat daun lebih menyokong lesi bakteria berbanding bintik kulat bulat.',
                        zh: '受叶脉限制的角斑更支持细菌性病害，而不是圆形真菌斑。',
                    }),
                    needsMoreEvidence: false,
                    abstainReason: '',
                    differentialDiagnoses: [
                        {
                            name: translateText(language, { en: 'Leaf spot', ms: 'Bintik daun', zh: '叶斑病' }),
                            likelihood: 38,
                            reason: translateText(language, { en: 'Some spots overlap, but the angular vein pattern is stronger', ms: 'Walaupun ada tompok bertindih, corak mengikut urat lebih kuat', zh: '虽然部分病斑重叠，但角形叶脉限制更明显' }),
                        },
                    ],
                    diagnosticEvidence: {
                        leafAgeAffected: translateText(language, { en: 'Mixed leaf ages', ms: 'Daun pelbagai umur', zh: '不同叶龄均可见' }),
                        lesionShape: translateText(language, { en: 'Angular', ms: 'Bersudut', zh: '角形' }),
                        lesionBorderHalo: translateText(language, { en: 'Water-soaked edge without a strong halo', ms: 'Tepi berair tanpa halo yang jelas', zh: '水渍边缘，无明显晕圈' }),
                        distributionPattern: translateText(language, { en: 'Patchy but vein-limited', ms: 'Bertompok tetapi dihadkan urat daun', zh: '分布不均，但受叶脉限制' }),
                        colorPattern: translateText(language, { en: 'Dark wet-looking lesions', ms: 'Lesi gelap seperti basah', zh: '深色且带湿润感的病斑' }),
                        likelyCauseCategory: 'bacterial',
                        evidenceFor: [translateText(language, { en: 'Angular water-soaked lesions are visible', ms: 'Lesi berair yang bersudut kelihatan', zh: '可见角形水渍病斑' })],
                        evidenceAgainst: [translateText(language, { en: 'No strong circular halo pattern', ms: 'Tiada corak halo bulat yang kuat', zh: '没有明显的圆形晕圈模式' })],
                        rejectedDiagnosis: translateText(language, { en: 'Fungal leaf spot', ms: 'Bintik daun kulat', zh: '真菌性叶斑病' }),
                        rejectedReason: translateText(language, { en: 'The lesions follow veins instead of forming round necrotic spots', ms: 'Lesi mengikut urat daun, bukan tompok nekrotik bulat', zh: '病斑沿叶脉分布，而非圆形坏死斑' }),
                    },
                },
            },
        },
        {
            label: 'Nutrient deficiency vs fungal disease',
            payload: {
                capture_assessment: {
                    imageQualityConfidence: 87,
                    leafDetailSufficient: true,
                    requiresRetake: false,
                    retakeReason: '',
                    qualityFlags: [],
                },
                diagnosis_assessment: {
                    plantType: translateText(language, { en: 'Banana (Musa spp.)', ms: 'Pisang (Musa spp.)', zh: '香蕉 (Musa spp.)' }),
                    primaryDiagnosis: translateText(language, { en: 'Potassium Deficiency', ms: 'Kekurangan Kalium', zh: '缺钾' }),
                    healthStatus: 'unhealthy',
                    severity: 'moderate',
                    diagnosisConfidence: 84,
                    diseaseCategory: 'nutrient',
                    pathogenType: 'Nutritional',
                    symptoms: [
                        translateText(language, { en: 'Yellowing at leaf margins', ms: 'Kekuningan di tepi daun', zh: '叶缘黄化' }),
                        translateText(language, { en: 'Older leaves show scorching first', ms: 'Daun tua menunjukkan kesan terbakar terlebih dahulu', zh: '老叶先出现焦边' }),
                    ],
                    additionalNotes: translateText(language, {
                        en: 'The age pattern and leaf-edge scorch fit potassium stress better than a fungal spot.',
                        ms: 'Corak umur daun dan tepi daun terbakar lebih sesuai dengan tekanan kalium berbanding bintik kulat.',
                        zh: '叶龄分布和叶缘焦枯更符合缺钾，而不是典型真菌病斑。',
                    }),
                    needsMoreEvidence: false,
                    abstainReason: '',
                    differentialDiagnoses: [
                        {
                            name: translateText(language, { en: 'Leaf spot', ms: 'Bintik daun', zh: '叶斑病' }),
                            likelihood: 25,
                            reason: translateText(language, { en: 'Necrotic areas exist, but they are not discrete fungal lesions', ms: 'Walaupun ada nekrosis, ia bukan lesi kulat yang berasingan', zh: '虽然有坏死区，但不像离散的真菌病斑' }),
                        },
                    ],
                    diagnosticEvidence: {
                        leafAgeAffected: translateText(language, { en: 'Older leaves first', ms: 'Daun tua dahulu', zh: '先发生在老叶' }),
                        lesionShape: translateText(language, { en: 'No distinct lesion shape', ms: 'Tiada bentuk lesi yang jelas', zh: '没有明确病斑形态' }),
                        lesionBorderHalo: translateText(language, { en: 'No halo; margin scorch instead', ms: 'Tiada halo; sebaliknya tepi daun terbakar', zh: '没有晕圈，主要是叶缘焦枯' }),
                        distributionPattern: translateText(language, { en: 'Diffuse along the leaf edge', ms: 'Merebak di sepanjang tepi daun', zh: '沿叶缘弥散分布' }),
                        colorPattern: translateText(language, { en: 'Yellow to brown margin stress', ms: 'Tepi kuning ke perang', zh: '叶缘由黄变褐' }),
                        likelyCauseCategory: 'nutrient',
                        evidenceFor: [translateText(language, { en: 'Older leaves are affected first', ms: 'Daun tua terjejas dahulu', zh: '老叶先受影响' })],
                        evidenceAgainst: [translateText(language, { en: 'No round halo lesions are seen', ms: 'Tiada lesi bulat berhalo kelihatan', zh: '未见圆形带晕圈病斑' })],
                        rejectedDiagnosis: translateText(language, { en: 'Fungal leaf spot', ms: 'Bintik daun kulat', zh: '真菌性叶斑病' }),
                        rejectedReason: translateText(language, { en: 'The pattern is diffuse nutrient stress instead of discrete lesions', ms: 'Corak ini ialah tekanan nutrien yang merebak, bukan lesi berasingan', zh: '该模式更像弥散性缺素，而不是离散病斑' }),
                    },
                },
            },
        },
    ];

    return examples
        .map(({ label, payload }) => `${label}:\n${JSON.stringify(payload, null, 2)}`)
        .join('\n\n');
};

export function buildAskAIContextSummary(recentNotes = [], recentAlerts = [], language = 'en') {
    const notes = Array.isArray(recentNotes)
        ? [...recentNotes]
            .filter(Boolean)
            .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
            .slice(0, 5)
        : [];

    const alerts = Array.isArray(recentAlerts)
        ? [...recentAlerts]
            .filter(Boolean)
            .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))
            .slice(0, 3)
        : [];

    if (notes.length === 0 && alerts.length === 0) return '';

    const noteLabel = translateText(language, {
        en: 'Recent farm notes',
        ms: 'Catatan ladang terkini',
        zh: '近期农场记录',
    });
    const alertLabel = translateText(language, {
        en: 'Active or recent alerts',
        ms: 'Amaran aktif atau terkini',
        zh: '当前或近期预警',
    });

    const noteLines = notes.map((note) => {
        const date = note.created_at || note.timestamp || 'Unknown date';
        const activity = note.activity_type || note.type || 'note';
        const plot = note.plot_id ? ` | plot: ${note.plot_id}` : '';
        const chemical = note.chemical_name ? ` | input: ${note.chemical_name}` : '';
        const disease = note.disease_name_observed ? ` | issue: ${note.disease_name_observed}` : '';
        const text = note.note || note.notes || '';
        return `- ${date} | ${activity}${plot}${chemical}${disease} | ${text}`.trim();
    });

    const alertLines = alerts.map((alert) => {
        const date = alert.created_at || alert.timestamp || 'Unknown date';
        const severity = alert.severity || 'unknown';
        const disease = alert.disease || alert.title || 'Unknown alert';
        const category = alert.category ? ` | crop: ${alert.category}` : '';
        return `- ${date} | ${disease} | severity: ${severity}${category}`;
    });

    return [
        `${noteLabel}:`,
        ...(noteLines.length > 0 ? noteLines : ['- None']),
        '',
        `${alertLabel}:`,
        ...(alertLines.length > 0 ? alertLines : ['- None']),
    ].join('\n');
}

const normalizeDifferentialDiagnoses = (differentials = []) => {
    if (!Array.isArray(differentials)) return [];
    return differentials
        .map((entry) => {
            if (!entry) return null;
            if (typeof entry === 'string') {
                return { name: entry, likelihood: null, reason: '' };
            }
            const name = entry.name || entry.disease || entry.diagnosis;
            if (!name) return null;
            return {
                name,
                likelihood: Number.isFinite(Number(entry.likelihood)) ? clampConfidence(entry.likelihood) : null,
                reason: entry.reason || entry.why || '',
            };
        })
        .filter(Boolean)
        .slice(0, 3);
};

const normalizeDiagnosticEvidence = (evidence = {}, language = 'en') => ({
    leafAgeAffected: evidence.leafAgeAffected || evidence.leaf_location || translateText(language, {
        en: 'Not clearly observed',
        ms: 'Tidak dapat diperhatikan dengan jelas',
        zh: '未能清楚观察',
    }),
    lesionShape: evidence.lesionShape || evidence.lesion_shape || translateText(language, {
        en: 'Not clearly observed',
        ms: 'Tidak dapat diperhatikan dengan jelas',
        zh: '未能清楚观察',
    }),
    lesionBorderHalo: evidence.lesionBorderHalo || evidence.lesion_border_halo || translateText(language, {
        en: 'Not clearly observed',
        ms: 'Tidak dapat diperhatikan dengan jelas',
        zh: '未能清楚观察',
    }),
    distributionPattern: evidence.distributionPattern || evidence.distribution_pattern || translateText(language, {
        en: 'Not clearly observed',
        ms: 'Tidak dapat diperhatikan dengan jelas',
        zh: '未能清楚观察',
    }),
    colorPattern: evidence.colorPattern || evidence.color_pattern || translateText(language, {
        en: 'Not clearly observed',
        ms: 'Tidak dapat diperhatikan dengan jelas',
        zh: '未能清楚观察',
    }),
    likelyCauseCategory: normalizeDiseaseCategory(evidence.likelyCauseCategory || evidence.likely_cause || ''),
    evidenceFor: normalizeArray(evidence.evidenceFor || evidence.evidence_for),
    evidenceAgainst: normalizeArray(evidence.evidenceAgainst || evidence.evidence_against),
    rejectedDiagnosis: evidence.rejectedDiagnosis || evidence.rejected_diagnosis || '',
    rejectedReason: evidence.rejectedReason || evidence.rejected_reason || '',
});

const getPlausibleDiseaseTokens = (malaysiaCropInfo) => {
    const diseaseTokens = new Set(['spot', 'blight', 'rot', 'wilt', 'rust', 'mildew', 'anthracnose', 'scab', 'canker']);
    malaysiaCropInfo?.info?.commonDiseases?.forEach((name) => {
        normalizeLookupText(name)
            .split(' ')
            .filter((token) => token.length > 3)
            .forEach((token) => diseaseTokens.add(token));
    });
    return diseaseTokens;
};

const isLikelyNutrientDiagnosis = (result) => {
    const joined = [
        result.disease,
        result.pathogenType,
        result.diseaseCategory,
        result.additionalNotes,
        result.diagnosticEvidence?.likelyCauseCategory,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return joined.includes('nutri')
        || joined.includes('deficien')
        || joined.includes('kalium')
        || joined.includes('nitrogen')
        || joined.includes('magnesium')
        || joined.includes('phosphorus')
        || joined.includes('potassium');
};

export function applyDiseaseSanityFilters(result = {}, language = 'en', malaysiaCropInfo = null) {
    const next = { ...result };
    const evidence = normalizeDiagnosticEvidence(next.diagnosticEvidence, language);
    next.diagnosticEvidence = evidence;

    const isHealthyDiagnosis = String(next.healthStatus || '').toLowerCase() === 'healthy';
    if (isHealthyDiagnosis) {
        next.disease = buildNoIssuesLabel(language);
        next.severity = 'mild';
        next.pathogenType = 'None';
        next.diseaseCategory = 'healthy';
    }

    if (isHealthyDiagnosis && String(next.severity || '').toLowerCase() !== 'mild') {
        next.severity = 'mild';
    }

    const nutrientDiagnosis = isLikelyNutrientDiagnosis(next);
    const evidenceText = [
        evidence.lesionShape,
        evidence.lesionBorderHalo,
        ...evidence.evidenceFor,
        ...evidence.evidenceAgainst,
    ].join(' ').toLowerCase();

    if (nutrientDiagnosis && /fungal|fungus|kulat/.test(String(next.pathogenType || '').toLowerCase()) && !/halo|circular|round|spore|bulat/.test(evidenceText)) {
        next.pathogenType = 'Nutritional';
        next.diseaseCategory = 'nutrient';
        next.status = next.status === 'confirmed' ? 'likely' : next.status;
        next.abstainReason = next.abstainReason || translateText(language, {
            en: 'The symptom pattern leans toward nutrient stress more than a fungal lesion.',
            ms: 'Corak gejala lebih cenderung kepada tekanan nutrien berbanding lesi kulat.',
            zh: '症状模式更偏向缺素胁迫，而不是典型真菌病斑。',
        });
    }

    if (/bacter/i.test(String(next.pathogenType || '')) && !/water|watery|water-soaked|angular|bersudut|berair/.test(evidenceText)) {
        next.status = next.status === 'confirmed' ? 'likely' : 'uncertain';
        next.needsMoreEvidence = true;
        next.abstainReason = next.abstainReason || translateText(language, {
            en: 'Bacterial diagnosis should show angular or water-soaked lesions, but that evidence is weak here.',
            ms: 'Diagnosis bakteria sepatutnya menunjukkan lesi berair atau bersudut, tetapi bukti itu lemah di sini.',
            zh: '细菌性病害通常应出现角斑或水渍状病斑，但这里的证据较弱。',
        });
    }

    if (malaysiaCropInfo && !isHealthyDiagnosis && !nutrientDiagnosis) {
        const diseaseTokens = getPlausibleDiseaseTokens(malaysiaCropInfo);
        const normalizedDisease = normalizeLookupText(next.disease);
        const plausible = normalizedDisease
            .split(' ')
            .some((token) => diseaseTokens.has(token));

        if (!plausible && normalizedDisease) {
            const currentPrimary = next.disease;
            next.differentialDiagnoses = normalizeDifferentialDiagnoses([
                {
                    name: currentPrimary,
                    likelihood: next.confidence || next.diagnosisConfidence || 50,
                    reason: translateText(language, {
                        en: 'This pattern is not a strong crop-specific match, so it is safer as a differential only.',
                        ms: 'Corak ini bukan padanan spesifik tanaman yang kuat, jadi lebih selamat diletakkan sebagai diagnosis pembezaan.',
                        zh: '该模式与此作物的常见病害匹配度不高，更适合作为鉴别诊断。',
                    }),
                },
                ...(next.differentialDiagnoses || []),
            ]);
            next.status = next.status === 'confirmed' ? 'likely' : 'uncertain';
            next.needsMoreEvidence = true;
            next.abstainReason = next.abstainReason || translateText(language, {
                en: 'The predicted disease is not a confident crop-specific match for this Malaysian crop profile.',
                ms: 'Penyakit yang diramalkan bukan padanan spesifik tanaman yang meyakinkan untuk profil tanaman Malaysia ini.',
                zh: '该预测病害与此马来西亚作物类型的常见病害并不十分匹配。',
            });
        }
    }

    return next;
}

const getPlantTypeLabel = (plantNetResult, category, language, speciesAssessment) => {
    if (speciesAssessment?.confirmed && plantNetResult?.scientificName) {
        const commonName = plantNetResult.commonNames?.[0] || category || plantNetResult.scientificName;
        return `${commonName} (${plantNetResult.scientificName})`;
    }

    if (category) {
        return translateText(language, {
            en: `${category} crop`,
            ms: `Tanaman ${category}`,
            zh: `${category} 作物`,
        });
    }

    return plantNetResult?.scientificName || translateText(language, {
        en: 'Unknown crop',
        ms: 'Tanaman tidak diketahui',
        zh: '未知作物',
    });
};

const computeOverallConfidence = (speciesConfidence, imageQualityConfidence, diagnosisConfidence) => {
    const weightedBlend = Math.round(
        (diagnosisConfidence * 0.55) +
        (imageQualityConfidence * 0.3) +
        (speciesConfidence * 0.15)
    );
    return Math.max(0, Math.min(100, Math.min(weightedBlend, diagnosisConfidence, imageQualityConfidence)));
};

const deriveStatus = (result) => {
    if (result.requiresRetake) return 'retake_required';
    if (result.needsMoreEvidence || result.abstainReason) {
        return result.confidence >= 60 ? 'likely' : 'uncertain';
    }
    if (result.confidence >= 80) return 'confirmed';
    if (result.confidence >= 60) return 'likely';
    return 'uncertain';
};

/**
 * Fallback: Identify plant using GPT Vision
 */
export async function identifyPlantWithGPTVision(imageBase64, category) {
    try {
        console.log('🔍 Using backup identification method...');

        // Try gpt-4o-mini first (Fast & Latest)
        let model = 'gpt-4o-mini';
        let response;

        try {
            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a botanical expert specializing in plant identification. First, check if the image contains a plant. If it does NOT contain a plant, set "isPlant": false and leave other fields empty. If it is a plant, set "isPlant": true, and provide scientific name, common names, family, and genus. Be accurate and only identify if you are confident.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Identify this plant. Category hint: ${category}. Provide response in JSON format:
{
  "isPlant": true,
  "scientificName": "Scientific name",
  "commonNames": ["Common name 1", "Common name 2"],
  "family": "Family name",
  "genus": "Genus name",
  "confidence": 85
}`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });
        } catch (primaryError) {
            console.error(`⚠️ Primary model (${model}) failed: ${primaryError.code || primaryError.status || primaryError.message}`);

            // Fallback to GPT-5 mini if 4o-mini fails
            console.log('⚠️ Primary model unavailable, using backup...');
            model = 'gpt-5-mini';

            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a botanical expert specializing in plant identification. First, check if the image contains a plant. If it does NOT contain a plant, set "isPlant": false and leave other fields empty. If it is a plant, set "isPlant": true, and provide scientific name, common names, family, and genus. Be accurate and only identify if you are confident.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Identify this plant. Category hint: ${category}. Provide response in JSON format:
{
  "isPlant": true,
  "scientificName": "Scientific name",
  "commonNames": ["Common name 1", "Common name 2"],
  "family": "Family name",
  "genus": "Genus name",
  "confidence": 85
}`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: imageBase64,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.3
            });
        }

        const content = response.choices[0].message.content;
        // Robust JSON Extraction
        const cleanedContent = cleanJsonString(content);
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('❌ Failed to extract JSON from response:', content.substring(0, 100) + '...');
            throw new Error('Failed to parse identification response');
        }

        const result = JSON.parse(jsonMatch[0]);

        // Add empty allMatches for consistency
        result.allMatches = [];

        console.log(`✅ Species identified: ${result.scientificName}`);
        return result;

    } catch (error) {
        console.error('❌ Backup identification failed:', error.message, error.status ? `(Status: ${error.status})` : '');
        return null;
    }
}

// ... internal helpers ...



/**
 * Get Malaysia-specific crop information
 */
function getMalaysiaCropInfo(plantNetResult, category) {
    if (!plantNetResult) return null;

    const scientificName = plantNetResult.scientificName.toLowerCase();
    const categoryLower = category.toLowerCase();

    // Match against Malaysian crop database
    if (scientificName.includes('durio') || categoryLower.includes('durian')) {
        return { cropType: 'durian', info: MALAYSIA_CROP_KNOWLEDGE.durian };
    }
    if (scientificName.includes('hevea') || categoryLower.includes('rubber')) {
        return { cropType: 'rubber', info: MALAYSIA_CROP_KNOWLEDGE.rubber };
    }
    if (scientificName.includes('musa') || categoryLower.includes('banana') || categoryLower.includes('pisang')) {
        return { cropType: 'banana', info: MALAYSIA_CROP_KNOWLEDGE.banana };
    }
    if (scientificName.includes('cocos') || categoryLower.includes('coconut') || categoryLower.includes('kelapa')) {
        return { cropType: 'coconut', info: MALAYSIA_CROP_KNOWLEDGE.coconut };
    }
    if (scientificName.includes('elaeis') || categoryLower.includes('palm') || categoryLower.includes('sawit')) {
        return { cropType: 'oil_palm', info: MALAYSIA_CROP_KNOWLEDGE.oil_palm };
    }

    return null;
}

/**
 * Analyze plant with GPT-5 Nano (optimized for Malaysia)
 */
const createFallbackTreatmentPlan = (result, language, malaysiaCropInfo) => {
    const healthy = String(result.healthStatus).toLowerCase() === 'healthy';

    return {
        immediateActions: healthy ? [] : buildRetakeActionItems(language),
        treatments: healthy ? [] : buildRetakeActionItems(language),
        prevention: buildRetakePrevention(language),
        healthyCarePlan: DEFAULT_CARE_PLANS[language === 'ms' ? 'ms' : language === 'zh' ? 'zh' : 'en'],
        nutritionalIssues: {
            hasDeficiency: false,
            severity: 'Mild',
            symptoms: [],
            deficientNutrients: [],
        },
        fertilizerRecommendations: healthy
            ? getFallbackFertilizerNames(language, malaysiaCropInfo, result).slice(0, 2).map((fertilizerName) => ({
                fertilizerName,
                type: 'Chemical',
                applicationMethod: getFallbackApplicationMethod(language),
                frequency: getFallbackFrequency(language),
                amount: getFallbackAmount(language),
            }))
            : [],
        malaysianGovernmentSupport: {
            recommendedAgency: 'DOA',
            services: [
                translateText(language, { en: 'Field advisory visit', ms: 'Lawatan nasihat lapangan', zh: '田间技术指导' }),
                translateText(language, { en: 'Lab confirmation if symptoms worsen', ms: 'Pengesahan makmal jika gejala bertambah teruk', zh: '如症状加重可进行实验室确认' }),
            ],
            contactInfo: translateText(language, {
                en: 'Contact the nearest district agriculture office if symptoms spread.',
                ms: 'Hubungi pejabat pertanian daerah terdekat jika gejala merebak.',
                zh: '如果症状扩散，请联系最近的县农业办公室。',
            }),
        },
        economicImpact: {
            estimatedYieldLoss: healthy
                ? translateText(language, { en: 'Low', ms: 'Rendah', zh: '较低' })
                : translateText(language, { en: 'Unknown until diagnosis is clearer', ms: 'Belum pasti sehingga diagnosis lebih jelas', zh: '需待诊断更明确后才能评估' }),
            treatmentCost: 'RM 0 - 50',
            roi: healthy ? 'High' : 'Unknown',
        },
        productSearchTags: healthy ? ['fertilizer', 'foliar-feed'] : [],
    };
};

const buildDiagnosisStagePrompt = ({
    plantNetResult,
    speciesAssessment,
    category,
    language,
    userLocation,
    malaysiaCropInfo,
    leafImage,
    imageQuality,
}) => {
    const isMalay = language === 'ms';
    const isChinese = language === 'zh';
    const speciesBlock = getSpeciesContextBlock(speciesAssessment, plantNetResult, category, language);
    const cropBlock = malaysiaCropInfo
        ? `${isMalay ? 'KONTEKS TANAMAN MALAYSIA' : isChinese ? '马来西亚作物背景' : 'MALAYSIA CROP CONTEXT'}:\n${malaysiaCropInfo.info.commonDiseases.map((d) => `- ${d}`).join('\n')}\n${malaysiaCropInfo.info.nutrientIssues.map((n) => `- ${n}`).join('\n')}`
        : '';
    const qualityBlock = buildImageQualityContext(imageQuality, language);
    const fewShotExamples = buildDiagnosisStageFewShotExamples(language);
    const languageInstruction = isMalay
        ? 'Berikan semua kandungan JSON dalam Bahasa Malaysia.'
        : isChinese
            ? '所有 JSON 文本字段必须使用简体中文。'
            : 'Provide all JSON text fields in English.';

    return `${languageInstruction}

You are a Malaysian crop-disease triage specialist. Diagnose carefully and abstain when the evidence is weak.

${speciesBlock}
${cropBlock}
${qualityBlock}

Location: ${userLocation || 'Malaysia'}
Leaf close-up provided: ${leafImage ? 'yes' : 'no'}

Rules:
- Separate image capture quality from diagnosis confidence.
- Do not state any species is confirmed unless the species context says it is confirmed.
- Use ranked differentials when a single diagnosis is not secure.
- If image quality is weak, set requiresRetake to true and explain why.
- If diagnosis evidence is weak or conflicting, set needsMoreEvidence to true and provide abstainReason.
- Bacterial diagnoses require angular or water-soaked evidence.
- Nutrient deficiency should match leaf age pattern and diffuse color change, not discrete fungal lesions.
- Healthy plants must remain severity mild and diagnosis "${buildNoIssuesLabel(language)}".

Return STRICT JSON:
{
  "capture_assessment": {
    "imageQualityConfidence": 0,
    "leafDetailSufficient": true,
    "requiresRetake": false,
    "retakeReason": "",
    "qualityFlags": ["too_dark", "too_blurry"]
  },
  "diagnosis_assessment": {
    "plantType": "Common crop name (Scientific name if known)",
    "primaryDiagnosis": "short label",
    "healthStatus": "healthy or unhealthy",
    "severity": "mild | moderate | severe",
    "diagnosisConfidence": 0,
    "diseaseCategory": "healthy | fungal | bacterial | viral | pest | nutrient | environmental | unknown",
    "pathogenType": "None/Fungal/Bacterial/Viral/Pest/Nutritional/Environmental",
    "symptoms": ["item 1", "item 2"],
    "additionalNotes": "short friendly explanation",
    "needsMoreEvidence": false,
    "abstainReason": "",
    "differentialDiagnoses": [
      { "name": "alternative diagnosis", "likelihood": 42, "reason": "why this remains possible" }
    ],
    "diagnosticEvidence": {
      "leafAgeAffected": "older/newer/mixed/unclear",
      "lesionShape": "round/angular/diffuse/none/unclear",
      "lesionBorderHalo": "dark margin/yellow halo/water-soaked/none/unclear",
      "distributionPattern": "vein-limited/diffuse/scattered/uniform",
      "colorPattern": "green/yellow/brown/mosaic/interveinal chlorosis",
      "likelyCauseCategory": "fungal/bacterial/viral/pest/nutrient/healthy/unknown",
      "evidenceFor": ["short point"],
      "evidenceAgainst": ["short point"],
      "rejectedDiagnosis": "what you rejected",
      "rejectedReason": "why you rejected it"
    }
  }
}

Few-shot examples:
${fewShotExamples}`;
};

const buildTreatmentStagePrompt = ({
    language,
    userLocation,
    malaysiaCropInfo,
    diagnosisResult,
    speciesAssessment,
}) => {
    const isMalay = language === 'ms';
    const isChinese = language === 'zh';
    const languageInstruction = isMalay
        ? 'Berikan semua kandungan JSON dalam Bahasa Malaysia.'
        : isChinese
            ? '所有 JSON 文本字段必须使用简体中文。'
            : 'Provide all JSON text fields in English.';

    const cropContext = speciesAssessment?.confirmed && malaysiaCropInfo
        ? `${isMalay ? 'Tanaman dikenal pasti dengan lebih yakin.' : isChinese ? '作物识别相对更可靠。' : 'Crop identification is relatively reliable.'}`
        : `${isMalay ? 'Jangan gunakan nasihat yang terlalu spesifik spesies.' : isChinese ? '不要给出过于物种专属的建议。' : 'Avoid overly species-specific advice.'}`;

    return `${languageInstruction}
You are a Malaysian agronomy advisor.
Create practical next-step advice only after the diagnosis below.
Avoid e-commerce language. Product tags should be generic search hints only.

Location: ${userLocation || 'Malaysia'}
${cropContext}
${malaysiaCropInfo ? `Known crop context: ${malaysiaCropInfo.cropType}` : ''}

Diagnosis summary:
${JSON.stringify(diagnosisResult, null, 2)}

Return STRICT JSON:
{
  "immediateActions": ["item 1", "item 2"],
  "treatments": ["item 1", "item 2"],
  "prevention": ["item 1", "item 2"],
  "healthyCarePlan": {
    "dailyCare": ["item 1", "item 2"],
    "weeklyCare": ["item 1", "item 2"],
    "monthlyCare": ["item 1", "item 2"],
    "bestPractices": ["item 1", "item 2"]
  },
  "nutritionalIssues": {
    "hasDeficiency": false,
    "severity": "Mild",
    "symptoms": [],
    "deficientNutrients": [
      { "nutrient": "Potassium", "severity": "Moderate", "symptoms": ["item"], "recommendations": ["item"] }
    ]
  },
  "fertilizerRecommendations": [
    { "fertilizerName": "NPK 15-15-15", "type": "Chemical", "applicationMethod": "how", "frequency": "when", "amount": "how much" }
  ],
  "malaysianGovernmentSupport": {
    "recommendedAgency": "DOA/MARDI/MPOB/LGM",
    "services": ["service 1", "service 2"],
    "contactInfo": "how to contact"
  },
  "economicImpact": {
    "estimatedYieldLoss": "short estimate",
    "treatmentCost": "RM 40 - 120",
    "roi": "Low/Medium/High"
  },
  "productSearchTags": ["fungicide", "fertilizer"]
}`;
};

const parseOpenAIJson = (content, errorLabel) => {
    const cleanedContent = cleanJsonString(content);
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        console.error(`❌ Failed to extract JSON from ${errorLabel}. Raw content:`, content?.substring?.(0, 200));
        throw new Error(`Failed to parse ${errorLabel}`);
    }

    return JSON.parse(jsonMatch[0]);
};

const createModelMessagesWithImages = (prompt, treeImage, leafImage = null) => {
    const content = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: treeImage, detail: 'high' } },
    ];

    if (leafImage) {
        content.push({ type: 'image_url', image_url: { url: leafImage, detail: 'high' } });
    }

    return [
        {
            role: 'system',
            content: 'You are a careful Malaysian agricultural analyst. Always return valid JSON only.',
        },
        {
            role: 'user',
            content,
        },
    ];
};

const callOpenAIJson = async (messages, maxTokens = 2400) => {
    let model = 'gpt-4o-mini';

    try {
        return await openai.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages,
            max_tokens: maxTokens,
            temperature: 0.2,
        });
    } catch (primaryError) {
        console.error(`⚠️ Primary analysis model (${model}) failed:`, primaryError.message, primaryError.status ? `(Status: ${primaryError.status})` : '');
        model = 'gpt-5-mini';
        return await openai.chat.completions.create({
            model,
            response_format: { type: 'json_object' },
            messages,
            max_tokens: maxTokens,
            temperature: 0.2,
        });
    }
};

const mergeDiagnosisResult = ({
    stageOne,
    stageTwo,
    plantNetResult,
    category,
    language,
    malaysiaCropInfo,
    speciesAssessment,
    imageQuality,
}) => {
    const captureAssessment = stageOne?.capture_assessment || {};
    const diagnosisAssessment = stageOne?.diagnosis_assessment || {};
    const frontendTreeQuality = imageQuality?.tree || {};

    const imageQualityConfidence = clampConfidence(
        Math.min(
            Number.isFinite(Number(captureAssessment.imageQualityConfidence)) ? Number(captureAssessment.imageQualityConfidence) : 100,
            Number.isFinite(Number(frontendTreeQuality.qualityConfidence)) ? Number(frontendTreeQuality.qualityConfidence) : 100,
        ),
        70,
    );
    const diagnosisConfidence = clampConfidence(diagnosisAssessment.diagnosisConfidence, 55);
    const speciesConfidence = clampConfidence(speciesAssessment?.confidence, plantNetResult ? 50 : 55);
    const requiresRetake = Boolean(
        captureAssessment.requiresRetake
        || frontendTreeQuality.requiresRetake
        || imageQualityConfidence < 45
    );
    const retakeReason = captureAssessment.retakeReason
        || frontendTreeQuality.retakeReason
        || (requiresRetake ? buildRetakeGuidance(language) : '');

    const baseResult = {
        plantType: diagnosisAssessment.plantType || getPlantTypeLabel(plantNetResult, category, language, speciesAssessment),
        disease: diagnosisAssessment.primaryDiagnosis || buildNoIssuesLabel(language),
        healthStatus: String(diagnosisAssessment.healthStatus || '').toLowerCase() === 'healthy' ? 'healthy' : 'unhealthy',
        severity: String(diagnosisAssessment.severity || 'mild').toLowerCase(),
        confidence: diagnosisConfidence,
        diagnosisConfidence,
        pathogenType: diagnosisAssessment.pathogenType || (String(diagnosisAssessment.healthStatus || '').toLowerCase() === 'healthy' ? 'None' : 'Unknown'),
        diseaseCategory: normalizeDiseaseCategory(diagnosisAssessment.diseaseCategory || diagnosisAssessment.pathogenType || ''),
        symptoms: normalizeArray(diagnosisAssessment.symptoms),
        additionalNotes: diagnosisAssessment.additionalNotes || buildGeneralDiagnosisFallback(language),
        differentialDiagnoses: normalizeDifferentialDiagnoses(diagnosisAssessment.differentialDiagnoses),
        diagnosticEvidence: normalizeDiagnosticEvidence(diagnosisAssessment.diagnosticEvidence, language),
        needsMoreEvidence: Boolean(diagnosisAssessment.needsMoreEvidence || requiresRetake),
        abstainReason: diagnosisAssessment.abstainReason || '',
        captureAssessment: {
            imageQualityConfidence,
            leafDetailSufficient: captureAssessment.leafDetailSufficient !== false,
            requiresRetake,
            retakeReason,
            qualityFlags: normalizeArray(captureAssessment.qualityFlags || frontendTreeQuality.flags),
        },
        confidenceBreakdown: {
            speciesConfidence,
            imageQualityConfidence,
            diagnosisConfidence,
            overallConfidence: computeOverallConfidence(speciesConfidence, imageQualityConfidence, diagnosisConfidence),
        },
        speciesAssessment,
    };

    baseResult.status = deriveStatus(baseResult);
    baseResult.requiresRetake = baseResult.status === 'retake_required';
    if (baseResult.requiresRetake) {
        baseResult.additionalNotes = retakeReason || buildRetakeGuidance(language);
    }

    const treatmentFallback = createFallbackTreatmentPlan(baseResult, language, malaysiaCropInfo);
    const merged = {
        ...treatmentFallback,
        ...(stageTwo || {}),
        ...baseResult,
    };

    merged.immediateActions = normalizeArray(merged.immediateActions);
    merged.treatments = normalizeArray(merged.treatments);
    merged.prevention = normalizeArray(merged.prevention);
    merged.productSearchTags = normalizeArray(merged.productSearchTags).slice(0, 5);
    merged.nutritionalIssues = {
        hasDeficiency: Boolean(merged.nutritionalIssues?.hasDeficiency),
        severity: merged.nutritionalIssues?.severity || 'Mild',
        symptoms: normalizeArray(merged.nutritionalIssues?.symptoms),
        deficientNutrients: Array.isArray(merged.nutritionalIssues?.deficientNutrients)
            ? merged.nutritionalIssues.deficientNutrients
            : [],
    };

    if (merged.requiresRetake && merged.immediateActions.length === 0) {
        merged.immediateActions = buildRetakeActionItems(language);
        merged.treatments = buildRetakeActionItems(language);
        merged.prevention = buildRetakePrevention(language);
    }

    const filtered = applyDiseaseSanityFilters(merged, language, malaysiaCropInfo);
    filtered.confidenceBreakdown = {
        ...filtered.confidenceBreakdown,
        overallConfidence: computeOverallConfidence(
            filtered.confidenceBreakdown.speciesConfidence,
            filtered.confidenceBreakdown.imageQualityConfidence,
            filtered.confidenceBreakdown.diagnosisConfidence,
        ),
    };
    filtered.confidence = filtered.confidenceBreakdown.overallConfidence;
    filtered.status = deriveStatus(filtered);
    filtered.requiresRetake = filtered.status === 'retake_required';
    filtered.retakeReason = filtered.requiresRetake ? (filtered.captureAssessment?.retakeReason || retakeReason) : '';

    return ensureCarePlan(normalizeAnalysisResult(filtered, language, malaysiaCropInfo), language);
};

export async function analyzeWithGPT4Mini(plantNetResult, treeImage, leafImage, category, language, userLocation, imageQuality = null) {
    console.log(`🌿 PlantNet Data Used: ${plantNetResult ? 'Yes' : 'No'}`);
    if (plantNetResult) {
        console.log(`   - Species: ${plantNetResult.scientificName}`);
        console.log(`   - Confidence: ${plantNetResult.score}`);
    }
    try {
        console.log('🤖 Analyzing plant health...');

        const isMalay = language === 'ms';
        const isChinese = language === 'zh';

        // Get Malaysia-specific crop information
        const malaysiaCropInfo = getMalaysiaCropInfo(plantNetResult, category);
        const speciesAssessment = assessSpeciesIdentification(plantNetResult, category);

        const diagnosisPrompt = buildDiagnosisStagePrompt({
            plantNetResult,
            speciesAssessment,
            category,
            language,
            userLocation,
            malaysiaCropInfo,
            leafImage,
            imageQuality,
        });

        const diagnosisMessages = createModelMessagesWithImages(diagnosisPrompt, treeImage, leafImage);
        const diagnosisResponse = await callOpenAIJson(diagnosisMessages, 2600);
        const stageOne = parseOpenAIJson(diagnosisResponse.choices[0].message.content, 'diagnosis stage');

        const provisional = mergeDiagnosisResult({
            stageOne,
            stageTwo: null,
            plantNetResult,
            category,
            language,
            malaysiaCropInfo,
            speciesAssessment,
            imageQuality,
        });

        let stageTwo = null;
        if (!provisional.requiresRetake && provisional.status !== 'uncertain') {
            const treatmentPrompt = buildTreatmentStagePrompt({
                language,
                userLocation,
                malaysiaCropInfo,
                diagnosisResult: provisional,
                speciesAssessment,
            });

            const treatmentMessages = [
                {
                    role: 'system',
                    content: 'You are a careful Malaysian agronomy advisor. Always return valid JSON only.',
                },
                {
                    role: 'user',
                    content: treatmentPrompt,
                },
            ];

            const treatmentResponse = await callOpenAIJson(treatmentMessages, 2200);
            stageTwo = parseOpenAIJson(treatmentResponse.choices[0].message.content, 'treatment stage');
        }

        const finalResult = mergeDiagnosisResult({
            stageOne,
            stageTwo,
            plantNetResult,
            category,
            language,
            malaysiaCropInfo,
            speciesAssessment,
            imageQuality,
        });

        console.log('âœ… Analysis complete');
        return finalResult;

        // Build enhanced context with Malaysian agricultural knowledge
        let enhancedContext = '';

        if (plantNetResult) {
            const commonName = plantNetResult.commonNames.length > 0
                ? plantNetResult.commonNames.join(', ')
                : 'Unknown';

            enhancedContext = isMalay
                ? `SPESIES DIKENAL PASTI (melalui PlantNet):
- Nama Saintifik: ${plantNetResult.scientificName}
- Nama Biasa: ${commonName}
- Famili: ${plantNetResult.family}
- Genus: ${plantNetResult.genus}
- Keyakinan PlantNet: ${plantNetResult.confidence}%

Spesies telah disahkan dengan keyakinan ${plantNetResult.confidence}%.`
                : `IDENTIFIED SPECIES (via PlantNet):
- Scientific Name: ${plantNetResult.scientificName}
- Common Name: ${commonName}
- Family: ${plantNetResult.family}
- Genus: ${plantNetResult.genus}
- PlantNet Confidence: ${plantNetResult.confidence}%

The species has been confirmed with ${plantNetResult.confidence}% confidence.`;
        }

        // Add Malaysia-specific crop information if available
        if (malaysiaCropInfo) {
            const info = malaysiaCropInfo.info;
            enhancedContext += isMalay ? `

MAKLUMAT TANAMAN MALAYSIA (${malaysiaCropInfo.cropType.toUpperCase()}):

Varieti Biasa di Malaysia:
${info.commonVarieties.map(v => `- ${v}`).join('\n')}

Kawasan Penanaman Utama:
${info.growingRegions.join(', ')}

Keperluan Tanah:
${info.soilType}

Keperluan Iklim:
${info.climate}

Penyakit Biasa di Malaysia:
${info.commonDiseases.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Isu Nutrien Biasa:
${info.nutrientIssues.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Baja Tempatan yang Disyorkan:
${info.localFertilizers.join(', ')}

Musim Tuai:
${info.harvestSeason}` : `

MALAYSIA CROP INFORMATION (${malaysiaCropInfo.cropType.toUpperCase()}):

Common Varieties in Malaysia:
${info.commonVarieties.map(v => `- ${v}`).join('\n')}

Main Growing Regions:
${info.growingRegions.join(', ')}

Soil Requirements:
${info.soilType}

Climate Requirements:
${info.climate}

Common Diseases in Malaysia:
${info.commonDiseases.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Common Nutrient Issues:
${info.nutrientIssues.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Recommended Local Fertilizers:
${info.localFertilizers.join(', ')}

Harvest Season:
${info.harvestSeason}`;
        }

        // Add monsoon season context
        const currentMonth = new Date().getMonth() + 1; // 1-12
        let monsoonContext = '';

        if (currentMonth >= 11 || currentMonth <= 3) {
            monsoonContext = isMalay
                ? '\nMUSIM SEMASA: Monsun Timur Laut (November-Mac) - Hujan lebat di Pantai Timur. Pastikan saliran yang baik, kurangkan penggunaan baja, tingkatkan pemantauan penyakit kulat.'
                : '\nCURRENT SEASON: Northeast Monsoon (Nov-Mar) - Heavy rainfall on East Coast. Ensure good drainage, reduce fertilizer application, increase fungal disease monitoring.';
        } else if (currentMonth >= 5 && currentMonth <= 9) {
            monsoonContext = isMalay
                ? '\nMUSIM SEMASA: Monsun Barat Daya (Mei-Sep) - Tempoh pertumbuhan optimum. Tingkatkan penggunaan baja, masa yang baik untuk penanaman.'
                : '\nCURRENT SEASON: Southwest Monsoon (May-Sep) - Optimal growth period. Increase fertilization, good time for planting.';
        } else {
            monsoonContext = isMalay
                ? '\nMUSIM SEMASA: Antara Monsun (April/Oktober) - Hujan petir yang kerap. Tekanan penyakit tinggi, gunakan racun kulat pencegahan.'
                : '\nCURRENT SEASON: Inter-monsoon (Apr/Oct) - Frequent thunderstorms. High disease pressure, apply preventive fungicides.';
        }

        enhancedContext += monsoonContext;

        // Add local supplier information
        enhancedContext += isMalay ? `

PEMBEKAL MALAYSIA:
Baja: ${MALAYSIA_SUPPLIERS.fertilizers.slice(0, 3).join(', ')}
Agensi Kerajaan: ${MALAYSIA_SUPPLIERS.govtAgencies.slice(0, 3).join(', ')}` : `

MALAYSIA SUPPLIERS:
Fertilizers: ${MALAYSIA_SUPPLIERS.fertilizers.slice(0, 3).join(', ')}
Government Agencies: ${MALAYSIA_SUPPLIERS.govtAgencies.slice(0, 3).join(', ')}`;

        const languageInstruction = isMalay
            ? 'PENTING: Berikan SEMUA respons dalam Bahasa Malaysia. Gunakan istilah pertanian Malaysia yang betul.'
            : isChinese
                ? 'CRITICAL: Provide ALL responses in Simplified Chinese (简体中文). Use appropriate Chinese agricultural terminology. Every text field in the JSON must be in Chinese.'
                : 'Provide responses in English using Malaysian agricultural terminology where appropriate.';


        const fewShotExamples = buildAnalyzeFewShotExamples(language);


        // If PlantNet failed, we rely on the AI model as the Primary Backup for identification
        const identificationInstruction = !plantNetResult
            ? (isMalay
                ? "PENTING: Identifikasi spesies tumbuhan ini dengan tepat. PlantNet gagal, jadi anda adalah model sandaran utama. Berikan 'Nama Tempatan (Nama Saintifik)'."
                : "IMPORTANT: Identify this plant species accurately. PlantNet failed, so you are the primary backup model. Provide 'Common Name (Scientific Name)'.")
            : "";

        const messages = [
            {
                role: 'system',
                content: `You are a Malaysian agricultural expert specializing in tropical crop diseases and nutrient management. You have deep knowledge of Malaysian growing conditions, monsoon patterns, soil types, local fertilizers, and common pests/diseases specific to Malaysia. ${languageInstruction}

You provide practical, actionable advice tailored to Malaysian farmers, considering:
- Local climate and monsoon seasons
- Readily available Malaysian fertilizer brands
- Malaysian government agricultural extension services
- Regional variations across Peninsula, Sabah, and Sarawak
- Specific city or district characteristics when provided (e.g., rainfall in Kuching, soil in Cameron Highlands)`
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `${enhancedContext}
📍 ${isMalay ? 'LOKASI' : isChinese ? '位置' : 'LOCATION'}: ${userLocation || 'Malaysia'}

CRITICAL: You must provide the response STRICTLY in ${isMalay ? 'BAHASA MELAYU' : isChinese ? 'SIMPLIFIED CHINESE (简体中文)' : 'ENGLISH'}. Do not mix languages. Every single text field must be in this language.

${identificationInstruction}

${isMalay ? 'Analisis tumbuhan ini untuk penyakit, perosak, dan isu pemakanan dengan fokus kepada konteks lokasi tersebut di Malaysia.' : isChinese ? '请分析该植物的病害、害虫和营养问题，重点关注马来西亚该具体地点的背景。所有文本字段必须使用简体中文。' : 'Analyze this plant for diseases, pests, and nutritional issues with focus on that specific Malaysian location context.'}

${leafImage ? (isMalay ? `PENTING: Dua gambar telah diberikan:
1. Gambar penuh tumbuhan (konteks keseluruhan)
2. Gambar dekat daun (analisis terperinci)` : `IMPORTANT: Two images provided:
1. Full plant image (overall context)
2. Leaf close-up (detailed analysis)`) : ''}


CRITICAL ANALYSIS REQUIREMENTS:
1. Identify the specific disease or deficiency. IF HEALTHY, STATE "HEALTHY" or "Sihat". DO NOT INVENT DISEASES.
2. Consider climate and current monsoon season for the specific location provided.
3. Recommend locally available fertilizers/treatments ONLY if relevant to this specific plant.
4. Provide location-specific advice for the user's city/region if provided, otherwise for general Malaysia.
5. Include preventive measures suitable for tropical climate.
6. Reference Malaysian agricultural standards where applicable.
7. Avoid generic advice; be specific to the identified plant species.
8. DO NOT use emojis in any text fields. Use plain text only.
9. DO NOT mention specific stores, suppliers, or companies in the text. Only mention the product name or active ingredient.
10. STRICT DIAGNOSTIC MATRIX - You MUST apply these visual rules to differentiate similar conditions:
    - Nitrogen (N) Deficiency: Uniform yellowing starting on older/lower leaves.
    - Potassium (K) Deficiency: Yellowing or burning (necrosis) at leaf edges/margins of older leaves.
    - Magnesium (Mg) Deficiency: Interveinal chlorosis (yellowing between green veins) on older leaves.
    - Iron (Fe)/Calcium (Ca) Deficiency: Symptoms appear on NEW/upper leaves (Fe: interveinal chlorosis, Ca: curling/necrotic tips).
    - Fungal Disease: Circular/irregular necrotic spots, often with characteristic colored margins (halos) or visible spores.
    - Bacterial Disease: Water-soaked lesions, angular spots strictly constrained by leaf veins.
    - Viral Disease: Mosaic patterns (mottling), leaf distortion/curling. Very rarely has distinct necrotic spots or halos.
11. CHAIN OF THOUGHT: You MUST systematically analyze the visual evidence by filling out the "diagnosticReasoning" object BEFORE making a final diagnosis in the "disease" field.
12. CONSISTENCY RULE: If "healthStatus" is "Healthy"/"Sihat", then "severity" MUST be "mild" and "disease" MUST be "No Issues" or "Tiada Masalah". NEVER combine "Healthy" with "Severe" or "Unhealthy".
13. MANDATORY JUSTIFICATION: In "additionalNotes", provide a short, friendly justification (e.g., "We estimate your plant is healthy because the leaves show vibrant green growth without signs of pests"). DO NOT be overly technical; keep it simple and encouraging (MAX 2-3 sentences). This is displayed as "Idea Utama" to the user.
14. CRITICAL - FERTILIZER NAMES: In "fertilizerRecommendations", ALWAYS provide SPECIFIC product names (e.g., "NPK 15-15-15", "Urea 46%", "Baja Organik Ayam", "MOP (Muriate of Potash)"). NEVER use generic words like "Chemical", "Organic", "Kimia", "Organik", "Fertilizer", or "Baja" as the fertilizerName. If you don't know a specific product, use descriptive names like "NPK Compound 12-12-17" or "Poultry Manure Organic".
15. CRITICAL - ARRAY POPULATION: ALL array fields (symptoms, immediateActions, treatments, prevention, dailyCare, weeklyCare, monthlyCare, bestPractices) MUST contain at least 2-4 items. DO NOT leave arrays empty or with single items.
16. CRITICAL - NUTRIENT DEFICIENCY: If you identify ANY nutrient deficiency (yellowing, stunted growth, leaf discoloration), you MUST:
    - Set "nutritionalIssues.hasDeficiency": true
    - Fill "nutritionalIssues.deficientNutrients" array with detailed objects
    - Set "pathogenType" to "Environmental" or "Nutritional"
    - Provide "fertilizerRecommendations" array with 2-3 specific fertilizers
17. HEALTHY PLANTS CARE: If plant is healthy, you MUST still provide "healthyCarePlan" with complete dailyCare, weeklyCare, monthlyCare, and bestPractices arrays (minimum 3 items each).

${isMalay ? 'Format respons dalam JSON:' : 'Format response as JSON:'}
{
  "diagnosticReasoning": {
    "leafLocationAnalysis": "${isMalay ? 'adakah simptom pada daun lama atau baru?' : isChinese ? '症状出现在老叶还是新叶上？' : 'are symptoms on older or newer leaves?'}",
    "symptomPatternAnalysis": "${isMalay ? 'adakah kekuningan seragam, celah urat, atau tompokan?' : isChinese ? '发黄是均匀的、脉间的还是斑点状的？' : 'is yellowing uniform, interveinal, or spotted?'}",
    "lesionAnalysis": "${isMalay ? 'bentuk tompok, ada halo atau spora? (jika ada)' : isChinese ? '斑点形状，是否有晕圈或孢子？（如果有）' : 'shape of lesions, halos, or spores? (if any)'}",
    "conclusion": "${isMalay ? 'kesimpulan berdasarkan matriks' : isChinese ? '基于矩阵的结论' : 'conclusion based on the diagnostic matrix'}"
  },
  "disease": "${isMalay ? 'IDENTIFIER RINGKAS (MAX 3 PATAH PERKATAAN). Cth: "Kulat Daun", "Reput Buah", "Tiada Masalah". DILARANG tulis ayat panjang di sini.' : isChinese ? '简短标识符（最多3个词）。例如：“叶锈病”、“果实腐烂”、“无问题”。此处请勿写长句子。' : 'SHORT IDENTIFIER (MAX 3 WORDS). e.g. "Leaf Rust", "Fruit Rot", "No Issues". DO NOT write long sentences here.'}",
  "additionalNotes": "${isMalay ? 'IDEA UTAMA (WAJIB): Berikan huraian mesra pengguna tentang bagaimana anggaran dibuat (Cth: "Kami perhatikan daun anda hijau dan tiada tanda serangga, kami anggarkan ia sihat 90%"). Beri galakan. (MAX 2-3 ayat).' : isChinese ? '核心建议（必填）：以友好的方式说明诊断依据（例如：“我们注意到您的叶片呈鲜绿色且无虫害迹象，因此我们估计植物 90% 健康”）。请保持语气友好且带有鼓励性（最多2-3句话）。' : 'KEY IDEA (MANDATORY): Provide a user-friendly explanation of how the estimate was made (e.g. "We noticed your leaves are green and pest-free, so we estimate it is 90% healthy"). Keep it friendly and encouraging. (MAX 2-3 sentences).'} ",
  "healthStatus": "Healthy / Unhealthy",
  "severity": "mild / moderate / severe",
  "confidence": 85,
  "plantType": "${isMalay ? 'Nama Biasa Malaysia (Nama Saintifik) - Cth: Cili (Capsicum annuum). WAJIB berikan nama biasa.' : isChinese ? '马来西亚常用名称（学名） - 例如：辣椒 (Capsicum annuum)。必须提供常用名称。' : 'Malaysian Common Name (Scientific Name) - e.g. Chili (Capsicum annuum). MUST provide common name.'}",
  "malaysianContext": {
    "variety": "${isMalay ? 'Varieti tempatan (Hanya jika yakin, jangan teka)' : isChinese ? '本地品种（仅在确定时提供，请勿猜测）' : 'Local variety (Only if confident, do not guess)'}",
    "region": "${isMalay ? 'Kawasan penanaman utama' : isChinese ? '主要种植区域' : 'Main growing regions'}",
    "seasonalConsideration": "${isMalay ? 'Pertimbangan musim semasa' : isChinese ? '当前季节注意事项' : 'Current seasonal considerations'}"
  },
  "pathogenType": "Fungal/Bacterial/Viral/Pest/Environmental/Multiple/None",
  "symptoms": ["${isMalay ? 'Tompok hitam' : isChinese ? '叶片黑点' : 'Black spots'}"],
  "immediateActions": ["${isMalay ? 'Tindakan segera 1' : isChinese ? '紧急措施 1' : 'Immediate action 1'}"],
  "treatments": ["${isMalay ? 'Rawatan' : isChinese ? '治疗方案' : 'Treatment'}"],
  "prevention": ["${isMalay ? 'Pencegahan' : isChinese ? '预防措施' : 'Prevention'}"],
  "healthyCarePlan": {
    "dailyCare": ["${isMalay ? 'Siram awal pagi' : isChinese ? '清晨浇水' : 'Water early morning'}"],
    "weeklyCare": ["${isMalay ? 'Periksa perosak' : isChinese ? '检查害虫' : 'Check for pests'}"],
    "monthlyCare": ["${isMalay ? 'Baja ringan' : isChinese ? '施轻量肥' : 'Light fertilizer'}"],
    "bestPractices": ["${isMalay ? 'Pastikan saliran baik' : isChinese ? '确保排水良好' : 'Ensure good drainage'}"]
  },
  "nutritionalIssues": {
    "hasDeficiency": true/false,
    "severity": "Mild/Moderate/Severe",
    "symptoms": ["${isMalay ? 'Kekuningan' : isChinese ? '叶片发黄' : 'Yellowing'}"],
    "deficientNutrients": [{
      "nutrient": "Nitrogen/Phosphorus/Potassium/Micronutrients",
      "severity": "Mild/Moderate/Severe",
      "symptoms": ["${isMalay ? 'Gejala khusus' : isChinese ? '具体症状' : 'Specific symptom'}"],
      "recommendations": ["${isMalay ? 'Cadangan' : isChinese ? '建议' : 'Recommendation'}"]
    }]
  },
  "fertilizerRecommendations": [{
    "fertilizerName": "NPK 15-15-15",
    "type": "Organic/Chemical",
    "applicationMethod": "${isMalay ? 'Cara aplikasi' : isChinese ? '施肥方法' : 'Application method'}",
    "frequency": "${isMalay ? 'Kekerapan' : isChinese ? '频率' : 'Frequency'}",
    "amount": "${isMalay ? 'Dos' : isChinese ? '剂量' : 'Dosage'}"
  }],
  "malaysianGovernmentSupport": {
    "recommendedAgency": "DOA/MARDI/MPOB/LGM",
    "services": ["${isMalay ? 'Perkhidmatan' : isChinese ? '相关服务' : 'Available services'}"],
    "contactInfo": "${isMalay ? 'Cara hubung' : isChinese ? '联系方式' : 'How to get assistance'}"
  },
  "economicImpact": {
    "estimatedYieldLoss": "${isMalay ? 'Anggaran kehilangan hasil' : isChinese ? '预计减产情况' : 'Estimated yield loss'}",
    "treatmentCost": "RM 50 - 100",
    "roi": "High"
  },
  "productSearchTags": ["${isMalay ? 'baja' : isChinese ? '肥料' : 'fertilizer'}", "${isMalay ? 'racun kulat' : isChinese ? '杀菌剂' : 'fungicide'}"]
}

IMPORTANT RULES:
- Only diagnose what you clearly see in the images
- Use Malaysian fertilizer brands and products with SPECIFIC names (NPK 15-15-15, not "Chemical")
- Consider current monsoon season in recommendations
- Provide realistic cost estimates in Malaysian Ringgit (RM)
- Reference local government support where appropriate
- Be honest if you're uncertain - better to recommend expert consultation
- All advice must be practical and implementable in Malaysian conditions
- CRITICAL: If you diagnose a nutrient deficiency (e.g., 'Kekurangan Kalsium'), you MUST set 'hasDeficiency': true and fill the 'nutritionalIssues' object with COMPLETE details including deficientNutrients array. The 'Pemakanan' tab relies on this data.
- CRITICAL: For nutrient deficiencies, set 'pathogenType' to "Environmental" or "Nutritional" and DO NOT identify a fungus type unless a secondary infection is clearly visible.
- CRITICAL: ALWAYS populate arrays with MULTIPLE items (2-4 minimum). Single-item arrays or empty arrays are NOT acceptable.
- CRITICAL: For healthy plants, ALWAYS provide healthyCarePlan with complete dailyCare, weeklyCare, monthlyCare, and bestPractices (3+ items each).
- CRITICAL: fertilizerRecommendations must use SPECIFIC product names, never generic words like "Chemical" or "Organic".
- CRITICAL: "productSearchTags" MUST be an array of 2-5 distinct, single-word or hyphenated-word product search tags (e.g. ["fungicide", "neem-oil", "fertilizer"]) based on the diagnosed issue. These MUST be primarily in English for the WooCommerce search engine regardless of the user language.

FEW-SHOT EXAMPLES FOR STYLE, LANGUAGE, AND DATA SPECIFICITY:
${fewShotExamples}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: treeImage,
                            detail: 'high'
                        }
                    }
                ]
            }
        ];

        if (leafImage) {
            messages[1].content.push({
                type: 'image_url',
                image_url: {
                    url: leafImage,
                    detail: 'high'
                }
            });
        }

        // Call GPT with model fallback (gpt-4o-mini primary, GPT-5 mini backup)
        let model = 'gpt-4o-mini';
        let response;

        try {
            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: messages,
                max_tokens: 4000,
                temperature: 0.3,
            });
        } catch (primaryError) {
            console.error(`⚠️ Primary analysis model (${model}) failed:`, primaryError.message, primaryError.status ? `(Status: ${primaryError.status})` : '');

            // Fallback to GPT-5 mini if 4o-mini fails
            console.log('⚠️ Primary model unavailable, using backup...');
            model = 'gpt-5-mini';

            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: messages,
                max_tokens: 4000,
                temperature: 0.3,
            });
        }

        const content = response.choices[0].message.content;

        // Robust JSON Parsing
        const cleanedContent = cleanJsonString(content);
        const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('❌ Failed to extract JSON from analysis response. Raw content:', content.substring(0, 200) + '...');
            throw new Error('Failed to parse AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        console.log('✅ Analysis complete');
        return ensureCarePlan(normalizedResult, language);

    } catch (error) {
        console.error('❌ GPT Analysis failed:', error.message, error.status ? `(Status: ${error.status})` : '');
        throw error;
    }
}

/**
 * Default Care Plans for Fallback (Server-Side)
 */
const DEFAULT_CARE_PLANS = {
    en: {
        dailyCare: ["Check soil moisture daily", "Ensure adequate sunlight exposure"],
        weeklyCare: ["Inspect for pests or diseases", "Remove dead or yellowing leaves"],
        monthlyCare: ["Apply balanced fertilizer", "Check soil drainage"],
        bestPractices: ["Keep garden clean from weeds", "Rotate crops if possible to prevent soil depletion"]
    },
    ms: {
        dailyCare: ["Periksa kelembapan tanah setiap hari", "Pastikan pendedahan cahaya matahari yang mencukupi"],
        weeklyCare: ["Periksa tanda-tanda perosak atau penyakit", "Buang daun mati atau kekuningan"],
        monthlyCare: ["Gunakan baja seimbang", "Periksa saliran tanah"],
        bestPractices: ["Pastikan kebun bebas daripada rumpai", "Amalkan giliran tanaman jika boleh"]
    },
    zh: {
        dailyCare: ["\u6bcf\u65e5\u68c0\u67e5\u571f\u58e4\u6e7f\u5ea6", "\u786e\u4fdd\u5145\u8db3\u7684\u65e5\u7167"],
        weeklyCare: ["\u68c0\u67e5\u75c5\u866b\u5bb3\u8feb\u8c61", "\u6e05\u9664\u67af\u53f6\u6216\u9ec4\u53f6"],
        monthlyCare: ["\u65bd\u7528\u5747\u8861\u80a5\u6599", "\u68c0\u67e5\u571f\u58e4\u6392\u6c34"],
        bestPractices: ["\u4fdd\u6301\u82b1\u56ed\u65e0\u6742\u8349", "\u5c3d\u53ef\u80fd\u8f6e\u4f5c\u4ee5\u9632\u6b62\u571f\u58e4\u8017\u7aed"]
    }
};

/**
 * Ask general agricultural question
 */
export async function askAI(question, language, recentNotes = [], recentAlerts = []) {
    const contextSummary = buildAskAIContextSummary(recentNotes, recentAlerts, language);
    const userPrompt = contextSummary
        ? `Farmer question:\n${question}\n\nRelevant farm context:\n${contextSummary}\n\nUse the context only when it is relevant to the answer.`
        : question;
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a helpful agricultural expert. Answer the user's question concisely (max 3-4 sentences). 
                ${language === 'ms' ? 'Provide answer in Bahasa Malaysia.' : language === 'zh' ? 'Provide answer in Simplified Chinese (简体中文).' : 'Provide answer in English.'}`
            },
            { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.5
    });
    return response.choices[0].message.content;
}

/**
 * Helper to ensure healthyCarePlan exists and healthStatus is standardized
 */
function ensureCarePlan(result, language) {
    // 1. Standardize healthStatus to be machine-readable (lowercase 'healthy' or 'unhealthy')
    const rawStatus = (result.healthStatus || '').toLowerCase();
    const healthyKeywords = ['healthy', 'sihat', 'tiada masalah', '健康', '无问题', '未检测到问题', 'normal', 'tiada penyakit', 'pokok elok'];

    // Explicitly map status for consistency
    const isActuallyHealthy = healthyKeywords.some(keyword => rawStatus.includes(keyword)) ||
        (result.disease && healthyKeywords.some(keyword => result.disease.toLowerCase().includes(keyword)));

    result.healthStatus = isActuallyHealthy ? 'healthy' : 'unhealthy';

    // 2. Ensure care plan exists for healthy plants or as general fallback
    if (!result.healthyCarePlan ||
        !result.healthyCarePlan.dailyCare ||
        result.healthyCarePlan.dailyCare.length === 0) {

        console.warn('⚠️ AI omitted healthyCarePlan, injecting server-side fallback.');

        // Select language (default to 'en' if not 'ms' or 'zh')
        const langCode = language === 'ms' ? 'ms' : language === 'zh' ? 'zh' : 'en';

        // Inject default plan
        result.healthyCarePlan = DEFAULT_CARE_PLANS[langCode];
    }
    return result;
}

/**
 * GPT-5 mini Product Recommendation Engine
 * Takes disease diagnosis info + available WooCommerce tags & categories
 * Returns two separate lists: treatment tag/category IDs and nutrition tag/category IDs
 * @param {Object} diagnosisInfo - { disease, healthStatus, pathogenType, plantType, symptoms, treatments }
 * @param {Array} availableTags - Array of { id, name } from WooCommerce
 * @param {Array} availableCategories - Array of { id, name } from WooCommerce
 * @returns {Promise<Object>} { treatmentTagIds, treatmentCategoryIds, nutritionTagIds, nutritionCategoryIds, reasoning }
 */
export async function recommendProductTags(diagnosisInfo, availableTags, availableCategories = []) {
    if ((!availableTags || availableTags.length === 0) && (!availableCategories || availableCategories.length === 0)) {
        console.warn('⚠️ No WooCommerce tags/categories available for product recommendation.');
        return { treatmentTagIds: [], treatmentCategoryIds: [], nutritionTagIds: [], nutritionCategoryIds: [] };
    }

    // Cache key based on comprehensive diagnosis signature to prevent cross-crop collisions
    const safePlantType = (diagnosisInfo.plantType || 'unknown').toLowerCase().replace(/\s+/g, '-');
    const safeDisease = (diagnosisInfo.disease || 'none').toLowerCase().replace(/\s+/g, '-');
    const safeStatus = (diagnosisInfo.healthStatus || 'unknown').toLowerCase();
    const safePathogen = (diagnosisInfo.pathogenType || 'none').toLowerCase().replace(/\s+/g, '-');
    const safeSearchTags = Array.isArray(diagnosisInfo.productSearchTags)
        ? diagnosisInfo.productSearchTags.join('-').toLowerCase()
        : 'no-tags';

    const cacheKey = `rec_${safePlantType}_${safeDisease}_${safeStatus}_${safePathogen}_${safeSearchTags}`;
    const cached = recommendationCache.get(cacheKey);
    if (cached) {
        console.log(`🧠 GPT-5 mini recommendation cache HIT for: ${cacheKey}`);
        return cached;
    }

    try {
        console.log('🛒 GPT-5 mini: Recommending products based on diagnosis...');

        // Build compact catalogs for the prompt
        const tagCatalog = (availableTags || [])
            .map(t => `[TAG:${t.id}] ${t.name}`)
            .join('\n');

        const categoryCatalog = (availableCategories || [])
            .map(c => `[CAT:${c.id}] ${c.name}`)
            .join('\n');

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are an agricultural product recommendation expert for a Malaysian e-commerce store. Given a plant disease diagnosis, you must select the most relevant product tags AND categories from the store's catalog.

You MUST split your recommendations into THREE groups:
1. **Treatment**: Products to treat the diagnosed disease/issue (fungicides, disease control, pest control, soil treatment, recovery products)
2. **Fertilizer**: Primary nutrients and base fertilizers (NPK, compost, organic-fertilizer, urea, potash, phosphate)
3. **Supplement**: Secondary nutrients, bio-stimulants, and enhancers (trace-elements, seaweed extract, humic acid, amino acids, root boosters)

Rules:
- Select 1-3 tag IDs AND 1-2 category IDs for EACH group (if applicable)
- CRITICAL: Even if the plant is healthy, you MUST ALWAYS return at least 1-2 IDs for 'fertilizer' OR 'supplement' so the user always gets an enhancement recommendation.
- IMPORTANT: You MUST heavily prioritize selecting WooCommerce Tags/Categories that contain or exactly match the "EXPLICIT PRODUCT SEARCH HINTS" provided below.
- For healthy plants: treatment group can be empty, but focus on fertilizer and supplement.
- For unhealthy plants: treatment group should address the specific disease.
- Return ONLY IDs that exist in the provided catalogs
- Output valid JSON only`
                },
                {
                    role: 'user',
                    content: `PLANT DIAGNOSIS:
- Plant Type: ${diagnosisInfo.plantType || 'Unknown'}
- Disease: ${diagnosisInfo.disease || 'None'}
- Health Status: ${diagnosisInfo.healthStatus || 'unknown'}
- Pathogen Type: ${diagnosisInfo.pathogenType || 'None'}
- Symptoms: ${Array.isArray(diagnosisInfo.symptoms) ? diagnosisInfo.symptoms.join(', ') : (diagnosisInfo.symptoms || 'None')}
- Treatments Suggested: ${Array.isArray(diagnosisInfo.treatments) ? diagnosisInfo.treatments.join(', ') : (diagnosisInfo.treatments || 'None')}

🎯 EXPLICIT PRODUCT SEARCH HINTS (Use these strict keywords to immediately find matching tags below):
${Array.isArray(diagnosisInfo.productSearchTags) ? diagnosisInfo.productSearchTags.join(', ') : (diagnosisInfo.productSearchTags || 'None')}

AVAILABLE PRODUCT TAGS:
${tagCatalog}

AVAILABLE PRODUCT CATEGORIES:
${categoryCatalog}

Return JSON with three separate recommendation groups:
{
  "treatment": {
    "tagIds": [123],
    "categoryIds": [10]
  },
  "fertilizer": {
    "tagIds": [456],
    "categoryIds": [30]
  },
  "supplement": {
    "tagIds": [789],
    "categoryIds": [40]
  },
  "reasoning": "Brief explanation"
}`
                }
            ],
            max_tokens: 600,
            temperature: 0.3,
        });

        const content = response.choices[0].message.content;
        const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('❌ GPT-5 mini product recommendation: Failed to parse response');
            return { treatmentTagIds: [], treatmentCategoryIds: [], fertilizerTagIds: [], fertilizerCategoryIds: [], supplementTagIds: [], supplementCategoryIds: [] };
        }

        const result = JSON.parse(jsonMatch[0]);

        const output = {
            treatmentTagIds: result.treatment?.tagIds || [],
            treatmentCategoryIds: result.treatment?.categoryIds || [],
            fertilizerTagIds: result.fertilizer?.tagIds || [],
            fertilizerCategoryIds: result.fertilizer?.categoryIds || [],
            supplementTagIds: result.supplement?.tagIds || [],
            supplementCategoryIds: result.supplement?.categoryIds || [],
            reasoning: result.reasoning || ''
        };

        console.log(`✅ GPT-5 mini recommended Treatment: ${output.treatmentTagIds.length} | Fertilizer: ${output.fertilizerTagIds.length} | Supplement: ${output.supplementTagIds.length}`);
        console.log(`   Reason: ${output.reasoning}`);

        // Cache this recommendation
        recommendationCache.set(cacheKey, output);

        return output;

    } catch (error) {
        console.error('❌ GPT-5 mini product recommendation failed:', error.message);
        return { treatmentTagIds: [], treatmentCategoryIds: [], nutritionTagIds: [], nutritionCategoryIds: [] };
    }
}

/**
 * ----------------------------------------------------------------------------------
 * PHASE 3 & 4: FARM INTELLIGENCE & MANAGER AI FEATURES
 * ----------------------------------------------------------------------------------
 */

/**
 * 1. AI Agronomist Insights
 * Analyzes recent farm logs, alerts, and harvest data to provide weekly insights.
 */
export async function generateAgronomistInsights(logs, alerts, harvestData, plots = [], checklistPct = 0, language = 'en') {
    try {
        console.log('🤖 Generating AI Agronomist Insights...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are a virtual agronomist operating in Malaysia. Analyze the farmer's raw data and generate a brief, actionable intelligence report. 
Language requirement: ${language === 'ms' ? 'MUST BE IN BAHASA MALAYSIA.' : language === 'zh' ? 'MUST BE IN SIMPLIFIED CHINESE (简体中文).' : 'MUST BE IN ENGLISH.'}
Context rules:
- Farm Plots Context: ${JSON.stringify(plots)}. If applicable, use the farm size to estimate pesticide/fertilizer spray volume requirements.
- GAP Compliance Score: ${checklistPct}%. If below 80%, recommend farm hygiene, field training, or record-keeping improvements before advanced solutions.
- Formatting: Always use authentic Malaysian agricultural terminology (e.g., 'Baja Kopi', 'Racun Serangga', 'Musang King', 'SOP GAP').
Output MUST be in the specified language (${language}) and follow this JSON structure: 
- "summary" (A 2-3 sentence overview of farm health and activity summary)
- "recommendations" (Array of 2-3 specific action items based on the data, e.g., "Pruning quality seems low on Plot A, consider structural pruning training")
- "yieldAnalysis" (A 1-2 sentence evaluation of recent harvests and quality grades, e.g., "Musang King yield is up 15% with 80% Grade A quality")`
                },
                {
                    role: 'user',
                    content: `Here is the data for the last 7 days:
Logs: ${JSON.stringify(logs)}
Active Alerts: ${JSON.stringify(alerts)}
Recent Harvests: ${JSON.stringify(harvestData)}

Generate the insights report in JSON format.`
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Insight Generation failed:', error.message);
        throw error;
    }
}

/**
 * 2. Smart Treatment SOP Generator
 * Generates an actionable standard operating procedure for a given crop disease.
 */
export async function generateTreatmentSOP(crop, disease, severity, language = 'en') {
    try {
        console.log(`🤖 Generating Treatment SOP for ${disease} on ${crop}...`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are an expert Malaysian agricultural auditor. A farmer needs a Standard Operating Procedure (SOP) to treat a crop issue. 
Language requirement: ${language === 'ms' ? 'MUST BE IN BAHASA MELAYU.' : language === 'zh' ? 'MUST BE IN SIMPLIFIED CHINESE (简体中文).' : 'MUST BE IN ENGLISH.'}
Rules:
1. ONLY recommend active chemical ingredients that are approved by the Malaysian Department of Agriculture (DOA) for this crop.
2. Provide integrated pest management (IPM) non-chemical techniques alongside chemical advice.
3. Use authentic local Malaysian terminology where appropriate (e.g., 'Racun kulat', 'Semburan daun').
Output MUST be a JSON object with:
- "treatmentPlan": Array of strings (3-5 step-by-step instructions)
- "recommendedChemicals": Array of strings (1-3 distinct active ingredients or local pesticide/fungicide names)`
                },
                {
                    role: 'user',
                    content: `Generate a treatment SOP for the following issue:
Crop: ${crop}
Detected Issue/Pest: ${disease}
Severity: ${severity}

Return JSON.`
                }
            ],
            temperature: 0.2,
            max_tokens: 400
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ SOP Generation failed:', error.message);
        throw error;
    }
}

/**
 * 3. Natural Language Activity Logging
 * Parses unstructured text into a structured mygap_logs object.
 */
export async function parseNaturalLanguageLog(text, language = 'en') {
    try {
        console.log(`🤖 Auto-Enhance Request: "${text.substring(0, 50)}..."`);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You process unstructured dictate/notes from farmers into a highly structured JSON form schema.
Language of input: ${language}.
STRICT RULES:
1. "type" MUST exactly match one of ["note", "spray", "fertilize", "prune", "inspect", "scout", "harvest"]. Infer the best fit.
2. If the user mentions a local Malaysian term (e.g., "baja" -> fertilize, "racun" -> spray, "tuai" -> harvest), map it to the correct English type value.
3. Only extract values explicitly present in the text. Return null for missing fields.
4. If the farmer only mentions a generic product word like "chemical", "fertilizer", "baja", "organic", "kimia", "racun", "none", or "n/a" without a specific product name, set "chemicalName" to null.
Extract these exact fields (Return JSON):
- "type": String
- "plotId": String (e.g. "Plot A", "Farm 1", "Durian Block")
- "chemicalName": String (e.g. "Mancozeb", "Neem Oil", "NPK 15-15")
- "quantity": String (e.g. "20L", "5kg")
- "kg_harvested": Number (only if type is harvest)
- "price_per_kg": Number (only if type is harvest)
- "quality_grade": "A" | "B" | "C" | "Good" | "Average" | "Poor" (only if type is harvest)
- "buyer_name": String (only if type is harvest)
- "pruned_count": Number (only if type is prune)
- "pruning_type": "Thinning" | "Formative" | "Sanitary" | "Maintenance" (only if type is prune)
- "inspection_type": "Pest/Disease" | "Nutrient" | "Irrigation" | "General" (only if type is inspect)
- "inspection_status": "Good" | "Warning" | "Critical" (only if type is inspect)
- "temperature": Number (e.g. 28)
- "humidity": Number (e.g. 75)
- "disease_name": String (e.g. "Aphids", "Powdery Mildew")
- "severity": "Low" | "Moderate" | "High"
- "expense_amount": Number
- "expense_category": "Fertilizer" | "Pesticide" | "Labor" | "Equipment" | "Other"
- "notes": String (A cleaned up, professional version of the input, e.g. "Sprayed 20L Mancozeb on Plot A" instead of "sprayed 20l mancozeb plot a")`
                },
                {
                    role: 'user',
                    content: `Parse this log: "${text}"`
                }
            ],
            temperature: 0.1,
            max_tokens: 300
        });

        const content = cleanJsonString(response.choices[0].message.content);
        const parsed = normalizeParsedLogResult(JSON.parse(content));
        console.log('✅ AI Parsed Result:', JSON.stringify(parsed, null, 2));
        return parsed;
    } catch (error) {
        console.error('❌ NLP Parsing failed:', error.message);
        throw error;
    }
}

/**
 * 4. Predictive Farm Risk Assessor
 * Actively monitors recent logs and active alerts to predict imminent threats.
 */
export async function generatePredictiveRisk(plots, logs, alerts, location, language = 'en') {
    try {
        let weatherContext = "No live weather data provided.";
        
        if (location && location.lat && location.lng) {
            try {
                // Fetch next 3 days weather forecast
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`);
                if (weatherRes.ok) {
                    const weatherData = await weatherRes.json();
                    weatherContext = `Live Weather Forecast (Next 3 Days - Lat: ${location.lat}, Lng: ${location.lng}):\n`;
                    const daily = weatherData.daily;
                    if (daily && daily.time) {
                        for (let i = 0; i < daily.time.length; i++) {
                            weatherContext += `- Date: ${daily.time[i]}, Max Temp: ${daily.temperature_2m_max[i]}°C, Min Temp: ${daily.temperature_2m_min[i]}°C, Rain: ${daily.precipitation_sum[i]}mm\n`;
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch open-meteo weather:", err.message);
            }
        }

        console.log('🤖 Running AI Predictive Risk Analysis...');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: `You are a proactive agricultural AI monitor for a Malaysian farm. 
Language: ${language === 'ms' ? 'BAHASA MALAYSIA' : language === 'zh' ? 'SIMPLIFIED CHINESE' : 'ENGLISH'}.
Task: Analyze logs, alerts, farm plots, and incoming live WEATHER FORECAST.
Identify if there is an urgent, imminent risk. Diseases spread faster in high humidity/rain. If heavy rain is forecasted and the farm has recent untreated fungal alerts, escalate the risk severity.
If a high risk exists, generate a short, urgent warning. If the farm is well-managed and currently treated, return {"hasRisk": false}.
Output MUST be a JSON object:
{
  "hasRisk": boolean,
  "riskLevel": "high" | "moderate" | "none",
  "warningMessage": "Short 1-2 sentence alert stating the specific risk (e.g., Heavy rain over next 3 days will rapidly spread active fungal alert)",
  "suggestedAction": "Immediate action required (e.g., 'Apply preventive fungicide before rain', 'Urgent inspection of irrigation system')",
  "recommendedTreatment": {
    "activity": "spray | fertilize | prune | inspect",
    "chemical": "Name of specific chemical/treatment to apply, or null"
  }
}`
                },
                {
                    role: 'user',
                    content: `Data:
Plots: ${JSON.stringify(plots)}
Last 14 Days Logs: ${JSON.stringify(logs)}
Active Unacknowledged Alerts: ${JSON.stringify(alerts)}
${weatherContext}

Determine if an urgent prediction banner should be shown.`
                }
            ],
            temperature: 0.1,
            max_tokens: 300
        });

        const content = cleanJsonString(response.choices[0].message.content);
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Predictive Risk Assessment failed:', error.message);
        return { hasRisk: false };
    }
}
