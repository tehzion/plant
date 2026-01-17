import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Body parser
app.use(express.json({ limit: '50mb' }));

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rate limiting - 10 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Plant Detector API is running',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin
    });
});

// Analyze plant endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { treeImage, category, leafImage, language } = req.body;

        if (!treeImage) {
            return res.status(400).json({ error: 'Tree image is required' });
        }

        if (!category) {
            return res.status(400).json({ error: 'Plant category is required' });
        }

        // Language-specific instructions and examples
        const isMalay = language === 'ms';

        const languageInstruction = isMalay
            ? 'PENTING: Anda MESTI memberikan SEMUA respons dalam Bahasa Malaysia. SEMUA teks termasuk nama penyakit, gejala, rawatan, dan cadangan MESTI dalam Bahasa Malaysia. Jangan gunakan perkataan Bahasa Inggeris kecuali nama saintifik Latin dalam kurungan.'
            : 'Respond entirely in English.';

        const exampleSymptom = isMalay ? 'Tompok hitam pada daun' : 'Black spots on leaves';
        const exampleAction = isMalay ? 'Buang Buah Dijangkiti: Buang semua kelapa yang terjejas untuk mencegah penyebaran' : 'Remove Infected Fruits: Dispose of all affected coconuts to prevent spread';
        const exampleTreatment = isMalay ? 'Semburan Fungisid: Guna fungisid berasaskan tembaga setiap 2 minggu' : 'Fungicide Spray: Apply copper-based fungicide every 2 weeks';
        const examplePrevention = isMalay ? 'Saliran Baik: Pastikan tanah mempunyai saliran yang baik untuk elakkan air bertakung' : 'Proper Drainage: Ensure soil has good drainage to prevent waterlogging';
        const exampleDaily = isMalay ? 'Siram Pada Pagi Hari: Siram pokok pada waktu pagi untuk elakkan penyakit kulat' : 'Water in Morning: Water plants in morning hours to prevent fungal diseases';

        const messages = [
            {
                role: 'system',
                content: `You are an expert agricultural consultant specializing in Southeast Asian plant diseases and nutrient deficiencies. ${languageInstruction}`
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `${isMalay ? 'ARAHAN PENTING: Berikan SEMUA maklumat dalam Bahasa Malaysia sahaja. Semua nama penyakit, gejala, rawatan dan cadangan MESTI dalam Bahasa Malaysia. Jangan campurkan dengan Bahasa Inggeris.' : ''}

${isMalay ? 'Analisis tumbuhan' : 'Analyze this'} ${category} ${isMalay ? 'untuk penyakit, perosak, dan isu pemakanan' : 'plant for diseases, pests, and nutritional issues'}. 

${leafImage ? (isMalay ? `PENTING: Saya telah memberikan DUA gambar:
1. Gambar PERTAMA: Pandangan keseluruhan tumbuhan (untuk konteks umum)
2. Gambar KEDUA: Gambar dekat daun (untuk analisis terperinci penyakit dan nutrien)

Gunakan KEDUA-DUA gambar untuk diagnosis yang lebih tepat.` : `IMPORTANT: I have provided TWO images:
1. FIRST image: Full plant overview (for general context)
2. SECOND image: Close-up of leaves (for detailed disease and nutrient analysis)

Use BOTH images for more accurate diagnosis.`) : ''}

${isMalay ? 'PANDUAN GEJALA KEKURANGAN NUTRIEN:' : 'NUTRIENT DEFICIENCY SYMPTOM GUIDE:'}
${isMalay ? `- Nitrogen (N): Penghijauan umum (klorosis) bermula pada daun bawah yang lebih tua; pertumbuhan terbantut
- Phosphorus (P): Daun hijau gelap atau keunguan, pertumbuhan terbantut, pembungaan lemah
- Potassium (K): Penghijauan/perang (hangus) pada tepi daun
- Iron (Fe): Penghijauan antara urat daun (klorosis interveinal) pada daun muda
- Magnesium (Mg): Klorosis interveinal pada daun tua, sering muncul dalam bentuk V
- Calcium (Ca): Pertumbuhan baru yang cacat, reput hujung bunga pada buah
- Boron (B): Hujung pertumbuhan mati, pembentukan bunga/buah lemah, struktur keseluruhan lemah` : `- Nitrogen (N): General yellowing (chlorosis) starting on older, lower leaves; stunted growth
- Phosphorus (P): Dark green or purplish leaves, stunted growth, poor flowering
- Potassium (K): Yellowing/browning (scorching) on leaf margins (edges)
- Iron (Fe): Yellowing between leaf veins (interveinal chlorosis) on young leaves
- Magnesium (Mg): Interveinal chlorosis on older leaves, often appearing as a V-shape
- Calcium (Ca): Distorted new growth, blossom end rot in fruits
- Boron (B): Dying back of growing tips, poor flower/fruit formation, weak overall structure`}

${isMalay ? 'ARAHAN ANALISIS NUTRISI:' : 'NUTRITIONAL ANALYSIS INSTRUCTIONS:'}
${isMalay ? `- Periksa gambar dekat daun dengan teliti untuk gejala kekurangan nutrien
- Bandingkan gejala yang dilihat dengan panduan di atas
- Tentukan nutrien yang kurang berdasarkan lokasi gejala (daun tua vs muda)
- Berikan cadangan baja yang spesifik dengan nisbah NPK yang sesuai
- Jika tiada gejala kekurangan, tetapkan hasDeficiency kepada false` : `- Carefully examine the leaf close-up image for nutrient deficiency symptoms
- Compare observed symptoms with the guide above
- Determine deficient nutrients based on symptom location (old vs young leaves)
- Provide specific fertilizer recommendations with appropriate NPK ratios
- If no deficiency symptoms present, set hasDeficiency to false`}

${isMalay ? 'PUNCA KEKURANGAN NUTRIEN:' : 'CAUSES OF DEFICIENCY:'}
${isMalay ? `- Tahap Tanah Rendah: Nutrien tidak mencukupi dalam tanah atau medium pertumbuhan
- pH Tidak Sesuai: Keasidan/kealkalinan tanah boleh mengunci nutrien, menjadikannya tidak tersedia
- Kesihatan Akar Lemah: Tanah lembap, pemadatan, atau penyakit menghalang pengambilan nutrien
- Ketidakseimbangan Nutrien: Lebihan satu nutrien boleh menyekat pengambilan nutrien lain (cth: terlalu banyak K menyekat Ca)` : `- Low Soil Levels: Insufficient nutrient in the soil or growing medium
- Improper pH: Soil acidity/alkalinity can lock up nutrients, making them unavailable
- Poor Root Health: Wet soil, compaction, or disease hinders nutrient uptake
- Nutrient Imbalance: Excess of one nutrient can block uptake of another (e.g., too much K blocking Ca)`}

${isMalay ? 'Berikan analisis terperinci dalam format JSON yang TEPAT' : 'Provide detailed analysis in EXACT JSON format'}.

${isMalay ? 'Struktur JSON yang diperlukan' : 'Required JSON structure'}:
{
  "disease": "${isMalay ? 'Nama penyakit atau \'Tumbuhan Sihat\'' : 'Disease name or \'Healthy Plant\''}",
  "healthStatus": "${isMalay ? 'Sihat/Tidak Sihat' : 'Healthy/Unhealthy'}",
  "severity": "${isMalay ? 'Ringan/Sederhana/Teruk (atau N/A jika sihat)' : 'Mild/Moderate/Severe (or N/A if healthy)'}",
  "confidence": 85.5,
  "plantType": "${isMalay ? 'Spesies spesifik (Latin + nama tempatan)' : 'Specific species (Latin + local name)'}",
  "pathogenType": "${isMalay ? 'Kulat/Bakteria/Virus/Perosak/Persekitaran/Tiada' : 'Fungal/Bacterial/Viral/Pest/Environmental/None'}",
  "fungusType": "${isMalay ? 'Nama patogen spesifik jika berkenaan' : 'Specific pathogen name if applicable'}",
  "estimatedAge": "${isMalay ? 'Anggaran umur' : 'Age estimate'}",
  "plantPart": "${isMalay ? 'Bahagian terjejas' : 'Affected parts'}",
  "symptoms": ["${exampleSymptom}"],
  "immediateActions": ["${exampleAction}"],
  "treatments": ["${exampleTreatment}"],
  "prevention": ["${examplePrevention}"],
  "additionalNotes": "${isMalay ? 'Pemerhatian tambahan' : 'Additional observations'}",
  "nutritionalIssues": {
    "hasDeficiency": true/false,
    "deficientNutrients": [
      {
        "nutrient": "${isMalay ? 'Nitrogen' : 'Nitrogen'}",
        "severity": "${isMalay ? 'Ringan/Sederhana/Teruk' : 'Mild/Moderate/Severe'}",
        "symptoms": ["${exampleSymptom}"],
        "recommendations": ["${isMalay ? 'Cadangan 1' : 'Recommendation 1'}"]
      }
    ]
  },
  "fertilizerRecommendations": [
    {
      "type": "NPK 15-15-15",
      "application": "${isMalay ? 'Arahan penggunaan' : 'Application instructions'}",
      "frequency": "${isMalay ? 'Kekerapan' : 'Frequency'}",
      "amount": "${isMalay ? 'Jumlah setiap pokok/ekar' : 'Amount per tree/acre'}"
    }
  ],
  "healthyCarePlan": {
    "daily": ["${exampleDaily}"],
    "weekly": ["${isMalay ? 'Penjagaan mingguan 1' : 'Weekly care 1'}"],
    "monthly": ["${isMalay ? 'Penjagaan bulanan 1' : 'Monthly care 1'}"],
    "bestPractices": ["${isMalay ? 'Amalan terbaik 1' : 'Best practice 1'}"]
  }
}

${isMalay ? 'PERATURAN KRITIKAL UNTUK KEKURANGAN NUTRIEN:' : 'CRITICAL RULE FOR NUTRIENT DEFICIENCIES:'}
${isMalay ? 'Jika masalah utama adalah kekurangan nutrien (cth: Kekurangan Mangan, Nitrogen):' : 'If the primary issue is a nutrient deficiency (e.g., Manganese, Nitrogen Deficiency):'}
1. ${isMalay ? 'Anda MESTI tetapkan "nutritionalIssues.hasDeficiency" kepada true' : 'You MUST set "nutritionalIssues.hasDeficiency" to true'}
2. ${isMalay ? 'Anda MESTI melengkapkan "nutritionalIssues.deficientNutrients"' : 'You MUST populate "nutritionalIssues.deficientNutrients"'}
3. ${isMalay ? 'Jangan tinggalkan nutritionalIssues kosong jika diagnosis ialah kekurangan nutrien' : 'Do NOT leave nutritionalIssues empty if the diagnosis is a deficiency'}

${isMalay ? 'PENTING - KETEPATAN DAN KEJUJURAN:' : 'CRITICAL - ACCURACY AND HONESTY:'}
${isMalay ? `- JANGAN paksa untuk mencari penyakit atau kekurangan nutrien jika tiada
- Tumbuhan boleh SIHAT (tiada penyakit, tiada kekurangan nutrien)
- Tumbuhan boleh mempunyai PENYAKIT SAHAJA (tanpa kekurangan nutrien)
- Tumbuhan boleh mempunyai KEKURANGAN NUTRIEN SAHAJA (tanpa penyakit)
- Tumbuhan boleh mempunyai KEDUA-DUANYA (penyakit DAN kekurangan nutrien)
- Hanya laporkan apa yang BENAR-BENAR kelihatan dalam gambar
- Jika tidak pasti, nyatakan tahap keyakinan yang rendah
- Lebih baik mengatakan "Sihat" daripada membuat diagnosis palsu` : `- DO NOT force findings of disease or nutrient deficiency if none exist
- Plants can be HEALTHY (no disease, no nutrient deficiency)
- Plants can have DISEASE ONLY (without nutrient deficiency)
- Plants can have NUTRIENT DEFICIENCY ONLY (without disease)
- Plants can have BOTH (disease AND nutrient deficiency)
- Only report what is ACTUALLY visible in the images
- If uncertain, indicate lower confidence level
- If uncertain, recommend consulting agricultural specialist`}

${isMalay ? 'PERATURAN PENTING:' : 'IMPORTANT RULES:'}
- ${isMalay ? 'Gunakan format "Tajuk: Penerangan" untuk semua item senarai' : 'Use "Title: Description" format for all list items'}
- ${isMalay ? 'Elakkan HURUF BESAR SEMUA kecuali akronim' : 'Avoid ALL CAPS except for acronyms'}
- ${isMalay ? 'Berikan maklumat yang SPESIFIK dan BOLEH DILAKSANAKAN' : 'Provide SPECIFIC and ACTIONABLE information'}
- ${isMalay ? 'Sertakan konteks tempatan untuk Malaysia/Asia Tenggara' : 'Include local context for Malaysia/Southeast Asia'}
- ${isMalay ? 'Jika tiada kekurangan nutrien, tetapkan hasDeficiency kepada false dan deficientNutrients kepada []' : 'If no nutrient deficiency, set hasDeficiency to false and deficientNutrients to []'}
- ${isMalay ? 'Sentiasa isi SEMUA medan dalam JSON, jangan tinggalkan kosong' : 'Always fill ALL fields in JSON, do not leave empty'}
${isMalay ? '- WAJIB: Semua teks mestilah dalam Bahasa Malaysia sahaja, termasuk gejala, rawatan, dan cadangan' : ''}
${leafImage ? (isMalay ? '- GUNAKAN kedua-dua gambar untuk diagnosis yang lebih tepat. Gambar kedua (close-up) lebih penting untuk mengesan kekurangan nutrien.' : '- USE both images for more accurate diagnosis. The second image (close-up) is more important for detecting nutrient deficiencies.') : ''}`
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

        // Add leaf image if provided
        if (leafImage) {
            messages[1].content.push({
                type: 'image_url',
                image_url: {
                    url: leafImage,
                    detail: 'high'
                }
            });
        }

        // Call OpenAI API
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 2000,
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const result = JSON.parse(jsonMatch[0]);

        res.json(result);

    } catch (error) {
        console.error('Analysis error:', error);

        if (error.code === 'insufficient_quota') {
            return res.status(429).json({
                error: 'API quota exceeded. Please contact support.'
            });
        }

        if (error.code === 'rate_limit_exceeded') {
            return res.status(429).json({
                error: 'Rate limit exceeded. Please try again later.'
            });
        }

        res.status(500).json({
            error: 'Failed to analyze plant. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Catch-all 404 handler for debugging
app.use((req, res) => {
    console.warn(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
        error: 'Route not found',
        method: req.method,
        url: req.url
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n---------------------------------------------------`);
    console.log(`🌿 Plant Detector API is now active!`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔗 Allowed Origin: ${process.env.FRONTEND_URL}`);
    console.log(`🔑 OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ MISSING'}`);
    console.log(`---------------------------------------------------\n`);
});

