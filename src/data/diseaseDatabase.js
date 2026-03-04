// Southeast Asian Plant Disease & Pest Control Database
// Categories based on agricultural pest control classification

export const diseaseDatabase = [
    // === FUNGICIDES - Fungal Disease Control ===
    {
        id: 'rice-blast',
        pathogen: {
            en: 'Magnaporthe oryzae (Fungus)',
            ms: 'Magnaporthe oryzae (Kulat)',
            zh: '稻瘟病菌 (Magnaporthe oryzae)'
        },
        name: {
            en: 'Rice Blast',
            ms: 'Karat Daun Padi',
            zh: '稻瘟病'
        },
        category: 'Fungicides',
        // ... symptoms, causes, etc. unchanged to save tokens if possible, but I need to replace the whole object
        symptoms: {
            en: 'Diamond-shaped lesions on leaves with gray centers and brown margins. Neck rot causing panicles to fall over.',
            ms: 'Lesi berbentuk berlian pada daun dengan pusat kelabu dan tepi coklat. Reput tangkai menyebabkan tangkai padi terkulai.',
            zh: '叶片上出现菱形病斑，中心呈灰色，边缘呈褐色。穗颈腐烂导致稻穗倒伏。'
        },
        causes: {
            en: 'Fungal infection favored by high humidity and nitrogen fertilization.',
            ms: 'Jangkitan kulat yang digalakkan oleh kelembapan tinggi dan pembajaan nitrogen.',
            zh: '真菌感染，在高湿度和过量施氮肥的情况下易发。'
        },
        treatment: {
            en: [
                'Apply tricyclazole fungicide: 20g per 10L water',
                'Use azoxystrobin: 15ml per 10L water',
                'Remove and destroy infected plant debris'
            ],
            ms: [
                'Gunakan racun kulat tricyclazole: 20g per 10L air',
                'Gunakan azoxystrobin: 15ml per 10L air',
                'Buang dan musnahkan sisa tanaman yang dijangkiti'
            ],
            zh: [
                '施用三环唑杀菌剂：每10升水20克',
                '使用嘧菌酯：每10升水15毫升',
                '移除并销毁受感染的植物残骸'
            ]
        },
        prevention: {
            en: [
                'Use resistant rice varieties',
                'Avoid excessive nitrogen fertilization',
                'Ensure proper field drainage'
            ],
            ms: [
                'Gunakan varieti padi rintangan',
                'Elakkan pembajaan nitrogen berlebihan',
                'Pastikan saliran ladang yang baik'
            ],
            zh: [
                '使用抗病水稻品种',
                '避免过量施用氮肥',
                '确保田间排水良好'
            ]
        }
    },
    // Adding Malaysian Plantation Diseases
    {
        id: 'ganoderma-bsr',
        pathogen: {
            en: 'Ganoderma boninense (Fungus)',
            ms: 'Ganoderma boninense (Kulat)',
            zh: '灵芝真菌 (Ganoderma boninense)'
        },
        name: {
            en: 'Basal Stem Rot (BSR)',
            ms: 'Reput Pangkal Batang (BSR)',
            zh: '基部腐烂病 (BSR)'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Unopened spears (fronds), yellowing of lower fronds, decay at the base of the trunk.',
            ms: 'Pucuk tidak terbuka, kekuningan pada pelepah bawah, reput pada pangkal batang.',
            zh: '未开放的嫩叶（叶轴），下部叶片发黄，树干基部腐烂。'
        },
        causes: {
            en: 'Soil-borne fungus that attacks the oil palm root system and trunk base.',
            ms: 'Kulat bawaan tanah yang menyerang sistem akar kelapa sawit dan pangkal batang.',
            zh: '土传真菌，攻击油棕根系和树干基部。'
        },
        treatment: {
            en: [
                'Surgical removal of infected tissue',
                'Trunk injection with hexaconazole',
                'Apply Trichoderma-based bio-fungicides to soil'
            ],
            ms: [
                'Pembuangan tisu yang dijangkiti secara mekanikal',
                'Suntikan batang dengan hexaconazole',
                'Gunakan bio-fungisida berasaskan Trichoderma ke tanah'
            ],
            zh: [
                '手术切除受感染组织',
                '树干注射己唑醇',
                '在土壤中施用木霉菌生物杀菌剂'
            ]
        },
        prevention: {
            en: [
                'Proper sanitation during replanting',
                'Mounding soil around trunk base',
                'Regular census for early detection'
            ],
            ms: [
                'Sanitasi yang betul semasa penanaman semula',
                'Pemuatan tanah di sekitar pangkal batang',
                'Bancian berkala untuk pengesanan awal'
            ],
            zh: [
                '补种期间保持良好的卫生环境',
                '在树干基部堆土',
                '定期调查以便早期发现'
            ]
        }
    },
    {
        id: 'white-root-disease',
        pathogen: {
            en: 'Rigidoporus microporus (Fungus)',
            ms: 'Rigidoporus microporus (Kulat)',
            zh: '硬孔菌 (Rigidoporus microporus)'
        },
        name: {
            en: 'White Root Disease',
            ms: 'Penyakit Akar Putih',
            zh: '白根病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Foliage turns yellowish, white fungal rhizomorphs on root surface, eventually tree death.',
            ms: 'Daun menjadi kekuningan, rizomorf kulat putih pada permukaan akar, akhirnya kematian pokok.',
            zh: '叶片变黄，根部表面出现白色真菌菌索，最终导致树木死亡。'
        },
        causes: {
            en: 'Spread through root contact with infected debris or neighboring trees.',
            ms: 'Tersebar melalui sentuhan akar dengan sisa yang dijangkiti atau pokok jiran.',
            zh: '通过根部接触受感染的残骸或邻近树木而传播。'
        },
        treatment: {
            en: [
                'Drench soil with hexaconazole or cyproconazole',
                'Remove and burn infected roots/stumps',
                'Apply sulfur powder to planting holes'
            ],
            ms: [
                'Siram tanah dengan hexaconazole atau cyproconazole',
                'Buang dan bakar akar/tunggul yang dijangkiti',
                'Gunakan serbuk sulfur pada lubang tanaman'
            ],
            zh: [
                '用己唑醇或环丙唑醇灌根',
                '移除并焚烧受感染的根部/树桩',
                '在种植穴内施用硫磺粉'
            ]
        },
        prevention: {
            en: [
                'Complete removal of old stumps during land clearing',
                'Apply sulfur to soil during planting',
                'Regular inspection for collar rot'
            ],
            ms: [
                'Pembuangan lengkap tunggul lama semasa pembersihan tanah',
                'Gunakan sulfur pada tanah semasa menanam',
                'Pemeriksaan berkala untuk reput pangkal'
            ],
            zh: [
                '开垦土地时彻底清除旧树桩',
                '种植期间向土壤施用硫磺',
                '定期检查根颈部是否腐烂'
            ]
        }
    },
    {
        id: 'bagworms',
        pathogen: {
            en: 'Metisa plana / Mahasena corbetti (Insect)',
            ms: 'Metisa plana / Mahasena corbetti (Serangga)',
            zh: '蓑蛾/套袋虫 (Metisa plana / Mahasena corbetti)'
        },
        name: {
            en: 'Bagworms',
            ms: 'Ulat Bungkus',
            zh: '蓑蛾/袋虫'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Defoliation of fronds, scorched appearance of leaves, presence of small bags/cases hanging from leaves.',
            ms: 'Keguguran pelepah, penampilan daun yang hangus, kehadiran beg/sarung kecil yang tergantung pada daun.',
            zh: '叶片缺失，叶片呈焦枯状，叶片上挂有小袋状物或虫茧。'
        },
        causes: {
            en: 'Larval feeding of psychid moths, often triggered by imbalance in natural predators.',
            ms: 'Pemakanan larva rama-rama psikid, sering dicetuskan oleh ketidakseimbangan pemangsa semula jadi.',
            zh: '蓑蛾幼虫取食，通常由自然天敌失衡引发。'
        },
        treatment: {
            en: [
                'Trunk injection with monocrotophos or methamidophos',
                'Ariel spraying with Bacillus thuringiensis (Bt)',
                'Plant nectar plants (Cassia cobanensis) to attract predators'
            ],
            ms: [
                'Suntikan batang dengan monocrotophos atau methamidophos',
                'Semburan udara dengan Bacillus thuringiensis (Bt)',
                'Tanam tumbuhan nektar (Cassia cobanensis) untuk menarik pemangsa'
            ],
            zh: [
                '树干注射久效磷或甲胺磷',
                '空中喷洒苏云金杆菌 (Bt)',
                '种植蜜源植物（如 Cassia cobanensis）以吸引天敌'
            ]
        },
        prevention: {
            en: [
                'Maintain biodiversity through beneficial plants',
                'Avoid overuse of broad-spectrum insecticides',
                'Regular leaf monitoring'
            ],
            ms: [
                'Kekalkan biodiversiti melalui tumbuhan bermanfaat',
                'Elakkan penggunaan berlebihan racun serangga spektrum luas',
                'Pemantauan daun secara berkala'
            ],
            zh: [
                '通过种植有益植物维持生物多样性',
                '避免过度使用广谱杀虫剂',
                '定期监测叶片情况'
            ]
        }
    },
    {
        id: 'powdery-mildew',
        pathogen: {
            en: 'Oidium heveae / Podisphaera (Fungus)',
            ms: 'Oidium heveae / Podisphaera (Kulat)',
            zh: '橡胶白粉菌 (Oidium heveae) / 苍耳单丝壳菌 (Podisphaera)'
        },
        name: {
            en: 'Powdery Mildew',
            ms: 'Kulapuk Debu',
            zh: '白粉病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'White powdery coating on leaves, stems, and fruits. Leaves may yellow and drop.',
            ms: 'Lapisan serbuk putih pada daun, batang, dan buah. Daun mungkin menguning dan gugur.',
            zh: '叶片、茎部和果实上出现白色粉状涂层。叶片可能发黄并脱落。'
        },
        causes: {
            en: 'Fungal infection favored by high humidity and moderate temperatures.',
            ms: 'Jangkitan kulat yang digalakkan oleh kelembapan tinggi dan suhu sederhana.',
            zh: '真菌感染，在高温、中温情况下易发。'
        },
        treatment: {
            en: [
                'Apply sulfur-based fungicides: 30g per 10L water',
                'Use potassium bicarbonate spray',
                'Spray neem oil solution: 30ml per 10L water',
                'Remove heavily infected leaves'
            ],
            ms: [
                'Gunakan racun kulat berasaskan sulfur: 30g per 10L air',
                'Gunakan semburan kalium bikarbonat',
                'Sembur larutan minyak neem: 30ml per 10L air',
                'Buang daun yang sangat terjejas'
            ],
            zh: [
                '施用硫磺类杀菌剂：每10升水30克',
                '使用碳酸氢钾喷雾',
                '喷洒印楝油溶液：每10升水30毫升',
                '移除受感染严重的叶片'
            ]
        },
        prevention: {
            en: [
                'Ensure good air circulation between plants',
                'Water at soil level, avoid wetting foliage',
                'Plant in full sun locations',
                'Use resistant varieties'
            ],
            ms: [
                'Pastikan pengudaraan yang baik antara tanaman',
                'Siram di paras tanah, elakkan membasahi daun',
                'Tanam di lokasi matahari penuh',
                'Gunakan varieti rintangan'
            ],
            zh: [
                '确保植物间空气流通良好',
                '在土壤层面浇水，避免弄湿叶片',
                '种植在阳光充足的地方',
                '使用抗病品种'
            ]
        }
    },
    {
        id: 'anthracnose',
        pathogen: {
            en: 'Colletotrichum species (Fungus)',
            ms: 'Spesies Colletotrichum (Kulat)',
            zh: '炭疽菌属 (Colletotrichum species)'
        },
        name: {
            en: 'Anthracnose',
            ms: 'Antraknos',
            zh: '炭疽病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Dark, sunken lesions on fruits. Brown spots on leaves. Premature fruit drop.',
            ms: 'Lesi gelap dan tenggelam pada buah. Bintik coklat pada daun. Buah gugur pramatang.',
            zh: '果实上出现深色凹陷病斑。叶片出现褐色斑点。果实过早脱落。'
        },
        causes: {
            en: 'Common in mangoes, papayas, bananas during wet seasons.',
            ms: 'Biasa pada mangga, betik, pisang semasa musim hujan.',
            zh: '在雨季的芒果、木瓜和香蕉中常见。'
        },
        treatment: {
            en: [
                'Apply copper-based fungicides: 25g per 10L water',
                'Use mancozeb: 25g per 10L water',
                'Remove and destroy infected fruits'
            ],
            ms: [
                'Gunakan racun kulat berasaskan tembaga: 25g per 10L air',
                'Gunakan mancozeb: 25g per 10L air',
                'Buang dan musnahkan buah yang dijangkiti'
            ],
            zh: [
                '施用铜基杀菌剂：每10升水25克',
                '使用代森锰锌：每10升水25克',
                '移除并销毁受感染的果实'
            ]
        },
        prevention: {
            en: [
                'Harvest fruits at proper maturity',
                'Avoid fruit injuries during handling',
                'Remove fallen fruits and debris'
            ],
            ms: [
                'Tuai buah pada kematangan yang sesuai',
                'Elakkan kecederaan buah semasa pengendalian',
                'Buang buah yang gugur dan sisa'
            ],
            zh: [
                '在适当的成熟期采摘果实',
                '搬运过程中避免损伤果实',
                '清除落果和残骸'
            ]
        }
    },
    {
        id: 'durian-stem-canker',
        pathogen: {
            en: 'Phytophthora palmivora (Oomycete/Water Mold)',
            ms: 'Phytophthora palmivora (Kulat Air)',
            zh: '棕榈疫霉 (Phytophthora palmivora) (卵菌/水霉)'
        },
        name: {
            en: 'Stem Canker',
            ms: 'Kanker Batang',
            zh: '茎腐病/溃疡病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Dark, water-soaked patches on the bark, reddish-brown resin exudation, bark cracking.',
            ms: 'Tompok gelap dan lembap pada kulit kayu, pengeluaran resin coklat-merah, kulit kayu pecah.',
            zh: '树皮上出现深色水渍状斑块，渗出红褐色树脂，树皮开裂。'
        },
        causes: {
            en: 'Soil-borne pathogen favored by high rainfall and poor drainage in Durian orchards.',
            ms: 'Patogen bawaan tanah yang digalakkan oleh hujan lebat dan saliran buruk di kebun Durian.',
            zh: '土传病原体，在降雨量大且排水不良的榴莲园中易发。'
        },
        treatment: {
            en: [
                'Scrape off infected bark and apply copper fungicide paste',
                'Trunk injection with phosphorous acid',
                'Soil drenching with metalaxyl'
            ],
            ms: [
                'Kikis kulit kayu yang dijangkiti dan sapukan pes racun kulat tembaga',
                'Suntikan batang dengan asid fosforus',
                'Siraman tanah dengan metalaxyl'
            ],
            zh: [
                '刮除受感染的树皮并涂抹铜杀菌剂膏',
                '树干注射亚磷酸',
                '用甲霜灵灌根'
            ]
        },
        prevention: {
            en: [
                'Improve orchard drainage',
                'Avoid wounding the tree trunk during weeding',
                'Use certified disease-free saplings'
            ],
            ms: [
                'Tingkatkan saliran kebun',
                'Elakkan mencederakan batang pokok semasa merumpai',
                'Gunakan anak benih bebas penyakit yang disahkan'
            ],
            zh: [
                '改善果园排水',
                '除草时避免损伤树干',
                '使用经过认证的无病苗木'
            ]
        }
    },
    {
        id: 'durian-fruit-borer',
        pathogen: {
            en: 'Conogethes punctiferalis / Mudaria (Insect)',
            ms: 'Conogethes punctiferalis / Mudaria (Serangga)',
            zh: '桃蛀螟/榴莲蛀果虫 (Conogethes punctiferalis / Mudaria)'
        },
        name: {
            en: 'Fruit Borer',
            ms: 'Pengorek Buah',
            zh: '蛀果虫'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Holes on fruit surface with frass (insect droppings), rotting of internal fruit pulp.',
            ms: 'Lubang pada permukaan buah dengan najis serangga, kebusukan isi buah di dalam.',
            zh: '果实表面有孔洞并附有虫粪，内部果肉腐烂。'
        },
        causes: {
            en: 'Larvae boring into fruits to feed on seeds and pulp.',
            ms: 'Larva mengorek masuk ke dalam buah untuk memakan biji dan isi.',
            zh: '幼虫钻入果实内部取食种子和果肉。'
        },
        treatment: {
            en: [
                'Spray with cypermethrin or deltamethrin',
                'Remove and bury infested fruits',
                'Bagging young fruits for protection'
            ],
            ms: [
                'Sembur dengan cypermethrin atau deltamethrin',
                'Buang dan tanam buah yang dijangkiti',
                'Bungkus buah muda untuk perlindungan'
            ],
            zh: [
                '喷洒氯氰菊酯或溴氰菊酯',
                '移除并掩埋受害果实',
                '对幼果进行套袋保护'
            ]
        },
        prevention: {
            en: [
                'Light traps to capture adult moths',
                'Regular scouting for early infestation',
                'Proper sanitation of orchard floor'
            ],
            ms: [
                'Perangkap cahaya untuk menangkap rama-rama dewasa',
                'Tinjauan berkala untuk jangkitan awal',
                'Sanitasi lantai kebun yang betul'
            ],
            zh: [
                '使用诱虫灯捕捉成蛾',
                '定期巡查以便早期发现虫害',
                '保持果园地面卫生'
            ]
        }
    },
    {
        id: 'pineapple-heart-rot',
        pathogen: {
            en: 'Erwinia chrysanthemi (Bacteria)',
            ms: 'Erwinia chrysanthemi (Bakteria)',
            zh: '菊欧文氏菌 (Erwinia chrysanthemi) (细菌)'
        },
        name: {
            en: 'Bacterial Heart Rot',
            ms: 'Reput Hati Bakteria',
            zh: '细菌性心腐病'
        },
        category: 'Bactericides',
        symptoms: {
            en: 'Water-soaked lesions on central leaves, foul-smelling rot, primary leaves easily pulled out.',
            ms: 'Lesi lembap pada daun tengah, reput berbau busuk, daun utama mudah dicabut.',
            zh: '中心叶片出现水渍状病斑，伴有恶臭的腐烂，初生叶易被拔出。'
        },
        causes: {
            en: 'Bacterial infection through wounds or natural openings in wet conditions.',
            ms: 'Jangkitan bakteria melalui luka atau bukaan semula jadi dalam keadaan basah.',
            zh: '在潮湿条件下，细菌通过伤口或自然开口感染。'
        },
        treatment: {
            en: [
                'Apply streptomycin or copper-based sprays (preventive)',
                'Remove and burn infected plants immediately',
                'Avoid working in the field when plants are wet'
            ],
            ms: [
                'Gunakan semburan berasaskan streptomycin atau tembaga (pencegahan)',
                'Buang dan bakar tanaman yang dijangkiti dengan segera',
                'Elakkan bekerja di ladang semasa tanaman basah'
            ],
            zh: [
                '施用链霉素或铜基喷雾（预防性）',
                '立即移除并焚烧受感染的植物',
                '避免在植物潮湿时在田间作业'
            ]
        },
        prevention: {
            en: [
                'Use disease-free planting material',
                'Avoid over-irrigation',
                'Disinfect tools after working with infected plants'
            ],
            ms: [
                'Gunakan bahan tanaman bebas penyakit',
                'Elakkan pengairan berlebihan',
                'Nyahjangkit alatan selepas bekerja dengan tanaman yang dijangkiti'
            ],
            zh: [
                '使用无病种植材料',
                '避免过度灌溉',
                '处理受感染植物后对工具进行消毒'
            ]
        }
    },
    {
        id: 'fusarium-wilt',
        name: {
            en: 'Fusarium Wilt',
            ms: 'Layu Fusarium',
            zh: '枯萎病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Yellowing of lower leaves progressing upward. Wilting during day. Brown vascular discoloration.',
            ms: 'Daun bawah menguning dan merebak ke atas. Layu pada siang hari. Perubahan warna vaskular coklat.',
            zh: '下部叶片向上变黄。白天萎蔫。维管束褐变。'
        },
        causes: {
            en: 'Soil-borne fungus (Fusarium oxysporum) blocking water transport.',
            ms: 'Kulat bawaan tanah (Fusarium oxysporum) menyekat pengangkutan air.',
            zh: '土传真菌（尖孢镰刀菌）阻塞水分运输。'
        },
        treatment: {
            en: [
                'Apply Trichoderma harzianum: 50g per 10L water',
                'Use carbendazim: 10g per 10L water',
                'Solarize soil with plastic sheeting for 4-6 weeks',
                'Remove and destroy infected plants'
            ],
            ms: [
                'Gunakan Trichoderma harzianum: 50g per 10L air',
                'Gunakan carbendazim: 10g per 10L air',
                'Solarisasikan tanah dengan kepingan plastik selama 4-6 minggu',
                'Buang dan musnahkan tanaman yang dijangkiti'
            ],
            zh: [
                '施用哈茨木霉：每10升水50克',
                '使用多菌灵：每10升水10克',
                '用塑料薄膜对土壤进行4-6周的太阳能消毒',
                '移除并销毁受感染的植物'
            ]
        },
        prevention: {
            en: [
                'Use resistant varieties',
                'Practice 4-year crop rotation',
                'Maintain soil pH 6.5-7.0',
                'Sterilize tools and equipment'
            ],
            ms: [
                'Gunakan varieti rintangan',
                'Amalkan giliran tanaman 4 tahun',
                'Kekalkan pH tanah 6.5-7.0',
                'Sterilkan alat dan peralatan'
            ],
            zh: [
                '使用抗病品种',
                '实行4年轮作',
                '保持土壤pH值6.5-7.0',
                '对工具和设备进行消毒'
            ]
        }
    },
    {
        id: 'downy-mildew',
        pathogen: {
            en: 'Peronospora (Fungal-like organism)',
            ms: 'Peronospora (Organisma Seperti Kulat)',
            zh: '霜霉属 (Peronospora) (类真菌生物)'
        },
        name: {
            en: 'Downy Mildew',
            ms: 'Kulapuk Downy',
            zh: '霜霉病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Yellow patches on upper leaf surface. Gray-purple fuzzy growth on undersides.',
            ms: 'Tompok kuning pada permukaan atas daun. Pertumbuhan berbulu kelabu-ungu di bahagian bawah.',
            zh: '叶片上表面出现黄色斑块。叶片背面出现灰紫色绒毛状物。'
        },
        causes: {
            en: 'Fungal-like organism (Peronospora) thriving in cool, wet conditions.',
            ms: 'Organisma seperti kulat (Peronospora) yang tumbuh subur dalam keadaan sejuk dan basah.',
            zh: '霜霉属类真菌生物，在阴冷潮湿的环境中快速繁殖。'
        },
        treatment: {
            en: [
                'Apply metalaxyl: 20ml per 10L water',
                'Use copper fungicide (Bordeaux mixture)',
                'Remove and destroy infected leaves',
                'Improve air circulation by pruning'
            ],
            ms: [
                'Gunakan metalaxyl: 20ml per 10L air',
                'Gunakan racun kulat tembaga (campuran Bordeaux)',
                'Buang dan musnahkan daun yang dijangkiti',
                'Tingkatkan pengudaraan dengan mencantas'
            ],
            zh: [
                '施用甲霜灵：每10升水20毫升',
                '使用铜基杀菌剂（波尔多液）',
                '移除并销毁受感染的叶片',
                '通过修剪改善空气流通'
            ]
        },
        prevention: {
            en: [
                'Water in morning to allow foliage to dry',
                'Space plants adequately for airflow',
                'Avoid overhead irrigation',
                'Apply preventive copper sprays'
            ],
            ms: [
                'Siram pada waktu pagi untuk membiarkan daun kering',
                'Jarakkan tanaman secukupnya untuk aliran udara',
                'Elakkan pengairan atas',
                'Sembur racun kulat pencegah'
            ],
            zh: [
                '早晨浇水以使叶片变干',
                '保持足够的株距以利于空气流通',
                '避免喷灌（上方灌溉）',
                '施用预防性铜基喷雾'
            ]
        }
    },
    {
        id: 'black-spot',
        pathogen: {
            en: 'Diplocarpon rosae (Fungus)',
            ms: 'Diplocarpon rosae (Kulat)',
            zh: '玫瑰黑斑病菌 (Diplocarpon rosae)'
        },
        name: {
            en: 'Black Spot Disease',
            ms: 'Penyakit Bintik Hitam',
            zh: '黑斑病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Circular black spots with yellow halos on leaves. Premature leaf drop.',
            ms: 'Bintik hitam bulat dengan lingkaran kuning pada daun. Daun gugur pramatang.',
            zh: '叶片上出现带有黄色光晕的圆形黑斑。叶片过早脱落。'
        },
        causes: {
            en: 'Fungal infection spread by water splash.',
            ms: 'Jangkitan kulat yang disebarkan oleh percikan air.',
            zh: '由水滴溅射传播的真菌感染。'
        },
        treatment: {
            en: [
                'Apply mancozeb: 25g per 10L water',
                'Use chlorothalonil fungicide',
                'Spray neem oil solution weekly',
                'Remove infected leaves'
            ],
            ms: [
                'Gunakan mancozeb: 25g per 10L air',
                'Gunakan racun kulat chlorothalonil',
                'Sembur larutan minyak neem setiap minggu',
                'Buang daun yang dijangkiti'
            ],
            zh: [
                '施用代森锰锌：每10升水25克',
                '使用百菌清杀菌剂',
                '每周喷洒印楝油溶液',
                '移除受感染的叶片'
            ]
        },
        prevention: {
            en: [
                'Prune to improve air circulation',
                'Mulch to prevent soil splash',
                'Water at base, not foliage',
                'Remove fallen leaves regularly'
            ],
            ms: [
                'Cantaskan untuk meningkatkan pengudaraan',
                'Mulsakan untuk mengelakkan percikan tanah',
                'Siram di pangkal, bukan daun',
                'Buang daun yang gugur secara berkala'
            ],
            zh: [
                '修剪以改善空气流通',
                '铺设地膜以防止土壤溅射',
                '在根部浇水，不要淋在叶片上',
                '定期清理落叶'
            ]
        }
    },
    {
        id: 'rust-disease',
        pathogen: {
            en: 'Puccinia (Fungus)',
            ms: 'Puccinia (Kulat)',
            zh: '柄锈菌 (Puccinia)'
        },
        name: {
            en: 'Rust Disease',
            ms: 'Penyakit Karat',
            zh: '锈病'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Orange, yellow, or brown pustules on leaf undersides. Premature leaf drop.',
            ms: 'Pustul oren, kuning, atau coklat pada bahagian bawah daun. Daun gugur pramatang.',
            zh: '叶片背面出现橙色、黄色或褐色脓疱。叶片过早脱落。'
        },
        causes: {
            en: 'Fungal spores (Puccinia) spread by wind.',
            ms: 'Spora kulat (Puccinia) disebarkan oleh angin.',
            zh: '由风传播的真菌孢子（柄锈菌）。'
        },
        treatment: {
            en: [
                'Apply sulfur-based fungicides',
                'Use propiconazole: 10ml per 10L water',
                'Remove and burn infected plant parts',
                'Apply copper oxychloride sprays'
            ],
            ms: [
                'Gunakan racun kulat berasaskan sulfur',
                'Gunakan propiconazole: 10ml per 10L air',
                'Buang dan bakar bahagian tanaman yang dijangkiti',
                'Sembur kuprum oksiklorida'
            ],
            zh: [
                '施用硫磺类杀菌剂',
                '使用丙环唑：每10升水10毫升',
                '移除并焚烧受感染的植物部分',
                '施用氧氯化铜喷雾'
            ]
        },
        prevention: {
            en: [
                'Plant resistant varieties',
                'Ensure good air circulation',
                'Avoid overhead watering',
                'Remove alternate host plants'
            ],
            ms: [
                'Tanam varieti rintangan',
                'Pastikan pengudaraan yang baik',
                'Elakkan penyiraman atas',
                'Buang tanaman perumah alternatif'
            ],
            zh: [
                '种植抗病品种',
                '确保良好的空气流通',
                '避免喷灌',
                '移除交替宿主植物'
            ]
        }
    },

    // === INSECTICIDES - Insect Pest Control ===
    {
        id: 'aphids',
        pathogen: {
            en: 'Aphid (various species) (Insect)',
            ms: 'Afid (pelbagai spesies) (Serangga)',
            zh: '蚜虫 (多种) (昆虫)'
        },
        name: {
            en: 'Aphid Infestation',
            ms: 'Serangan Afid',
            zh: '蚜虫害'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Clusters of small soft-bodied insects on new growth. Curled, distorted leaves. Sticky honeydew on leaves.',
            ms: 'Kelompok serangga kecil berbadan lembut pada pertumbuhan baru. Daun bergulung dan herot. Cecair manis melekit pada daun.',
            zh: '新长出的部位出现成群的小型软体昆虫。叶片卷曲、变形。叶片上有粘性的蜜露。'
        },
        causes: {
            en: 'Aphids (various species) sucking plant sap. Spread plant viruses.',
            ms: 'Afid (pelbagai spesies) menghisap sap tumbuhan. Menyebarkan virus tumbuhan.',
            zh: '蚜虫（多种）吸食植物汁液。传播植物病毒。'
        },
        treatment: {
            en: [
                'Spray imidacloprid: 5ml per 10L water',
                'Use neem oil: 30ml per 10L water',
                'Apply insecticidal soap',
                'Spray with strong water jet to dislodge'
            ],
            ms: [
                'Sembur imidacloprid: 5ml per 10L air',
                'Gunakan minyak neem: 30ml per 10L air',
                'Gunakan sabun insektisida',
                'Sembur dengan pancutan air kuat untuk menanggalkan'
            ],
            zh: [
                '喷洒吡虫啉：每10升水5毫升',
                '使用印楝油：每10升水30毫升',
                '施用杀虫皂',
                '用强力水柱冲刷以将其驱除'
            ]
        },
        prevention: {
            en: [
                'Encourage beneficial insects (ladybugs)',
                'Use reflective mulches',
                'Remove weeds that harbor aphids',
                'Plant companion plants (marigolds)'
            ],
            ms: [
                'Galakkan serangga bermanfaat (kumbang kura-kura)',
                'Gunakan sungkupan pemantul cahaya',
                'Buang rumpai yang menjadi perumah afid',
                'Tanam tanaman peneman (bunga tahi ayam)'
            ],
            zh: [
                '鼓励有益昆虫（瓢虫）',
                '使用反光地膜',
                '清除滋生蚜虫的杂草',
                '种植伴生植物（如万寿菊）'
            ]
        }
    },
    {
        pathogen: {
            en: 'Whitefly (Insect)',
            ms: 'Lalat Putih (Serangga)',
            zh: '粉虱 (昆虫)'
        },
        name: {
            en: 'Whitefly Damage',
            ms: 'Kerosakan Lalat Putih',
            zh: '粉虱危害'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Tiny white flying insects on leaf undersides. Yellowing leaves. Sooty mold growth.',
            ms: 'Serangga terbang putih kecil di bahagian bawah daun. Daun menguning. Pertumbuhan kulat jelaga.',
            zh: '叶片背面有微小的白色飞虫。叶片发黄。生长煤污病菌。'
        },
        causes: {
            en: 'Whiteflies feeding on plant sap and transmitting viruses.',
            ms: 'Lalat putih memakan sap tumbuhan dan menyebarkan virus.',
            zh: '粉虱吸食植物汁液并传播病毒。'
        },
        treatment: {
            en: [
                'Apply acetamiprid: 5g per 10L water',
                'Use yellow sticky traps',
                'Spray neem oil solution',
                'Apply pyrethrin-based insecticide'
            ],
            ms: [
                'Gunakan acetamiprid: 5g per 10L air',
                'Gunakan perangkap pelekat kuning',
                'Sembur larutan minyak neem',
                'Gunakan racun serangga berasaskan pyrethrin'
            ],
            zh: [
                '施用啶虫脒：每10升水5克',
                '使用黄色粘虫板',
                '喷洒印楝油溶液',
                '施用除虫菊酯类杀虫剂'
            ]
        },
        prevention: {
            en: [
                'Install insect-proof netting',
                'Remove infected plants promptly',
                'Use reflective mulches',
                'Monitor regularly for early detection'
            ],
            ms: [
                'Pasang jaring kalis serangga',
                'Buang tanaman yang dijangkiti dengan segera',
                'Gunakan sungkupan pemantul cahaya',
                'Pantau secara berkala untuk pengesanan awal'
            ],
            zh: [
                '安装防虫网',
                '及时移除受感染的植物',
                '使用反光地膜',
                '定期监测以便早期发现'
            ]
        }
    },
    {
        pathogen: {
            en: 'Bactrocera dorsalis (Fruit Fly)',
            ms: 'Bactrocera dorsalis (Lalat Buah)',
            zh: '东方果实蝇 (Bactrocera dorsalis)'
        },
        name: {
            en: 'Fruit Fly Damage',
            ms: 'Kerosakan Lalat Buah',
            zh: '果实蝇危害'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Small puncture marks on fruit skin. Soft, rotting areas. Maggots inside fruits.',
            ms: 'Tanda tusukan kecil pada kulit buah. Kawasan lembut dan membusuk. Larva di dalam buah.',
            zh: '果皮上有微小的穿刺痕迹。局部变软、腐烂。果实内部有蛆虫。'
        },
        causes: {
            en: 'Fruit flies laying eggs in ripening fruits.',
            ms: 'Lalat buah bertelur dalam buah yang sedang masak.',
            zh: '果实蝇在成熟的果实中产卵。'
        },
        treatment: {
            en: [
                'Set up methyl eugenol traps',
                'Apply protein bait sprays',
                'Remove and destroy infested fruits',
                'Use approved insecticides on foliage'
            ],
            ms: [
                'Pasang perangkap methyl eugenol',
                'Gunakan semburan umpan protein',
                'Buang dan musnahkan buah yang diserang',
                'Gunakan racun serangga yang diluluskan pada daun'
            ],
            zh: [
                '设置甲基丁香酚诱捕器',
                '施用蛋白诱饵喷雾',
                '移除并销毁受害果实',
                '在叶片上使用经批准的杀虫剂'
            ]
        },
        prevention: {
            en: [
                'Use fruit bagging technique',
                'Harvest fruits at proper stage',
                'Maintain orchard sanitation',
                'Install pheromone traps'
            ],
            ms: [
                'Gunakan teknik pembungkusan buah',
                'Tuai buah pada peringkat yang sesuai',
                'Kekalkan kebersihan ladang',
                'Pasang perangkap feromon'
            ],
            zh: [
                '采用果实套袋技术',
                '在适当阶段采收果实',
                '保持果园卫生',
                '安装信息素诱捕器'
            ]
        }
    },
    {
        pathogen: {
            en: 'Liriomyza species (Insect)',
            ms: 'Spesies Liriomyza (Serangga)',
            zh: '潜叶蝇属 (Liriomyza species)'
        },
        name: {
            en: 'Leaf Miner',
            ms: 'Ulat Pelombong Daun',
            zh: '潜叶虫'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Serpentine trails or blotches on leaves. Reduced photosynthesis.',
            ms: 'Laluan berlingkar atau tompokan pada daun. Fotosintesis berkurang.',
            zh: '叶片上出现蛇形轨迹或斑块。光合作用减少。'
        },
        causes: {
            en: 'Larvae of small flies mining between leaf surfaces.',
            ms: 'Larva lalat kecil melombong antara permukaan daun.',
            zh: '小型蝇类的幼虫在叶片表层之间潜食。'
        },
        treatment: {
            en: [
                'Apply abamectin: 10ml per 10L water',
                'Use spinosad insecticide',
                'Remove and destroy affected leaves',
                'Apply neem oil spray'
            ],
            ms: [
                'Gunakan abamectin: 10ml per 10L air',
                'Gunakan racun serangga spinosad',
                'Buang dan musnahkan daun yang terjejas',
                'Sembur minyak neem'
            ],
            zh: [
                '施用阿维菌素：每10升水10毫升',
                '使用多杀霉素杀虫剂',
                '移除并销毁受害叶片',
                '喷洒印楝油喷雾'
            ]
        },
        prevention: {
            en: [
                'Use row covers on young plants',
                'Remove weeds that harbor miners',
                'Encourage parasitic wasps',
                'Monitor plants regularly'
            ],
            ms: [
                'Gunakan penutup barisan pada tanaman muda',
                'Buang rumpai yang menjadi perumah pelombong',
                'Galakkan tebuan parasit',
                'Pantau tanaman secara berkala'
            ],
            zh: [
                '在幼苗上使用覆盖物',
                '清除滋生潜叶虫的杂草',
                '鼓励寄生蜂',
                '定期监测植物'
            ]
        }
    },
    {
        id: 'thrips-damage',
        pathogen: {
            en: 'Thrips (Insect)',
            ms: 'Thrips (Serangga)',
            zh: '蓟马 (昆虫)'
        },
        name: {
            en: 'Thrips Damage',
            ms: 'Kerosakan Thrips',
            zh: '蓟马危害'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Silver-gray streaks on leaves. Distorted flowers and fruits. Tiny black insects visible.',
            ms: 'Jalur kelabu-perak pada daun. Bunga dan buah herot. Serangga hitam kecil kelihatan.',
            zh: '叶片上出现银灰色条纹。花朵和果实畸形。可见微小的黑色昆虫。'
        },
        causes: {
            en: 'Thrips feeding on plant tissues and spreading viruses.',
            ms: 'Thrips memakan tisu tumbuhan and menyebarkan virus.',
            zh: '蓟马取食植物组织并传播病毒。'
        },
        treatment: {
            en: [
                'Spray spinosad: 10ml per 10L water',
                'Use blue sticky traps',
                'Apply neem oil solution',
                'Use pyrethrin insecticide'
            ],
            ms: [
                'Sembur spinosad: 10ml per 10L air',
                'Gunakan perangkap pelekat biru',
                'Gunakan larutan minyak neem',
                'Gunakan racun serangga pyrethrin'
            ],
            zh: [
                '喷洒多杀霉素：每10升水10毫升',
                '使用蓝色粘虫板',
                '喷洒印楝油溶液',
                '使用除虫菊酯杀虫剂'
            ]
        },
        prevention: {
            en: [
                'Remove weeds and debris',
                'Use reflective mulches',
                'Encourage predatory mites',
                'Maintain good plant health'
            ],
            ms: [
                'Buang rumpai dan sisa',
                'Gunakan sungkupan pemantul cahaya',
                'Galakkan hama pemangsa',
                'Kekalkan kesihatan tanaman yang baik'
            ],
            zh: [
                '清除杂草和残骸',
                '使用反光地膜',
                '鼓励捕食螨',
                '保持良好的植物健康状态'
            ]
        }
    },

    // === HERBICIDES - Weed Control ===
    {
        id: 'broadleaf-weeds',
        pathogen: {
            en: 'Broadleaf Weeds (Various)',
            ms: 'Rumpai Daun Lebar (Pelbagai)',
            zh: '阔叶杂草 (多种)'
        },
        name: {
            en: 'Broadleaf Weed Control',
            ms: 'Kawalan Rumpai Daun Lebar',
            zh: '阔叶杂草防治'
        },
        category: 'Herbicides',
        symptoms: {
            en: 'Broadleaf weeds competing with crops for nutrients, water, and light.',
            ms: 'Rumpai daun lebar bersaing dengan tanaman untuk nutrien, air, dan cahaya.',
            zh: '阔叶杂草与作物争夺养分、水分和阳光。'
        },
        causes: {
            en: 'Various broadleaf weed species invading crop areas.',
            ms: 'Pelbagai spesies rumpai daun lebar menyerang kawasan tanaman.',
            zh: '多种阔叶杂草入侵作物区域。'
        },
        treatment: {
            en: [
                'Apply 2,4-D herbicide: 20ml per 10L water',
                'Use glyphosate for non-selective control',
                'Hand-pull young weeds',
                'Mulch heavily to suppress growth'
            ],
            ms: [
                'Gunakan racun rumpai 2,4-D: 20ml per 10L air',
                'Gunakan glifosat untuk kawalan bukan selektif',
                'Cabut rumpai muda dengan tangan',
                'Mulsakan dengan tebal untuk menyekat pertumbuhan'
            ],
            zh: [
                '施用2,4-D除草剂：每10升水20毫升',
                '使用草甘膦进行非选择性防治',
                '手工拔除幼苗期杂草',
                '厚铺地膜以抑制生长'
            ]
        },
        prevention: {
            en: [
                'Use pre-emergent herbicides',
                'Maintain thick crop canopy',
                'Practice crop rotation',
                'Mulch around plants'
            ],
            ms: [
                'Gunakan racun rumpai pra-cambah',
                'Kekalkan kanopi tanaman yang tebal',
                'Amalkan giliran tanaman',
                'Mulsakan di sekeliling tanaman'
            ],
            zh: [
                '使用芽前除草剂',
                '保持作物冠层紧密',
                '实行轮作',
                '在植物周围铺设地膜'
            ]
        }
    },
    {
        id: 'grass-weeds',
        pathogen: {
            en: 'Grassy Weeds (Annual/Perennial)',
            ms: 'Rumpai Rumput (Tahunan/Saka)',
            zh: '禾本科杂草 (一年生/多年生)'
        },
        name: {
            en: 'Grass Weed Control',
            ms: 'Kawalan Rumpai Rumput',
            zh: '禾本科杂草防治'
        },
        category: 'Herbicides',
        symptoms: {
            en: 'Grassy weeds competing with crops. Reduced crop yield.',
            ms: 'Rumpai rumput bersaing dengan tanaman. Hasil tanaman berkurang.',
            zh: '禾本科杂草与作物争夺资源。作物产量减少。'
        },
        causes: {
            en: 'Annual and perennial grass weeds.',
            ms: 'Rumpai rumput tahunan dan saka.',
            zh: '一年生和多年生禾本科杂草。'
        },
        treatment: {
            en: [
                'Apply paraquat: 30ml per 10L water (use with caution)',
                'Use glyphosate for perennial grasses',
                'Manual removal before seed set',
                'Mulch to suppress regrowth'
            ],
            ms: [
                'Gunakan paraquat: 30ml per 10L air (gunakan dengan berhati-hati)',
                'Gunakan glifosat untuk rumput saka',
                'Buang secara manual sebelum biji benih terbentuk',
                'Mulsakan untuk menyekat pertumbuhan semula'
            ],
            zh: [
                '施用百草枯：每10升水30毫升（小心使用）',
                '对多年生杂草使用草甘膦',
                '在结籽前进行人工拔除',
                '铺设地膜以抑制再次生长'
            ]
        },
        prevention: {
            en: [
                'Use pre-emergent herbicides',
                'Maintain weed-free borders',
                'Practice clean cultivation',
                'Use certified weed-free seeds'
            ],
            ms: [
                'Gunakan racun rumpai pra-cambah',
                'Kekalkan sempadan bebas rumpai',
                'Amalkan penanaman bersih',
                'Gunakan benih bebas rumpai yang disahkan'
            ],
            zh: [
                '使用芽前除草剂',
                '保持田埂无杂草',
                '实行清洁耕作',
                '使用经过认证的无杂草种子'
            ]
        }
    },

    // === MOLLUSCICIDES - Snail & Slug Control ===
    {
        id: 'snail-slug-damage',
        pathogen: {
            en: 'Snails and Slugs (Mollusks)',
            ms: 'Siput dan Lintah Bulan (Molluska)',
            zh: '蜗牛和蛞蝓 (软体动物)'
        },
        name: {
            en: 'Snail and Slug Damage',
            ms: 'Kerosakan Siput dan Lintah Bulan',
            zh: '蜗牛和蛞蝓危害'
        },
        category: 'Molluscicides',
        symptoms: {
            en: 'Irregular holes in leaves. Slime trails visible. Seedlings completely eaten.',
            ms: 'Lubang tidak sekata pada daun. Jejak lendir kelihatan. Anak benih dimakan sepenuhnya.',
            zh: '叶片上出现不规则孔洞。可见粘液痕迹。幼苗被完全蚕食。'
        },
        causes: {
            en: 'Snails and slugs feeding at night on tender plant parts.',
            ms: 'Siput dan lintah bulan makan bahagian tanaman lembut pada waktu malam.',
            zh: '蜗牛和蛞蝓在夜间取食植物幼嫩部分。'
        },
        treatment: {
            en: [
                'Apply metaldehyde pellets: 5g per m²',
                'Use iron phosphate baits (organic option)',
                'Set up beer traps',
                'Hand-pick at night or early morning'
            ],
            ms: [
                'Tabur pelet metaldehyde: 5g per m²',
                'Gunakan umpan besi fosfat (pilihan organik)',
                'Pasang perangkap bir',
                'Kutip dengan tangan pada waktu malam atau awal pagi'
            ],
            zh: [
                '撒放四聚乙醛颗粒：每平方米5克',
                '使用磷酸铁诱饵（有机选择）',
                '设置啤酒诱捕器',
                '在夜间或清晨进行人工捕捉'
            ]
        },
        prevention: {
            en: [
                'Remove hiding places (boards, debris)',
                'Create copper barriers around plants',
                'Encourage natural predators (birds, frogs)',
                'Avoid over-mulching'
            ],
            ms: [
                'Buang tempat persembunyian (papan, sisa)',
                'Buat halangan tembaga di sekeliling tanaman',
                'Galakkan pemangsa semula jadi (burung, katak)',
                'Elakkan sungkupan berlebihan'
            ],
            zh: [
                '清除躲藏处（木板、残骸）',
                '在植物周围设置铜制屏障',
                '鼓励自然天敌（鸟类、青蛙）',
                '避免过度铺设地膜'
            ]
        }
    },

    // === MITICIDES - Mite Control ===
    {
        id: 'spider-mites',
        pathogen: {
            en: 'Spider Mites (Tetranychidae) (Mites)',
            ms: 'Hama Labah-labah (Tetranychidae) (Hama)',
            zh: '红蜘蛛/叶螨 (Tetranychidae)'
        },
        name: {
            en: 'Spider Mite Infestation',
            ms: 'Serangan Hama Labah-labah',
            zh: '红蜘蛛/叶螨害'
        },
        category: 'Miticides',
        symptoms: {
            en: 'Fine webbing on leaves. Yellow stippling on leaf surface. Leaf bronzing.',
            ms: 'Sarang halus pada daun. Bintik kuning pada permukaan daun. Daun menjadi gangsa.',
            zh: '叶片上有细密的网。叶面出现黄色斑点。叶片呈青铜色。'
        },
        causes: {
            en: 'Tiny spider mites sucking plant juices, especially in hot, dry conditions.',
            ms: 'Hama labah-labah kecil menghisap jus tumbuhan, terutamanya dalam keadaan panas dan kering.',
            zh: '微小的红蜘蛛吸食植物汁液，尤其是在干热条件下。'
        },
        treatment: {
            en: [
                'Apply abamectin: 10ml per 10L water',
                'Use sulfur spray: 30g per 10L water',
                'Spray with strong water to dislodge',
                'Apply neem oil solution'
            ],
            ms: [
                'Gunakan abamectin: 10ml per 10L air',
                'Gunakan semburan sulfur: 30g per 10L air',
                'Sembur dengan air kuat untuk menanggalkan',
                'Gunakan larutan minyak neem'
            ],
            zh: [
                '施用阿维菌素：每10升水10毫升',
                '使用硫磺喷雾：每10升水30克',
                '用强力喷水冲刷以将其驱除',
                '施用印楝油溶液'
            ]
        },
        prevention: {
            en: [
                'Maintain adequate humidity',
                'Avoid water stress',
                'Encourage predatory mites',
                'Remove heavily infested leaves'
            ],
            ms: [
                'Kekalkan kelembapan yang mencukupi',
                'Elakkan tekanan air',
                'Galakkan hama pemangsa',
                'Buang daun yang sangat terjejas'
            ],
            zh: [
                '保持充足的湿度',
                '避免水分匮乏（干旱压力）',
                '鼓励捕食螨',
                '移除受害严重的叶片'
            ]
        }
    },

    // === RODENTICIDES - Rodent Control ===
    {
        id: 'rodent-damage',
        pathogen: {
            en: 'Rodents (Rats/Mice)',
            ms: 'Rodensia (Tikus)',
            zh: '啮齿动物 (老鼠)'
        },
        name: {
            en: 'Rodent Damage',
            ms: 'Kerosakan Rodensia',
            zh: '鼠害'
        },
        category: 'Rodenticides',
        symptoms: {
            en: 'Gnawed fruits, stems, and roots. Missing seedlings. Burrows near plants.',
            ms: 'Buah, batang, dan akar digigit. Anak benih hilang. Lubang berhampiran tanaman.',
            zh: '被啃咬的果实、茎和根。秧苗失踪。植物附近有洞穴。'
        },
        causes: {
            en: 'Rats, mice, and other rodents feeding on crops.',
            ms: 'Tikus dan rodensia lain memakan tanaman.',
            zh: '大鼠、小鼠和其他啮齿动物取食作物。'
        },
        treatment: {
            en: [
                'Use rodent bait stations with bromadiolone',
                'Set snap traps or live traps',
                'Apply zinc phosphide baits',
                'Seal entry points to storage areas'
            ],
            ms: [
                'Gunakan stesen umpan rodensia dengan bromadiolone',
                'Pasang perangkap tikus atau perangkap hidup',
                'Gunakan umpan zink fosfida',
                'Tutup laluan masuk ke kawasan penyimpanan'
            ],
            zh: [
                '使用含有溴敌隆的毒饵站',
                '设置捕鼠夹或活捕笼',
                '施用磷化锌诱饵',
                '密封仓库入口处'
            ]
        },
        prevention: {
            en: [
                'Maintain clean, debris-free areas',
                'Store harvested crops properly',
                'Use physical barriers (wire mesh)',
                'Encourage natural predators (owls, snakes)'
            ],
            ms: [
                'Kekalkan kawasan bersih and bebas sisa',
                'Simpan hasil tuaian dengan betul',
                'Gunakan halangan fizikal (jaring dawai)',
                'Galakkan pemangsa semula jadi (burung hantu, ular)'
            ],
            zh: [
                '保持区域整洁、无残骸',
                '正确储存收获的作物',
                '使用物理屏障（铁丝网）',
                '鼓励自然天敌（猫头鹰、蛇）'
            ]
        }
    },

    // === NUTRIENT DEFICIENCIES ===
    {
        id: 'nitrogen-deficiency',
        name: {
            en: 'Nitrogen (N) Deficiency',
            ms: 'Kekurangan Nitrogen (N)',
            zh: '氮 (N) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Yellowing of older leaves starting from tips. Stunted growth. Pale green color overall.',
            ms: 'Daun tua menguning bermula dari hujung. Pertumbuhan terbantut. Warna hijau pucat secara keseluruhan.',
            zh: '老叶从尖端开始变黄。生长迟缓。整体呈淡绿色。'
        },
        causes: {
            en: 'Insufficient nitrogen in soil. Leaching in sandy soils.',
            ms: 'Nitrogen tidak mencukupi dalam tanah. Larut lesap dalam tanah berpasir.',
            zh: '土壤中氮素不足。在沙质土壤中易流失。'
        },
        treatment: {
            en: [
                'Apply Urea 46-0-0: 50g per tree every 2 weeks',
                'Use ammonium sulfate: 100g per tree monthly',
                'Apply organic compost 5kg per tree',
                'Foliar spray with urea solution (2%)'
            ],
            ms: [
                'Tabur Urea 46-0-0: 50g sepokok setiap 2 minggu',
                'Gunakan ammonium sulfat: 100g sepokok setiap bulan',
                'Tabur kompos organik 5kg sepokok',
                'Semburan daun dengan larutan urea (2%)'
            ],
            zh: [
                '施用尿素 46-0-0：每棵树每2周50克',
                '使用硫酸铵：每棵树每月100克',
                '施用有机堆肥：每棵树5公斤',
                '用2%尿素溶液进行叶面喷施'
            ]
        },
        prevention: {
            en: [
                'Regular fertilization with NPK 15-15-15',
                'Add organic matter to soil',
                'Use slow-release nitrogen fertilizers',
                'Plant nitrogen-fixing cover crops'
            ],
            ms: [
                'Pembajaan berkala dengan NPK 15-15-15',
                'Tambah bahan organik ke tanah',
                'Gunakan baja nitrogen pelepasan perlahan',
                'Tanam tanaman penutup bumi pengikat nitrogen'
            ],
            zh: [
                '定期施用 NPK 15-15-15 肥料',
                '向土壤中添加有机物质',
                '使用缓释氮肥',
                '种植固氮覆盖作物'
            ]
        }
    },
    {
        id: 'phosphorus-deficiency',
        name: {
            en: 'Phosphorus (P) Deficiency',
            ms: 'Kekurangan Fosforus (P)',
            zh: '磷 (P) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Dark green or purple leaves. Stunted root development. Delayed flowering.',
            ms: 'Daun hijau tua atau ungu. Perkembangan akar terbantut. Pembungaan lewat.',
            zh: '叶片呈暗绿色或紫色。根系发育迟缓。开花延迟。'
        },
        causes: {
            en: 'Low soil phosphorus. Acidic or alkaline soils.',
            ms: 'Fosforus tanah rendah. Tanah berasid atau beralkali.',
            zh: '土壤磷含量低。酸性或碱性土壤。'
        },
        treatment: {
            en: [
                'Apply Triple Superphosphate (0-46-0): 30g per tree',
                'Use Rock Phosphate for long-term supply',
                'Apply bone meal: 200g per tree',
                'Foliar spray with phosphoric acid'
            ],
            ms: [
                'Tabur Triple Superphosphate (0-46-0): 30g sepokok',
                'Gunakan Rock Phosphate untuk bekalan jangka panjang',
                'Tabur tepung tulang: 200g sepokok',
                'Semburan daun dengan asid fosforik'
            ],
            zh: [
                '施用重过磷酸钙 (0-46-0)：每棵树30克',
                '使用磷矿粉进行长期供应',
                '施用骨粉：每棵树200克',
                '用磷酸溶液进行叶面喷施'
            ]
        },
        prevention: {
            en: [
                'Maintain soil pH 6.0-7.0',
                'Regular soil testing',
                'Use balanced NPK fertilizers',
                'Add compost to improve availability'
            ],
            ms: [
                'Kekalkan pH tanah 6.0-7.0',
                'Ujian tanah berkala',
                'Gunakan baja NPK seimbang',
                'Tambah kompos untuk meningkatkan ketersediaan'
            ],
            zh: [
                '保持土壤 pH 值在 6.0-7.0 之间',
                '定期进行土壤测试',
                '使用平衡的 NPK 肥料',
                '添加堆肥以提高养分利用率'
            ]
        }
    },
    {
        id: 'potassium-deficiency',
        name: {
            en: 'Potassium (K) Deficiency',
            ms: 'Kekurangan Kalium (K)',
            zh: '钾 (K) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Yellowing and browning of leaf margins. Weak stems. Poor fruit quality.',
            ms: 'Menguning and keperangan pada tepi daun. Batang lemah. Kualiti buah rendah.',
            zh: '叶缘变黄变褐。茎部脆弱。果实品质差。'
        },
        causes: {
            en: 'Insufficient potassium. Leaching in sandy soils.',
            ms: 'Kalium tidak mencukupi. Larut lesap dalam tanah berpasir.',
            zh: '钾元素不足。在沙质土壤中易流失。'
        },
        treatment: {
            en: [
                'Apply Potassium Sulfate (0-0-50): 50g per tree',
                'Use Muriate of Potash: 40g per tree',
                'Apply wood ash: 300g per tree',
                'Foliar spray with potassium nitrate (1%)'
            ],
            ms: [
                'Tabur Kalium Sulfat (0-0-50): 50g sepokok',
                'Gunakan Muriate of Potash: 40g sepokok',
                'Tabur abu kayu: 300g sepokok',
                'Semburan daun dengan kalium nitrat (1%)'
            ],
            zh: [
                '施用硫酸钾 (0-0-50)：每棵树50克',
                '使用氯化钾：每棵树40克',
                '施用草木灰：每棵树300克',
                '用1%硝酸钾溶液进行叶面喷施'
            ]
        },
        prevention: {
            en: [
                'Regular complete fertilizer application',
                'Mulch to reduce leaching',
                'Soil testing every 6 months',
                'Use slow-release potassium'
            ],
            ms: [
                'Penggunaan baja lengkap berkala',
                'Mulsakan untuk mengurangkan larut lesap',
                'Ujian tanah setiap 6 bulan',
                'Gunakan kalium pelepasan perlahan'
            ],
            zh: [
                '定期施用复合肥',
                '铺设地膜以减少养分流失',
                '每6个月进行一次土壤测试',
                '使用缓释钾肥'
            ]
        }
    },
    {
        id: 'iron-deficiency',
        name: {
            en: 'Iron (Fe) Deficiency',
            ms: 'Kekurangan Zat Besi (Fe)',
            zh: '铁 (Fe) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on young leaves. Veins remain green.',
            ms: 'Klorosis antara urat pada daun muda. Urat kekal hijau.',
            zh: '幼叶出现脉间失绿。叶脉保持绿色。'
        },
        causes: {
            en: 'High soil pH making iron unavailable. Waterlogged soils.',
            ms: 'pH tanah tinggi menyebabkan zat besi tidak tersedia. Tanah bertakung air.',
            zh: '土壤 pH 值过高导致铁元素无法被吸收。土壤积水。'
        },
        treatment: {
            en: [
                'Apply chelated iron (Fe-EDTA): 10g per 10L water',
                'Use ferrous sulfate: 50g per tree',
                'Lower soil pH with sulfur: 100g per tree',
                'Foliar spray iron sulfate (0.5%)'
            ],
            ms: [
                'Gunakan zat besi kelat (Fe-EDTA): 10g per 10L air',
                'Gunakan ferus sulfat: 50g sepokok',
                'Turunkan pH tanah dengan sulfur: 100g sepokok',
                'Semburan daun ferus sulfat (0.5%)'
            ],
            zh: [
                '施用螯合铁 (Fe-EDTA)：每10升水10克',
                '使用硫酸亚铁：每棵树50克',
                '用硫磺粉降低土壤 pH 值：每棵树100克',
                '用0.5%硫酸亚铁溶液进行叶面喷施'
            ]
        },
        prevention: {
            en: [
                'Maintain soil pH 6.0-6.5',
                'Ensure good drainage',
                'Use acidifying fertilizers',
                'Add organic matter'
            ],
            ms: [
                'Kekalkan pH tanah 6.0-6.5',
                'Pastikan saliran baik',
                'Gunakan baja pengasid',
                'Tambah bahan organik'
            ],
            zh: [
                '保持土壤 pH 值在 6.0-6.5 之间',
                '确保良好的排水',
                '使用酸性肥料',
                '添加有机物质'
            ]
        }
    },
    {
        id: 'magnesium-deficiency',
        name: {
            en: 'Magnesium (Mg) Deficiency',
            ms: 'Kekurangan Magnesium (Mg)',
            zh: '镁 (Mg) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on older leaves. Leaf edges curl upward.',
            ms: 'Klorosis antara urat pada daun tua. Tepi daun melengkung ke atas.',
            zh: '老叶出现脉间失绿。叶边缘向上卷曲。'
        },
        causes: {
            en: 'Low magnesium. Acidic soils. Excessive potassium.',
            ms: 'Magnesium rendah. Tanah berasid. Kalium berlebihan.',
            zh: '镁含量低。酸性土壤。钾肥过量。'
        },
        treatment: {
            en: [
                'Apply Epsom salt (MgSO4): 30g per tree',
                'Use Dolomite lime: 200g per tree',
                'Foliar spray magnesium sulfate (2%)',
                'Apply magnesium oxide: 20g per tree'
            ],
            ms: [
                'Gunakan garam Epsom (MgSO4): 30g sepokok',
                'Gunakan kapur Dolomit: 200g sepokok',
                'Semburan daun magnesium sulfat (2%)',
                'Tabur magnesium oksida: 20g sepokok'
            ],
            zh: [
                '施用泻盐 (硫酸镁)：每棵树30克',
                '使用白云石石灰：每棵树200克',
                '用2%硫酸镁溶液进行叶面喷施',
                '施用氧化镁：每棵树20克'
            ]
        },
        prevention: {
            en: [
                'Use dolomite lime instead of regular lime',
                'Balance NPK fertilization',
                'Regular soil testing',
                'Avoid excessive potassium'
            ],
            ms: [
                'Gunakan kapur dolomite dan bukan kapur biasa',
                'Seimbangkan pembajaan NPK',
                'Ujian tanah berkala',
                'Elakkan kalium berlebihan'
            ],
            zh: [
                '使用白云石石灰代替普通石灰',
                '平衡 NPK 施肥',
                '定期检测土壤',
                '避免钾肥过量'
            ]
        }
    },
    {
        id: 'calcium-deficiency',
        name: {
            en: 'Calcium (Ca) Deficiency',
            ms: 'Kekurangan Kalsium (Ca)',
            zh: '钙 (Ca) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Blossom end rot in fruits. Tip burn in leaves. Stunted roots.',
            ms: 'Reput hujung buah. Terbakar hujung daun. Akar terbantut.',
            zh: '果实出现脐腐病（底腐病）。叶尖灼伤。根系生长受抑制。'
        },
        causes: {
            en: 'Low soil calcium. Irregular watering.',
            ms: 'Kalsium tanah rendah. Penyiraman tidak sekata.',
            zh: '土壤钙含量低。浇水不均匀。'
        },
        treatment: {
            en: [
                'Apply calcium nitrate: 50g per tree',
                'Use gypsum: 100g per tree',
                'Apply agricultural lime: 200g per tree',
                'Foliar spray calcium chloride (0.5%)'
            ],
            ms: [
                'Tabur kalsium nitrat: 50g sepokok',
                'Gunakan gipsum: 100g sepokok',
                'Tabur kapur pertanian: 200g sepokok',
                'Semburan daun kalsium klorida (0.5%)'
            ],
            zh: [
                '施用硝酸钙：每棵树50克',
                '使用石膏：每棵树100克',
                '施用农业石灰：每棵树200克',
                '用0.5%氯化钙溶液进行叶面喷施'
            ]
        },
        prevention: {
            en: [
                'Maintain consistent soil moisture',
                'Apply lime to acidic soils',
                'Mulch to regulate moisture',
                'Avoid excessive nitrogen'
            ],
            ms: [
                'Kekalkan kelembapan tanah yang konsisten',
                'Tabur kapur pada tanah berasid',
                'Mulsakan untuk mengawal kelembapan',
                'Elakkan nitrogen berlebihan'
            ],
            zh: [
                '保持土壤水分一致',
                '对酸性土壤施用石灰',
                '铺设地膜以调节水分',
                '避免氮肥过量'
            ]
        }
    },
    {
        id: 'zinc-deficiency',
        name: {
            en: 'Zinc (Zn) Deficiency',
            ms: 'Kekurangan Zink (Zn)',
            zh: '锌 (Zn) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Small, narrow leaves (little leaf). Short internodes. Rosetting.',
            ms: 'Daun kecil dan sempit. Ruas pendek. Roset.',
            zh: '叶片小而窄（小叶病）。节间变短。形成簇生（丛叶状）。'
        },
        causes: {
            en: 'High soil pH. Low organic matter. Excessive phosphorus.',
            ms: 'pH tanah tinggi. Bahan organik rendah. Fosforus berlebihan.',
            zh: '土壤 pH 值过高。有机质含量低。磷肥过量。'
        },
        treatment: {
            en: [
                'Apply zinc sulfate: 25g per tree',
                'Foliar spray zinc sulfate (0.5%)',
                'Use chelated zinc: 10g per tree',
                'Apply zinc oxide: 15g per tree'
            ],
            ms: [
                'Tabur zink sulfat: 25g sepokok',
                'Semburan daun zink sulfat (0.5%)',
                'Gunakan zink kelat: 10g sepokok',
                'Tabur zink oksida: 15g sepokok'
            ],
            zh: [
                '施用硫酸锌：每棵树25克',
                '用0.5%硫酸锌溶液进行叶面喷施',
                '使用螯合锌：每棵树10克',
                '施用氧化锌：每棵树15克'
            ]
        },
        prevention: {
            en: [
                'Maintain soil pH 6.0-7.0',
                'Add organic matter regularly',
                'Avoid excessive phosphorus',
                'Use zinc-containing fertilizers'
            ],
            ms: [
                'Kekalkan pH tanah 6.0-7.0',
                'Tambah bahan organik secara berkala',
                'Elakkan fosforus berlebihan',
                'Gunakan baja yang mengandungi zink'
            ],
            zh: [
                '保持土壤 pH 值在 6.0-7.0 之间',
                '定期添加有机物质',
                '避免磷肥过量',
                '使用含锌肥料'
            ]
        }
    },
    {
        id: 'manganese-deficiency',
        name: {
            en: 'Manganese (Mn) Deficiency',
            ms: 'Kekurangan Mangan (Mn)',
            zh: '锰 (Mn) 缺乏症'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on young leaves. Tan or brown spots.',
            ms: 'Klorosis antara urat pada daun muda. Bintik coklat.',
            zh: '幼叶出现脉间失绿。出现棕褐色或褐色斑点。'
        },
        causes: {
            en: 'High soil pH. Excessive iron or zinc.',
            ms: 'pH tanah tinggi. Zat besi atau zink berlebihan.',
            zh: '土壤 pH 值过高。铁或锌含量过量。'
        },
        treatment: {
            en: [
                'Apply manganese sulfate: 20g per tree',
                'Foliar spray manganese sulfate (0.3%)',
                'Use chelated manganese: 10g per tree',
                'Lower soil pH with sulfur if needed'
            ],
            ms: [
                'Tabur mangan sulfat: 20g sepokok',
                'Semburan daun mangan sulfat (0.3%)',
                'Gunakan mangan kelat: 10g sepokok',
                'Turunkan pH tanah dengan sulfur jika perlu'
            ],
            zh: [
                '施用硫酸锰：每棵树20克',
                '用0.3%硫酸锰溶液进行叶面喷施',
                '使用螯合锰：每棵树10克',
                '如果需要，用硫磺粉降低土壤 pH 值'
            ]
        },
        prevention: {
            en: [
                'Maintain soil pH 5.5-6.5',
                'Ensure good drainage',
                'Regular soil testing',
                'Use complete micronutrient fertilizers'
            ],
            ms: [
                'Kekalkan pH tanah 5.5-6.5',
                'Pastikan saliran baik',
                'Ujian tanah berkala',
                'Gunakan baja mikronutrien lengkap'
            ],
            zh: [
                '保持土壤 pH 值在 5.5-6.5 之间',
                '确保良好的排水',
                '定期进行土壤测试',
                '使用全效微量元素肥料'
            ]
        }
    },
];

