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
                                        <span><strong>{language === 'ms' ? 'Contoh' : 'Example'}:</strong> {lang[level].example}</span>
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

            <style>{`
                .guide-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 32px;
                    padding-top: 24px;
                }
                .guide-header h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    color: #1F2937;
                    line-height: 1.2;
                }
                .guide-intro {
                    color: #6B7280;
                    font-size: 0.95rem;
                    margin: 0;
                    line-height: 1.5;
                }
                .back-btn {
                    background: white;
                    border: none;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #374151;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .back-btn:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                    transform: translateY(-1px);
                }
                
                .guide-section {
                    margin-bottom: 48px;
                }
                .section-header {
                    margin-bottom: 20px;
                }
                .section-header h2 {
                    font-size: 1.25rem;
                    color: #1F2937;
                    margin: 0 0 4px 0;
                    font-weight: 700;
                }
                .section-subtitle {
                    color: #6B7280;
                    font-size: 0.9rem;
                    margin: 0;
                }
                
                /* Educational Cards */
                .educational-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 16px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border: 2px solid transparent;
                    transition: all 0.2s;
                }
                .educational-card:hover {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    transform: translateY(-2px);
                }
                .educational-card.healthy {
                    border-color: #DEF7EC;
                    background: linear-gradient(135deg, #F3FAF7 0%, #ffffff 100%);
                }
                .educational-card.unhealthy {
                    border-color: #FDE8E8;
                    background: linear-gradient(135deg, #FDF2F2 0%, #ffffff 100%);
                }
                
                .card-header {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .status-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .healthy .status-icon {
                    background: #DEF7EC;
                    color: #057A55;
                }
                .unhealthy .status-icon {
                    background: #FDE8E8;
                    color: #E02424;
                }
                .card-header h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1F2937;
                }
                .card-meaning {
                    margin: 0;
                    color: #6B7280;
                    font-size: 0.9rem;
                }
                
                .card-body {
                    padding-left: 64px;
                }
                .when-label {
                    font-weight: 600;
                    color: #4B5563;
                    margin: 0 0 8px 0;
                    font-size: 0.85rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .indicator-list {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 16px 0;
                }
                .indicator-list li {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 0;
                    color: #4B5563;
                    font-size: 0.9rem;
                }
                .indicator-list li svg {
                    flex-shrink: 0;
                    opacity: 0.6;
                }
                
                .action-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                }
                .action-box.success {
                    background: #DEF7EC;
                    color: #057A55;
                }
                .action-box.warning {
                    background: #FEF3C7;
                    color: #92400E;
                }
                
                /* Severity Timeline */
                .severity-timeline {
                    display: grid;
                    gap: 16px;
                }
                .severity-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    border-left: 4px solid;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    transition: all 0.2s;
                }
                .severity-card:hover {
                    box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                    transform: translateX(4px);
                }
                .severity-card.mild {
                    border-color: #3B82F6;
                }
                .severity-card.moderate {
                    border-color: #F59E0B;
                }
                .severity-card.high {
                    border-color: #EF4444;
                }
                
                .severity-badge {
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 12px;
                }
                .mild .severity-badge {
                    background: #DBEAFE;
                    color: #1E429F;
                }
                .moderate .severity-badge {
                    background: #FEF3C7;
                    color: #92400E;
                }
                .high .severity-badge {
                    background: #FEE2E2;
                    color: #991B1B;
                }
                
                .severity-card h4 {
                    margin: 0 0 8px 0;
                    font-size: 1rem;
                    font-weight: 700;
                    color: #1F2937;
                }
                .severity-desc {
                    color: #6B7280;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    margin: 0 0 12px 0;
                }
                .example-box {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: #F9FAFB;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    color: #4B5563;
                    margin-bottom: 12px;
                    align-items: flex-start;
                }
                .example-box svg {
                    flex-shrink: 0;
                    margin-top: 2px;
                    opacity: 0.6;
                }
                .severity-card .action-box {
                    background: #F3F4F6;
                    color: #1F2937;
                }
                
                /* Treatment Grid */
                .treatment-grid {
                    display: grid;
                    gap: 16px;
                }
                .treatment-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    border: 2px solid;
                }
                .treatment-card.success {
                    border-color: #DEF7EC;
                }
                .treatment-card.urgent {
                    border-color: #FEF3C7;
                }
                .treatment-card > svg {
                    margin-bottom: 12px;
                }
                .treatment-card.success > svg {
                    color: #057A55;
                }
                .treatment-card.urgent > svg {
                    color: #D97706;
                }
                .treatment-card h4 {
                    margin: 0 0 8px 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #1F2937;
                }
                .treatment-card > p {
                    color: #6B7280;
                    font-size: 0.9rem;
                    margin: 0 0 12px 0;
                    line-height: 1.5;
                }
                .steps-list {
                    margin: 12px 0 0 20px;
                    padding: 0;
                    color: #4B5563;
                    font-size: 0.9rem;
                }
                .steps-list li {
                    margin-bottom: 8px;
                    line-height: 1.5;
                }
                .tip-box {
                    display: flex;
                    gap: 8px;
                    padding: 10px 12px;
                    background: #F0FDF4;
                    border-radius: 8px;
                    font-size: 0.85rem;
                    color: #166534;
                    align-items: center;
                }
                
                /* Pro Tips */
                .tips-section {
                    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                    border-radius: 20px;
                    padding: 24px;
                }
                .tips-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                    color: #78350F;
                }
                .tips-header svg {
                    flex-shrink: 0;
                }
                .tips-header h3 {
                    margin: 0;
                    font-size: 1.15rem;
                    font-weight: 700;
                }
                .tips-grid {
                    display: grid;
                    gap: 12px;
                }
                .tip-card {
                    background: white;
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    gap: 12px;
                    align-items: flex-start;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
                .tip-number {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: #FBBF24;
                    color: #78350F;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.9rem;
                    flex-shrink: 0;
                }
                .tip-card p {
                    margin: 0;
                    color: #4B5563;
                    font-size: 0.9rem;
                    line-height: 1.5;
                }
                
                @media (max-width: 768px) {
                    .guide-header h1 {
                        font-size: 1.4rem;
                    }
                    .card-body {
                        padding-left: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default UserGuide;
