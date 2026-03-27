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
export async function analyzeWithGPT4Mini(plantNetResult, treeImage, leafImage, category, language, userLocation) {
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


        const exampleSymptom = isMalay ? 'Tompok hitam pada daun' : 'Black spots on leaves';


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
- CRITICAL: "productSearchTags" MUST be an array of 2-5 distinct, single-word or hyphenated-word product search tags (e.g. ["fungicide", "neem-oil", "fertilizer"]) based on the diagnosed issue. These MUST be primarily in English for the WooCommerce search engine regardless of the user language.`
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
        return ensureCarePlan(result, language);

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
export async function askAI(question, language) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: `You are a helpful agricultural expert. Answer the user's question concisely (max 3-4 sentences). 
                ${language === 'ms' ? 'Provide answer in Bahasa Malaysia.' : language === 'zh' ? 'Provide answer in Simplified Chinese (简体中文).' : 'Provide answer in English.'}`
            },
            { role: 'user', content: question }
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

You MUST split your recommendations into TWO groups:
1. **Treatment**: Products to treat the diagnosed disease/issue (fungicides, disease control, pest control, soil treatment, recovery products)
2. **Nutrition**: Products for general plant health, growth, and maintenance (fertilizers, nutrients, growth boosters, soil conditioners)

Rules:
- Select 1-5 tag IDs AND 1-3 category IDs for EACH group (treatment and nutrition)
- CRITICAL: Even if the plant is healthy or no specific treatment exists, you MUST ALWAYS return at least 1-2 tag/category IDs for 'nutrition' (e.g. general fertilizer, soil enhancer) so the user always gets an enhancement recommendation. Never return completely empty arrays for BOTH groups.
- IMPORTANT: You MUST heavily prioritize selecting WooCommerce Tags/Categories that contain or exactly match the "EXPLICIT PRODUCT SEARCH HINTS" provided below.
- For healthy plants: treatment group can be empty, but focus heavily on nutrition.
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

Return JSON with two separate recommendation groups:
{
  "treatment": {
    "tagIds": [123, 456],
    "categoryIds": [10, 20]
  },
  "nutrition": {
    "tagIds": [789, 101],
    "categoryIds": [30]
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
            return { treatmentTagIds: [], treatmentCategoryIds: [], nutritionTagIds: [], nutritionCategoryIds: [] };
        }

        const result = JSON.parse(jsonMatch[0]);

        const output = {
            treatmentTagIds: result.treatment?.tagIds || [],
            treatmentCategoryIds: result.treatment?.categoryIds || [],
            nutritionTagIds: result.nutrition?.tagIds || [],
            nutritionCategoryIds: result.nutrition?.categoryIds || [],
            reasoning: result.reasoning || ''
        };

        console.log(`✅ GPT-5 mini recommended Treatment: ${output.treatmentTagIds.length} tags + ${output.treatmentCategoryIds.length} cats | Nutrition: ${output.nutritionTagIds.length} tags + ${output.nutritionCategoryIds.length} cats`);
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
        const parsed = JSON.parse(content);
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
