// Southeast Asian Plant Disease & Pest Control Database
// Categories based on agricultural pest control classification

export const diseaseDatabase = [
    // === FUNGICIDES - Fungal Disease Control ===
    {
        id: 'rice-blast',
        pathogen: {
            en: 'Magnaporthe oryzae (Fungus)',
            ms: 'Magnaporthe oryzae (Kulat)'
        },
        name: {
            en: 'Rice Blast',
            ms: 'Karat Daun Padi'
        },
        category: 'Fungicides',
        // ... symptoms, causes, etc. unchanged to save tokens if possible, but I need to replace the whole object
        symptoms: {
            en: 'Diamond-shaped lesions on leaves with gray centers and brown margins. Neck rot causing panicles to fall over.',
            ms: 'Lesi berbentuk berlian pada daun dengan pusat kelabu dan tepi coklat. Reput tangkai menyebabkan tangkai padi terkulai.'
        },
        causes: {
            en: 'Fungal infection favored by high humidity and nitrogen fertilization.',
            ms: 'Jangkitan kulat yang digalakkan oleh kelembapan tinggi dan pembajaan nitrogen.'
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
            ]
        }
    },
    // Adding Malaysian Plantation Diseases
    {
        id: 'ganoderma-bsr',
        pathogen: {
            en: 'Ganoderma boninense (Fungus)',
            ms: 'Ganoderma boninense (Kulat)'
        },
        name: {
            en: 'Basal Stem Rot (BSR)',
            ms: 'Reput Pangkal Batang (BSR)'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Unopened spears (fronds), yellowing of lower fronds, decay at the base of the trunk.',
            ms: 'Pucuk tidak terbuka, kekuningan pada pelepah bawah, reput pada pangkal batang.'
        },
        causes: {
            en: 'Soil-borne fungus that attacks the oil palm root system and trunk base.',
            ms: 'Kulat bawaan tanah yang menyerang sistem akar kelapa sawit dan pangkal batang.'
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
            ]
        }
    },
    {
        id: 'white-root-disease',
        pathogen: {
            en: 'Rigidoporus microporus (Fungus)',
            ms: 'Rigidoporus microporus (Kulat)'
        },
        name: {
            en: 'White Root Disease',
            ms: 'Penyakit Akar Putih'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Foliage turns yellowish, white fungal rhizomorphs on root surface, eventually tree death.',
            ms: 'Daun menjadi kekuningan, rizomorf kulat putih pada permukaan akar, akhirnya kematian pokok.'
        },
        causes: {
            en: 'Spread through root contact with infected debris or neighboring trees.',
            ms: 'Tersebar melalui sentuhan akar dengan sisa yang dijangkiti atau pokok jiran.'
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
            ]
        }
    },
    {
        id: 'bagworms',
        pathogen: {
            en: 'Metisa plana / Mahasena corbetti (Insect)',
            ms: 'Metisa plana / Mahasena corbetti (Serangga)'
        },
        name: {
            en: 'Bagworms',
            ms: 'Ulat Bungkus'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Defoliation of fronds, scorched appearance of leaves, presence of small bags/cases hanging from leaves.',
            ms: 'Keguguran pelepah, penampilan daun yang hangus, kehadiran beg/sarung kecil yang tergantung pada daun.'
        },
        causes: {
            en: 'Larval feeding of psychid moths, often triggered by imbalance in natural predators.',
            ms: 'Pemakanan larva rama-rama psikid, sering dicetuskan oleh ketidakseimbangan pemangsa semula jadi.'
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
            ]
        }
    },
    {
        id: 'powdery-mildew',
        pathogen: {
            en: 'Oidium heveae / Podisphaera (Fungus)',
            ms: 'Oidium heveae / Podisphaera (Kulat)'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'White powdery coating on leaves, stems, and fruits. Leaves may yellow and drop.',
            ms: 'Lapisan serbuk putih pada daun, batang, dan buah. Daun mungkin menguning dan gugur.'
        },
        causes: {
            en: 'Fungal infection favored by high humidity and moderate temperatures.',
            ms: 'Jangkitan kulat yang digalakkan oleh kelembapan tinggi dan suhu sederhana.'
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
            ]
        }
    },
    {
        id: 'anthracnose',
        pathogen: {
            en: 'Colletotrichum species (Fungus)',
            ms: 'Spesies Colletotrichum (Kulat)'
        },
        name: {
            en: 'Anthracnose',
            ms: 'Antraknos'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Dark, sunken lesions on fruits. Brown spots on leaves. Premature fruit drop.',
            ms: 'Lesi gelap dan tenggelam pada buah. Bintik coklat pada daun. Buah gugur pramatang.'
        },
        causes: {
            en: 'Common in mangoes, papayas, bananas during wet seasons.',
            ms: 'Biasa pada mangga, betik, pisang semasa musim hujan.'
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
            ]
        }
    },
    {
        id: 'durian-stem-canker',
        pathogen: {
            en: 'Phytophthora palmivora (Oomycete/Water Mold)',
            ms: 'Phytophthora palmivora (Kulat Air)'
        },
        name: {
            en: 'Stem Canker',
            ms: 'Kanker Batang'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Dark, water-soaked patches on the bark, reddish-brown resin exudation, bark cracking.',
            ms: 'Tompok gelap dan lembap pada kulit kayu, pengeluaran resin coklat-merah, kulit kayu pecah.'
        },
        causes: {
            en: 'Soil-borne pathogen favored by high rainfall and poor drainage in Durian orchards.',
            ms: 'Patogen bawaan tanah yang digalakkan oleh hujan lebat dan saliran buruk di kebun Durian.'
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
            ]
        }
    },
    {
        id: 'durian-fruit-borer',
        pathogen: {
            en: 'Conogethes punctiferalis / Mudaria (Insect)',
            ms: 'Conogethes punctiferalis / Mudaria (Serangga)'
        },
        name: {
            en: 'Fruit Borer',
            ms: 'Pengorek Buah'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Holes on fruit surface with frass (insect droppings), rotting of internal fruit pulp.',
            ms: 'Lubang pada permukaan buah dengan najis serangga, kebusukan isi buah di dalam.'
        },
        causes: {
            en: 'Larvae boring into fruits to feed on seeds and pulp.',
            ms: 'Larva mengorek masuk ke dalam buah untuk memakan biji dan isi.'
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
            ]
        }
    },
    {
        id: 'pineapple-heart-rot',
        pathogen: {
            en: 'Erwinia chrysanthemi (Bacteria)',
            ms: 'Erwinia chrysanthemi (Bakteria)'
        },
        name: {
            en: 'Bacterial Heart Rot',
            ms: 'Reput Hati Bakteria'
        },
        category: 'Bactericides',
        symptoms: {
            en: 'Water-soaked lesions on central leaves, foul-smelling rot, primary leaves easily pulled out.',
            ms: 'Lesi lembap pada daun tengah, reput berbau busuk, daun utama mudah dicabut.'
        },
        causes: {
            en: 'Bacterial infection through wounds or natural openings in wet conditions.',
            ms: 'Jangkitan bakteria melalui luka atau bukaan semula jadi dalam keadaan basah.'
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
            ]
        }
    },
    {
        id: 'fusarium-wilt',
        name: {
            en: 'Fusarium Wilt',
            ms: 'Layu Fusarium'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Yellowing of lower leaves progressing upward. Wilting during day. Brown vascular discoloration.',
            ms: 'Daun bawah menguning dan merebak ke atas. Layu pada siang hari. Perubahan warna vaskular coklat.'
        },
        causes: {
            en: 'Soil-borne fungus (Fusarium oxysporum) blocking water transport.',
            ms: 'Kulat bawaan tanah (Fusarium oxysporum) menyekat pengangkutan air.'
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
            ]
        }
    },
    {
        id: 'downy-mildew',
        name: {
            en: 'Downy Mildew',
            ms: 'Kulapuk Downy'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Yellow patches on upper leaf surface. Gray-purple fuzzy growth on undersides.',
            ms: 'Tompok kuning pada permukaan atas daun. Pertumbuhan berbulu kelabu-ungu di bahagian bawah.'
        },
        causes: {
            en: 'Fungal-like organism (Peronospora) thriving in cool, wet conditions.',
            ms: 'Organisma seperti kulat (Peronospora) yang tumbuh subur dalam keadaan sejuk dan basah.'
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
            ]
        }
    },
    {
        id: 'black-spot',
        name: {
            en: 'Black Spot Disease',
            ms: 'Penyakit Bintik Hitam'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Circular black spots with yellow halos on leaves. Premature leaf drop.',
            ms: 'Bintik hitam bulat dengan lingkaran kuning pada daun. Daun gugur pramatang.'
        },
        causes: {
            en: 'Fungal infection spread by water splash.',
            ms: 'Jangkitan kulat yang disebarkan oleh percikan air.'
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
            ]
        }
    },
    {
        id: 'rust-disease',
        name: {
            en: 'Rust Disease',
            ms: 'Penyakit Karat'
        },
        category: 'Fungicides',
        symptoms: {
            en: 'Orange, yellow, or brown pustules on leaf undersides. Premature leaf drop.',
            ms: 'Pustul oren, kuning, atau coklat pada bahagian bawah daun. Daun gugur pramatang.'
        },
        causes: {
            en: 'Fungal spores (Puccinia) spread by wind.',
            ms: 'Spora kulat (Puccinia) disebarkan oleh angin.'
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
            ]
        }
    },

    // === INSECTICIDES - Insect Pest Control ===
    {
        id: 'aphid-infestation',
        name: {
            en: 'Aphid Infestation',
            ms: 'Serangan Afid'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Clusters of small soft-bodied insects on new growth. Curled, distorted leaves. Sticky honeydew on leaves.',
            ms: 'Kelompok serangga kecil berbadan lembut pada pertumbuhan baru. Daun bergulung dan herot. Cecair manis melekit pada daun.'
        },
        causes: {
            en: 'Aphids (various species) sucking plant sap. Spread plant viruses.',
            ms: 'Afid (pelbagai spesies) menghisap sap tumbuhan. Menyebarkan virus tumbuhan.'
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
            ]
        }
    },
    {
        id: 'whitefly-damage',
        name: {
            en: 'Whitefly Damage',
            ms: 'Kerosakan Lalat Putih'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Tiny white flying insects on leaf undersides. Yellowing leaves. Sooty mold growth.',
            ms: 'Serangga terbang putih kecil di bahagian bawah daun. Daun menguning. Pertumbuhan kulat jelaga.'
        },
        causes: {
            en: 'Whiteflies feeding on plant sap and transmitting viruses.',
            ms: 'Lalat putih memakan sap tumbuhan dan menyebarkan virus.'
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
            ]
        }
    },
    {
        id: 'fruit-fly-damage',
        name: {
            en: 'Fruit Fly Damage',
            ms: 'Kerosakan Lalat Buah'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Small puncture marks on fruit skin. Soft, rotting areas. Maggots inside fruits.',
            ms: 'Tanda tusukan kecil pada kulit buah. Kawasan lembut dan membusuk. Larva di dalam buah.'
        },
        causes: {
            en: 'Fruit flies laying eggs in ripening fruits.',
            ms: 'Lalat buah bertelur dalam buah yang sedang masak.'
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
            ]
        }
    },
    {
        id: 'leaf-miner',
        name: {
            en: 'Leaf Miner',
            ms: 'Ulat Pelombong Daun'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Serpentine trails or blotches on leaves. Reduced photosynthesis.',
            ms: 'Laluan berlingkar atau tompokan pada daun. Fotosintesis berkurang.'
        },
        causes: {
            en: 'Larvae of small flies mining between leaf surfaces.',
            ms: 'Larva lalat kecil melombong antara permukaan daun.'
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
            ]
        }
    },
    {
        id: 'thrips-damage',
        name: {
            en: 'Thrips Damage',
            ms: 'Kerosakan Thrips'
        },
        category: 'Insecticides',
        symptoms: {
            en: 'Silver-gray streaks on leaves. Distorted flowers and fruits. Tiny black insects visible.',
            ms: 'Jalur kelabu-perak pada daun. Bunga dan buah herot. Serangga hitam kecil kelihatan.'
        },
        causes: {
            en: 'Thrips feeding on plant tissues and spreading viruses.',
            ms: 'Thrips memakan tisu tumbuhan dan menyebarkan virus.'
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
            ]
        }
    },

    // === HERBICIDES - Weed Control ===
    {
        id: 'broadleaf-weeds',
        name: {
            en: 'Broadleaf Weed Control',
            ms: 'Kawalan Rumpai Daun Lebar'
        },
        category: 'Herbicides',
        symptoms: {
            en: 'Broadleaf weeds competing with crops for nutrients, water, and light.',
            ms: 'Rumpai daun lebar bersaing dengan tanaman untuk nutrien, air, dan cahaya.'
        },
        causes: {
            en: 'Various broadleaf weed species invading crop areas.',
            ms: 'Pelbagai spesies rumpai daun lebar menyerang kawasan tanaman.'
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
            ]
        }
    },
    {
        id: 'grass-weeds',
        name: {
            en: 'Grass Weed Control',
            ms: 'Kawalan Rumpai Rumput'
        },
        category: 'Herbicides',
        symptoms: {
            en: 'Grassy weeds competing with crops. Reduced crop yield.',
            ms: 'Rumpai rumput bersaing dengan tanaman. Hasil tanaman berkurang.'
        },
        causes: {
            en: 'Annual and perennial grass weeds.',
            ms: 'Rumpai rumput tahunan dan saka.'
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
            ]
        }
    },

    // === MOLLUSCICIDES - Snail & Slug Control ===
    {
        id: 'snail-slug-damage',
        name: {
            en: 'Snail and Slug Damage',
            ms: 'Kerosakan Siput dan Lintah Bulan'
        },
        category: 'Molluscicides',
        symptoms: {
            en: 'Irregular holes in leaves. Slime trails visible. Seedlings completely eaten.',
            ms: 'Lubang tidak sekata pada daun. Jejak lendir kelihatan. Anak benih dimakan sepenuhnya.'
        },
        causes: {
            en: 'Snails and slugs feeding at night on tender plant parts.',
            ms: 'Siput dan lintah bulan makan bahagian tanaman lembut pada waktu malam.'
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
            ]
        }
    },

    // === MITICIDES - Mite Control ===
    {
        id: 'spider-mites',
        name: {
            en: 'Spider Mite Infestation',
            ms: 'Serangan Hama Labah-labah'
        },
        category: 'Miticides',
        symptoms: {
            en: 'Fine webbing on leaves. Yellow stippling on leaf surface. Leaf bronzing.',
            ms: 'Sarang halus pada daun. Bintik kuning pada permukaan daun. Daun menjadi gangsa.'
        },
        causes: {
            en: 'Tiny spider mites sucking plant juices, especially in hot, dry conditions.',
            ms: 'Hama labah-labah kecil menghisap jus tumbuhan, terutamanya dalam keadaan panas dan kering.'
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
            ]
        }
    },

    // === RODENTICIDES - Rodent Control ===
    {
        id: 'rodent-damage',
        name: {
            en: 'Rodent Damage',
            ms: 'Kerosakan Rodensia'
        },
        category: 'Rodenticides',
        symptoms: {
            en: 'Gnawed fruits, stems, and roots. Missing seedlings. Burrows near plants.',
            ms: 'Buah, batang, dan akar digigit. Anak benih hilang. Lubang berhampiran tanaman.'
        },
        causes: {
            en: 'Rats, mice, and other rodents feeding on crops.',
            ms: 'Tikus dan rodensia lain memakan tanaman.'
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
                'Kekalkan kawasan bersih dan bebas sisa',
                'Simpan hasil tuaian dengan betul',
                'Gunakan halangan fizikal (jaring dawai)',
                'Galakkan pemangsa semula jadi (burung hantu, ular)'
            ]
        }
    },

    // === NUTRIENT DEFICIENCIES ===
    {
        id: 'nitrogen-deficiency',
        name: {
            en: 'Nitrogen (N) Deficiency',
            ms: 'Kekurangan Nitrogen (N)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Yellowing of older leaves starting from tips. Stunted growth. Pale green color overall.',
            ms: 'Daun tua menguning bermula dari hujung. Pertumbuhan terbantut. Warna hijau pucat secara keseluruhan.'
        },
        causes: {
            en: 'Insufficient nitrogen in soil. Leaching in sandy soils.',
            ms: 'Nitrogen tidak mencukupi dalam tanah. Larut lesap dalam tanah berpasir.'
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
            ]
        }
    },
    {
        id: 'phosphorus-deficiency',
        name: {
            en: 'Phosphorus (P) Deficiency',
            ms: 'Kekurangan Fosforus (P)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Dark green or purple leaves. Stunted root development. Delayed flowering.',
            ms: 'Daun hijau tua atau ungu. Perkembangan akar terbantut. Pembungaan lewat.'
        },
        causes: {
            en: 'Low soil phosphorus. Acidic or alkaline soils.',
            ms: 'Fosforus tanah rendah. Tanah berasid atau beralkali.'
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
            ]
        }
    },
    {
        id: 'potassium-deficiency',
        name: {
            en: 'Potassium (K) Deficiency',
            ms: 'Kekurangan Kalium (K)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Yellowing and browning of leaf margins. Weak stems. Poor fruit quality.',
            ms: 'Menguning dan keperangan pada tepi daun. Batang lemah. Kualiti buah rendah.'
        },
        causes: {
            en: 'Insufficient potassium. Leaching in sandy soils.',
            ms: 'Kalium tidak mencukupi. Larut lesap dalam tanah berpasir.'
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
            ]
        }
    },
    {
        id: 'iron-deficiency',
        name: {
            en: 'Iron (Fe) Deficiency',
            ms: 'Kekurangan Zat Besi (Fe)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on young leaves. Veins remain green.',
            ms: 'Klorosis antara urat pada daun muda. Urat kekal hijau.'
        },
        causes: {
            en: 'High soil pH making iron unavailable. Waterlogged soils.',
            ms: 'pH tanah tinggi menyebabkan zat besi tidak tersedia. Tanah bertakung air.'
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
            ]
        }
    },
    {
        id: 'magnesium-deficiency',
        name: {
            en: 'Magnesium (Mg) Deficiency',
            ms: 'Kekurangan Magnesium (Mg)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on older leaves. Leaf edges curl upward.',
            ms: 'Klorosis antara urat pada daun tua. Tepi daun melengkung ke atas.'
        },
        causes: {
            en: 'Low magnesium. Acidic soils. Excessive potassium.',
            ms: 'Magnesium rendah. Tanah berasid. Kalium berlebihan.'
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
            ]
        }
    },
    {
        id: 'calcium-deficiency',
        name: {
            en: 'Calcium (Ca) Deficiency',
            ms: 'Kekurangan Kalsium (Ca)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Blossom end rot in fruits. Tip burn in leaves. Stunted roots.',
            ms: 'Reput hujung buah. Terbakar hujung daun. Akar terbantut.'
        },
        causes: {
            en: 'Low soil calcium. Irregular watering.',
            ms: 'Kalsium tanah rendah. Penyiraman tidak sekata.'
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
            ]
        }
    },
    {
        id: 'zinc-deficiency',
        name: {
            en: 'Zinc (Zn) Deficiency',
            ms: 'Kekurangan Zink (Zn)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Small, narrow leaves (little leaf). Short internodes. Rosetting.',
            ms: 'Daun kecil dan sempit. Ruas pendek. Roset.'
        },
        causes: {
            en: 'High soil pH. Low organic matter. Excessive phosphorus.',
            ms: 'pH tanah tinggi. Bahan organik rendah. Fosforus berlebihan.'
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
            ]
        }
    },
    {
        id: 'manganese-deficiency',
        name: {
            en: 'Manganese (Mn) Deficiency',
            ms: 'Kekurangan Mangan (Mn)'
        },
        category: 'Nutrient Deficiencies',
        symptoms: {
            en: 'Interveinal chlorosis on young leaves. Tan or brown spots.',
            ms: 'Klorosis antara urat pada daun muda. Bintik coklat.'
        },
        causes: {
            en: 'High soil pH. Excessive iron or zinc.',
            ms: 'pH tanah tinggi. Zat besi atau zink berlebihan.'
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
            ]
        }
    }
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

        // Handle symptoms (obj or string)
        const symptomsEn = typeof disease.symptoms === 'object' ? disease.symptoms.en : disease.symptoms;
        const symptomsMs = typeof disease.symptoms === 'object' ? disease.symptoms.ms : '';

        // Category is always string
        const category = disease.category;

        return (
            (nameEn && nameEn.toLowerCase().includes(lowerQuery)) ||
            (nameMs && nameMs.toLowerCase().includes(lowerQuery)) ||
            (symptomsEn && symptomsEn.toLowerCase().includes(lowerQuery)) ||
            (symptomsMs && symptomsMs.toLowerCase().includes(lowerQuery)) ||
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
