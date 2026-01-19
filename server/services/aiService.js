import OpenAI from 'openai';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { MALAYSIA_CROP_KNOWLEDGE, MALAYSIA_SUPPLIERS } from '../data/crops.js';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

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
                        content: 'You are a botanical expert specializing in plant identification. Identify the plant species from the image and provide scientific name, common names, family, and genus. Be accurate and only identify if you are confident.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Identify this plant. Category hint: ${category}. Provide response in JSON format:
{
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

            // Fallback to gpt-3.5-turbo if 4o-mini fails
            console.log('⚠️ Primary model unavailable, using backup...');
            model = 'gpt-3.5-turbo';

            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a botanical expert specializing in plant identification. Identify the plant species from the image and provide scientific name, common names, family, and genus. Be accurate and only identify if you are confident.'
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Identify this plant. Category hint: ${category}. Provide response in JSON format:
{
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
📍 ${isMalay ? 'LOKASI' : 'LOCATION'}: ${userLocation || 'Malaysia'}

CRITICAL: You must provide the response STRICTLY in ${isMalay ? 'BAHASA MELAYU' : 'ENGLISH'}. Do not mix languages.

${identificationInstruction}

${isMalay ? 'Analisis tumbuhan ini untuk penyakit, perosak, dan isu pemakanan dengan fokus kepada konteks lokasi tersebut di Malaysia.' : 'Analyze this plant for diseases, pests, and nutritional issues with focus on that specific Malaysian location context.'}

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
10. CONSISTENCY RULE: If "healthStatus" is "Healthy"/"Sihat", then "severity" MUST be "mild" and "disease" MUST be "No Issues" or "Tiada Masalah". NEVER combine "Healthy" with "Severe" or "Unhealthy".
11. MANDATORY JUSTIFICATION: In "additionalNotes", provide a short, friendly justification (e.g., "We estimate your plant is healthy because the leaves show vibrant green growth without signs of pests"). DO NOT be overly technical; keep it simple and encouraging (MAX 2-3 sentences). This is displayed as "Idea Utama" to the user.
12. CRITICAL - FERTILIZER NAMES: In "fertilizerRecommendations", ALWAYS provide SPECIFIC product names (e.g., "NPK 15-15-15", "Urea 46%", "Baja Organik Ayam", "MOP (Muriate of Potash)"). NEVER use generic words like "Chemical", "Organic", "Kimia", "Organik", "Fertilizer", or "Baja" as the fertilizerName. If you don't know a specific product, use descriptive names like "NPK Compound 12-12-17" or "Poultry Manure Organic".
13. CRITICAL - ARRAY POPULATION: ALL array fields (symptoms, immediateActions, treatments, prevention, dailyCare, weeklyCare, monthlyCare, bestPractices) MUST contain at least 2-4 items. DO NOT leave arrays empty or with single items.
14. CRITICAL - NUTRIENT DEFICIENCY: If you identify ANY nutrient deficiency (yellowing, stunted growth, leaf discoloration), you MUST:
    - Set "nutritionalIssues.hasDeficiency": true
    - Fill "nutritionalIssues.deficientNutrients" array with detailed objects
    - Set "pathogenType" to "Environmental" or "Nutritional"
    - Provide "fertilizerRecommendations" array with 2-3 specific fertilizers
15. HEALTHY PLANTS CARE: If plant is healthy, you MUST still provide "healthyCarePlan" with complete dailyCare, weeklyCare, monthlyCare, and bestPractices arrays (minimum 3 items each).

${isMalay ? 'Format respons dalam JSON:' : 'Format response as JSON:'}
{
  "disease": "${isMalay ? 'IDENTIFIER RINGKAS (MAX 3 PATAH PERKATAAN). Cth: "Kulat Daun", "Reput Buah", "Tiada Masalah". DILARANG tulis ayat panjang di sini.' : 'SHORT IDENTIFIER (MAX 3 WORDS). e.g. "Leaf Rust", "Fruit Rot", "No Issues". DO NOT write long sentences here.'}",
  "additionalNotes": "${isMalay ? 'IDEA UTAMA (WAJIB): Berikan huraian mesra pengguna tentang bagaimana anggaran dibuat (Cth: "Kami perhatikan daun anda hijau dan tiada tanda serangga, kami anggarkan ia sihat 90%"). Beri galakan. (MAX 2-3 ayat).' : 'KEY IDEA (MANDATORY): Provide a user-friendly explanation of how the estimate was made (e.g. "We noticed your leaves are green and pest-free, so we estimate it is 90% healthy"). Keep it friendly and encouraging. (MAX 2-3 sentences).'}",
  "healthStatus": "${isMalay ? 'Sihat/Tidak Sihat (WAJIB selari dengan severity)' : 'Healthy/Unhealthy (MUST align with severity)'}",
  "severity": "${isMalay ? 'mild (untuk Sihat) / moderate / severe (untuk Tidak Sihat)' : 'mild (for Healthy) / moderate / severe (for Unhealthy)'}",
  "confidence": 85,
  "plantType": "${isMalay ? 'Nama Biasa Malaysia (Nama Saintifik) - Cth: Cili (Capsicum annuum). WAJIB berikan nama biasa.' : 'Malaysian Common Name (Scientific Name) - e.g. Chili (Capsicum annuum). MUST provide common name.'}",
  "malaysianContext": {
    "variety": "${isMalay ? 'Varieti tempatan (Hanya jika yakin, jangan teka)' : 'Local variety (Only if confident, do not guess)'}",
    "region": "${isMalay ? 'Kawasan penanaman utama' : 'Main growing regions'}",
    "seasonalConsideration": "${isMalay ? 'Pertimbangan musim semasa' : 'Current seasonal considerations'}"
  },
  "pathogenType": "Fungal/Bacterial/Viral/Pest/Environmental/Multiple/None",
  "symptoms": ["${exampleSymptom}"],
  "immediateActions": ["${isMalay ? 'Tindakan segera 1' : 'Immediate action 1'}"],
  "treatments": ["${isMalay ? 'Rawatan (Fokus bahan aktif sahaja, JANGAN sebut kedai/pembekal)' : 'Treatment (Focus on active ingredients only, DO NOT mention shops/suppliers)'}"],
  "prevention": ["${isMalay ? 'Pencegahan untuk iklim Malaysia' : 'Prevention for Malaysian climate'}"],
  "healthyCarePlan": {
    "dailyCare": ["${isMalay ? 'Siram awal pagi' : 'Water early morning'}"],
    "weeklyCare": ["${isMalay ? 'Periksa perosak' : 'Check for pests'}"],
    "monthlyCare": ["${isMalay ? 'Baja ringan' : 'Light fertilizer'}"],
    "bestPractices": ["${isMalay ? 'Pastikan saliran baik' : 'Ensure good drainage'}"]
  },
  "nutritionalIssues": {
    "hasDeficiency": true/false,
    "severity": "Mild/Moderate/Severe",
    "symptoms": ["${isMalay ? 'Kekuningan pada daun' : 'Yellowing of leaves'}"],
    "deficientNutrients": [{
      "nutrient": "Nitrogen/Phosphorus/Potassium/Micronutrients",
      "severity": "Mild/Moderate/Severe",
      "symptoms": ["Specific symptom"],
      "recommendations": ["Recommendation"]
    }]
  },
  "fertilizerRecommendations": [{
    "fertilizerName": "${isMalay ? 'Nama Baja Spesifik (WAJIB: Cth: NPK 15-15-15, Urea, Baja Organik Ayam, MOP). JANGAN sesekali guna perkataan "Kimia" atau "Organik" sahaja.' : 'Specific Fertilizer Name (REQUIRED: e.g. NPK 15-15-15, Urea, Chicken Manure, MOP). NEVER use generic "Chemical" or "Organic" as the name.'}",
    "type": "Organic/Chemical",
    "applicationMethod": "${isMalay ? 'Cara aplikasi' : 'Application method'}",
    "frequency": "${isMalay ? 'Kekerapan' : 'Frequency'}",
    "amount": "${isMalay ? 'Dos' : 'Dosage'}"
  }],
  "malaysianGovernmentSupport": {
    "recommendedAgency": "${isMalay ? 'DOA/MARDI/MPOB/LGM' : 'DOA/MARDI/MPOB/LGM'}",
    "services": ["${isMalay ? 'Perkhidmatan tersedia' : 'Available services'}"],
    "contactInfo": "${isMalay ? 'Cara mendapatkan bantuan' : 'How to get assistance'}"
  },
  "economicImpact": {
    "estimatedYieldLoss": "${isMalay ? 'Anggaran kehilangan hasil jika tidak dirawat' : 'Estimated yield loss if untreated'}",
    "treatmentCost": "${isMalay ? 'Anggaran kos rawatan (RM)' : 'Estimated treatment cost (RM)'}",
    "roi": "${isMalay ? 'Pulangan pelaburan dijangka' : 'Expected return on investment'}"
  }
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
- CRITICAL: additionalNotes is MANDATORY - never leave it empty. Provide a friendly 2-3 sentence justification.
- CRITICAL: fertilizerRecommendations must use SPECIFIC product names, never generic words like "Chemical" or "Organic".`
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

        // Call GPT with model fallback (gpt-4o-mini primary, gpt-3.5-turbo backup)
        let model = 'gpt-4o-mini';
        let response;

        try {
            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: messages,
                max_tokens: 4000,
                temperature: 0.7,
            });
        } catch (primaryError) {
            console.error(`⚠️ Primary analysis model (${model}) failed:`, primaryError.message, primaryError.status ? `(Status: ${primaryError.status})` : '');

            // Fallback to gpt-3.5-turbo if 4o-mini fails
            console.log('⚠️ Primary model unavailable, using backup...');
            model = 'gpt-3.5-turbo';

            response = await openai.chat.completions.create({
                model: model,
                response_format: { type: "json_object" },
                messages: messages,
                max_tokens: 4000,
                temperature: 0.7,
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
        return result;

    } catch (error) {
        console.error('❌ GPT Analysis failed:', error.message, error.status ? `(Status: ${error.status})` : '');
        throw error;
    }
}

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
                ${language === 'ms' ? 'Provide answer in Bahasa Malaysia.' : 'Provide answer in English.'}`
            },
            { role: 'user', content: question }
        ],
        max_tokens: 300,
        temperature: 0.5
    });
    return response.choices[0].message.content;
}