/**
 * Get all diseases for a specific category
 * @param {string} category - Plant category
 * @returns {Array} Filtered diseases
 */
export const getDiseasesByCategory = (category) => {
    if (!category) return diseaseDatabase;
    return diseaseDatabase.filter(disease => disease.category === category);
};

/**
 * Search diseases by name or symptoms
 * @param {string} query - Search query
 * @returns {Array} Matching diseases
 */
export const searchDiseases = (query) => {
    if (!query) return diseaseDatabase;

    const lowerQuery = query.toLowerCase();
    return diseaseDatabase.filter(disease => {
        // Handle name (obj or string)
        const nameEn = typeof disease.name === 'object' ? disease.name.en : disease.name;
        const nameMs = typeof disease.name === 'object' ? disease.name.ms : '';
        const nameZh = typeof disease.name === 'object' ? disease.name.zh : '';

        // Handle symptoms (obj or string)
        const symptomsEn = typeof disease.symptoms === 'object' ? disease.symptoms.en : disease.symptoms;
        const symptomsMs = typeof disease.symptoms === 'object' ? disease.symptoms.ms : '';
        const symptomsZh = typeof disease.symptoms === 'object' ? disease.symptoms.zh : '';

        // Category is always string
        const category = disease.category;

        return (
            (nameEn && nameEn.toLowerCase().includes(lowerQuery)) ||
            (nameMs && nameMs.toLowerCase().includes(lowerQuery)) ||
            (symptomsEn && symptomsEn.toLowerCase().includes(lowerQuery)) ||
            (symptomsMs && symptomsMs.toLowerCase().includes(lowerQuery)) ||
            (nameZh && nameZh.toLowerCase().includes(lowerQuery)) ||
            (symptomsZh && symptomsZh.toLowerCase().includes(lowerQuery)) ||
            category.toLowerCase().includes(lowerQuery)
        );
    });
};


/**
 * Get all unique categories
 * @returns {Array} Array of category names
 */
export const getCategories = () => {
    return [...new Set(diseaseDatabase.map(disease => disease.category))];
};
