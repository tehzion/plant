import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/i18n.jsx';
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, AlertTriangle, Info, Lightbulb } from 'lucide-react';

const UserGuide = () => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();

    const content = {
        en: {
            title: 'Understanding Your Scan Results',
            intro: 'This guide helps you understand what each indicator means and what actions to take.',

            healthTitle: 'Plant Health Status',
            healthSubtitle: 'What you see after scanning',

            healthy: {
                title: 'Healthy',
                meaning: 'Your plant shows no signs of disease or deficiency',
                when: 'You\'ll see this when:',
                points: [
                    'No fungal infections detected',
                    'No pest damage visible',
                    'Leaves show healthy color and structure'
                ],
                action: 'Continue regular care and monitoring'
            },

            unhealthy: {
                title: 'Unhealthy',
                meaning: 'Issues detected that need attention',
                when: 'You\'ll see this when:',
                points: [
                    'Fungal infections present',
                    'Pest damage detected',
                    'Nutrient deficiencies visible',
                    'Other disease symptoms found'
                ],
                action: 'Follow the recommended treatment plan'
            },

            riskTitle: 'Severity Levels',
            riskSubtitle: 'How serious is the problem?',

            mild: {
                title: 'Mild',
                meaning: 'Early stage or minor issue',
                description: 'The problem is just starting or affects a small area. Early intervention can prevent it from spreading.',
                example: 'Few spots on leaves, minimal damage',
                action: 'Monitor closely and apply preventive treatments'
            },

            moderate: {
                title: 'Moderate',
                meaning: 'Needs attention soon',
                description: 'The issue is established and spreading. Treatment is needed to prevent serious damage.',
                example: 'Multiple affected leaves, visible symptoms',
                action: 'Start treatment within 1-2 days'
            },

            high: {
                title: 'High',
                meaning: 'Critical - Act immediately',
                description: 'Severe infection or damage. Immediate action required to save the plant and prevent spread to others.',
                example: 'Widespread damage, rapid deterioration',
                action: 'Treat today, consider isolating plant'
            },

            treatmentTitle: 'Treatment Recommendations',
            treatmentSubtitle: 'What to do next',

            noTreatment: {
                title: 'No Treatment Needed',
                description: 'Your plant is healthy! Just maintain your current care routine.',
                tips: 'Continue monitoring during regular watering'
            },

            immediate: {
                title: 'Immediate Actions',
                description: 'Critical steps to take right away:',
                steps: [
                    'Follow the specific treatment plan shown',
                    'Isolate plant if disease is contagious',
                    'Remove severely affected parts',
                    'Apply recommended products'
                ]
            },

            tipTitle: 'Pro Tips',
            tips: [
                'Scan regularly to catch problems early',
                'Always check the confidence score - higher is more reliable',
                'Save scan history to track plant health over time',
                'Compare scans to see if treatment is working'
            ]
        },
        ms: {
            title: 'Memahami Keputusan Imbasan',
            intro: 'Panduan ini membantu anda memahami maksud setiap penunjuk dan tindakan yang perlu diambil.',

            healthTitle: 'Status Kesihatan Tumbuhan',
            healthSubtitle: 'Yang anda lihat selepas mengimbas',

            healthy: {
                title: 'Sihat',
                meaning: 'Tumbuhan anda tidak menunjukkan tanda penyakit atau kekurangan',
                when: 'Anda akan melihat ini apabila:',
                points: [
                    'Tiada jangkitan kulat dikesan',
                    'Tiada kerosakan perosak kelihatan',
                    'Daun menunjukkan warna dan struktur yang sihat'
                ],
                action: 'Teruskan penjagaan dan pemantauan biasa'
            },

            unhealthy: {
                title: 'Tidak Sihat',
                meaning: 'Masalah dikesan yang memerlukan perhatian',
                when: 'Anda akan melihat ini apabila:',
                points: [
                    'Jangkitan kulat hadir',
                    'Kerosakan perosak dikesan',
                    'Kekurangan nutrien kelihatan',
                    'Simptom penyakit lain ditemui'
                ],
                action: 'Ikuti pelan rawatan yang disyorkan'
            },

            riskTitle: 'Tahap Keterukan',
            riskSubtitle: 'Seberapa serius masalahnya?',

            mild: {
                title: 'Ringan',
                meaning: 'Peringkat awal atau isu kecil',
                description: 'Masalah baru bermula atau menjejaskan kawasan kecil. Campur tangan awal boleh menghalangnya daripada merebak.',
                example: 'Beberapa bintik pada daun, kerosakan minimum',
                action: 'Pantau rapi dan guna rawatan pencegahan'
            },

            moderate: {
                title: 'Sederhana',
                meaning: 'Perlu perhatian tidak lama lagi',
                description: 'Masalah sudah stabil dan merebak. Rawatan diperlukan untuk mengelakkan kerosakan serius.',
                example: 'Banyak daun terjejas, simptom jelas',
                action: 'Mulakan rawatan dalam 1-2 hari'
            },

            high: {
                title: 'Tinggi',
                meaning: 'Kritikal - Bertindak segera',
                description: 'Jangkitan atau kerosakan teruk. Tindakan segera diperlukan untuk menyelamatkan tumbuhan dan mencegah rebakan kepada yang lain.',
                example: 'Kerosakan meluas, kemerosotan pesat',
                action: 'Rawat hari ini, pertimbangkan pengasingan'
            },

            treatmentTitle: 'Cadangan Rawatan',
            treatmentSubtitle: 'Apa yang perlu dilakukan seterusnya',

            noTreatment: {
                title: 'Tiada Rawatan Diperlukan',
                description: 'Tumbuhan anda sihat! Kekalkan rutin penjagaan semasa.',
                tips: 'Terus pantau semasa penyiraman biasa'
            },

            immediate: {
                title: 'Tindakan Segera',
                description: 'Langkah kritikal untuk diambil sekarang:',
                steps: [
                    'Ikuti pelan rawatan khusus yang ditunjukkan',
                    'Asingkan tumbuhan jika penyakit berjangkit',
                    'Buang bahagian yang terjejas teruk',
                    'Guna produk yang disyorkan'
                ]
            },

            tipTitle: 'Petua Profesional',
            tips: [
                'Imbas kerap untuk kesan masalah awal',
                'Sentiasa semak skor keyakinan - lebih tinggi lebih boleh dipercayai',
                'Simpan sejarah imbasan untuk jejak kesihatan tumbuhan',
                'Bandingkan imbasan untuk lihat sama ada rawatan berkesan'
            ]
        },
        zh: {
            title: '了解您的扫描结果',
            intro: '本指南可帮助您了解每个指标的含义以及应采取的操作。',

            healthTitle: '植物健康状况',
            healthSubtitle: '扫描后您会看到什么',

            healthy: {
                title: '健康',
                meaning: '您的植物没有疾病或缺陷的迹象',
                when: '您在以下情况下会看到此信息：',
                points: [
                    '未检测到真菌感染',
                    '无明显可见害虫破坏',
                    '叶片显示健康的颜色和结构'
                ],
                action: '继续日常的护理和监测'
            },

            unhealthy: {
                title: '不健康',
                meaning: '检测到需要注意的问题',
                when: '您在以下情况下会看到此信息：',
                points: [
                    '存在真菌感染',
                    '检测到害虫破坏',
                    '可见营养缺乏',
                    '发现其他疾病症状'
                ],
                action: '请按照推荐的治疗计划进行操作'
            },

            riskTitle: '严重程度',
            riskSubtitle: '问题有多严重？',

            mild: {
                title: '轻度',
                meaning: '早期阶段或次要问题',
                description: '问题刚刚开始或影响面积很小。早期干预可以防止其蔓延。',
                example: '叶子上有少量斑点，损伤极小',
                action: '密切关注并进行预防性治疗'
            },

            moderate: {
                title: '中度',
                meaning: '需要尽快注意',
                description: '问题已经确立并正在蔓延。需要进行治疗以防止造成严重损害。',
                example: '多片叶子受影响，症状明显',
                action: '在1-2天内开始治疗'
            },

            high: {
                title: '重度',
                meaning: '严重 - 立即行动',
                description: '感染或损害严重。需要立即采取行动拯救植物并防止其传播给其他植物。',
                example: '广泛受到破坏，迅速恶化',
                action: '今天就进行治疗，考虑隔离植物'
            },

            treatmentTitle: '治疗建议',
            treatmentSubtitle: '下一步该做什么',

            noTreatment: {
                title: '无需治疗',
                description: '您的植物很健康！请保持当前的护理常规即可。',
                tips: '在日常浇水期间继续监测'
            },

            immediate: {
                title: '立即行动',
                description: '需立即采取的关键步骤：',
                steps: [
                    '按照显示的具体治疗计划进行操作',
                    '如果是传染病，隔离植物',
                    '去除受影响严重的部位',
                    '使用推荐的产品'
                ]
            },

            tipTitle: '专业提示',
            tips: [
                '定期扫描以便及早发现问题',
                '始终检查置信度得分 - 得分越高越可靠',
                '保存扫描历史记录以长期跟踪植物健康状况',
                '比较扫描结果以查看治疗是否有效'
            ]
        }
    };

    const lang = content[language] || content.en;

    return (
        <div className="page guide-page">
            <div className="container" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div className="guide-header">
                    <button onClick={() => navigate(-1)} className="back-btn">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1>{lang.title}</h1>
                        <p className="guide-intro">{lang.intro}</p>
                    </div>
                </div>

                <div className="guide-content">
                    {/* Health Status Section */}
                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{lang.healthTitle}</h2>
                            <p className="section-subtitle">{lang.healthSubtitle}</p>
                        </div>

                        {/* Healthy */}
                        <div className="educational-card healthy">
                            <div className="card-header">
                                <div className="status-icon"><CheckCircle size={24} /></div>
                                <div>
                                    <h3>{lang.healthy.title}</h3>
                                    <p className="card-meaning">{lang.healthy.meaning}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p className="when-label">{lang.healthy.when}</p>
                                <ul className="indicator-list">
                                    {lang.healthy.points.map((point, i) => (
                                        <li key={i}><CheckCircle size={14} /> {point}</li>
                                    ))}
                                </ul>
                                <div className="action-box success">
                                    <Lightbulb size={16} />
                                    <span>{lang.healthy.action}</span>
                                </div>
                            </div>
                        </div>

                        {/* Unhealthy */}
                        <div className="educational-card unhealthy">
                            <div className="card-header">
                                <div className="status-icon"><XCircle size={24} /></div>
                                <div>
                                    <h3>{lang.unhealthy.title}</h3>
                                    <p className="card-meaning">{lang.unhealthy.meaning}</p>
                                </div>
                            </div>
                            <div className="card-body">
                                <p className="when-label">{lang.unhealthy.when}</p>
                                <ul className="indicator-list">
                                    {lang.unhealthy.points.map((point, i) => (
                                        <li key={i}><AlertCircle size={14} /> {point}</li>
                                    ))}
                                </ul>
                                <div className="action-box warning">
                                    <AlertTriangle size={16} />
                                    <span>{lang.unhealthy.action}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risk Levels Section */}
                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{lang.riskTitle}</h2>
                            <p className="section-subtitle">{lang.riskSubtitle}</p>
                        </div>

                        <div className="severity-timeline">
                            {['mild', 'moderate', 'high'].map((level) => (
                                <div key={level} className={`severity-card ${level}`}>
                                    <div className="severity-badge">{lang[level].title}</div>
                                    <h4>{lang[level].meaning}</h4>
                                    <p className="severity-desc">{lang[level].description}</p>
                                    <div className="example-box">
                                        <Info size={14} />
                                        <span><strong>{t('common.example')}:</strong> {lang[level].example}</span>
                                    </div>
                                    <div className="action-box">
                                        <AlertTriangle size={14} />
                                        <span>{lang[level].action}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Treatment Section */}
                    <div className="guide-section">
                        <div className="section-header">
                            <h2>{lang.treatmentTitle}</h2>
                            <p className="section-subtitle">{lang.treatmentSubtitle}</p>
                        </div>

                        <div className="treatment-grid">
                            <div className="treatment-card success">
                                <CheckCircle size={20} />
                                <h4>{lang.noTreatment.title}</h4>
                                <p>{lang.noTreatment.description}</p>
                                <div className="tip-box">
                                    <Lightbulb size={14} />
                                    <span>{lang.noTreatment.tips}</span>
                                </div>
                            </div>

                            <div className="treatment-card urgent">
                                <AlertTriangle size={20} />
                                <h4>{lang.immediate.title}</h4>
                                <p>{lang.immediate.description}</p>
                                <ol className="steps-list">
                                    {lang.immediate.steps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="guide-section">
                        <div className="tips-section">
                            <div className="tips-header">
                                <Lightbulb size={24} />
                                <h3>{lang.tipTitle}</h3>
                            </div>
                            <div className="tips-grid">
                                {lang.tips.map((tip, i) => (
                                    <div key={i} className="tip-card">
                                        <div className="tip-number">{i + 1}</div>
                                        <p>{tip}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default UserGuide;
