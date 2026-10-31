import { useLanguage } from '../i18n/i18n.jsx';

// These source phrases are shared by all reviewer panels. Dataset names,
// original assessments and expert-authored notes are preserved verbatim.
const rows = `Admin sign-in required|Log masuk pentadbir diperlukan|需要管理员登录
Sign in with an approved team account to view scan reviews and lead analytics.|Log masuk dengan akaun pasukan yang diluluskan untuk melihat semakan imbasan dan analisis pertanyaan.|请使用获准的团队账户登录以查看扫描审核和咨询分析。
Go to sign in|Pergi ke log masuk|前往登录
KANB team|Pasukan KANB|KANB 团队
Review Dashboard|Papan Pemuka Semakan|审核面板
Track scan quality, consultation leads, product interest, and checkout intent.|Pantau kualiti imbasan, pertanyaan konsultasi, minat produk dan niat pembelian.|跟踪扫描质量、咨询、产品兴趣和结账意向。
Analytics window|Tempoh analisis|分析时段
Last 7 days|7 hari terakhir|过去 7 天
Last 30 days|30 hari terakhir|过去 30 天
Last 90 days|90 hari terakhir|过去 90 天
Refresh|Muat semula|刷新
Recent scans|Imbasan terkini|最近扫描
Need review|Perlu semakan|需要审核
Consultation leads|Pertanyaan konsultasi|咨询线索
Product clicks|Klik produk|产品点击
Checkout intent|Niat pembelian|结账意向
Lead conversion|Penukaran pertanyaan|咨询转化
Scans Needing Review|Imbasan yang Perlu Disemak|待审核扫描
Scan|Imbasan|扫描
Crop|Tanaman|作物
Disease|Penyakit|病害
Confidence|Keyakinan|置信度
Status|Status|状态
Time|Masa|时间
No uncertain scans in this window.|Tiada imbasan tidak pasti dalam tempoh ini.|此时段没有不确定的扫描。
Consultation Leads|Pertanyaan Konsultasi|咨询线索
Open scan|Buka imbasan|打开扫描
No consultation leads yet.|Belum ada pertanyaan konsultasi.|暂无咨询线索。
Top Products|Produk Popular|热门产品
No product clicks yet.|Belum ada klik produk.|暂无产品点击。
Common Issues|Masalah Lazim|常见问题
No issue data yet.|Belum ada data masalah.|暂无问题数据。
Recent Product Activity|Aktiviti Produk Terkini|最近产品活动
Event|Aktiviti|事件
Product|Produk|产品
Match|Padanan|匹配
No product activity yet.|Belum ada aktiviti produk.|暂无产品活动。
Expert review|Semakan pakar|专家审核
Review queue filter|Penapis senarai semakan|审核队列筛选
Needs review|Perlu semakan|待审核
Reviewed|Telah disemak|已审核
All|Semua|全部
No assessments in this list.|Tiada penilaian dalam senarai ini.|此列表没有评估。
farmer feedback|maklum balas petani|农户反馈
AI assessment (original, read-only)|Penilaian AI (asal, baca sahaja)|AI 评估（原始，只读）
Plant photo submitted by farmer|Foto tanaman yang dihantar petani|农户提交的植物照片
Leaf close-up submitted by farmer|Foto dekat daun yang dihantar petani|农户提交的叶片特写
· confidence:|· keyakinan:|· 置信度：
Alternatives:|Kemungkinan lain:|其他可能：
Treatment products allowed by policy:|Produk rawatan yang dibenarkan oleh dasar:|规则允许的处理产品：
Farmer feedback|Maklum balas petani|农户反馈
Previous expert reviews|Semakan pakar terdahulu|以往专家审核
by|oleh|由
on|pada|于
Your verdict|Keputusan anda|您的结论
Correct diagnosis|Diagnosis yang betul|正确诊断
Correct crop (if different)|Tanaman yang betul (jika berbeza)|正确作物（如不同）
Professional notes|Catatan profesional|专业备注
Product recommendations|Cadangan produk|产品建议
Not reviewed|Belum disemak|未审核
Note|Catatan|备注
Add another product by name|Tambah produk lain mengikut nama|按名称添加其他产品
Add|Tambah|添加
AI evaluation & validation|Penilaian dan pengesahan AI|AI 评估与验证
Public datasets, reviewer records and farmer testing are separate evidence sources. Reviewer qualifications must be verified independently.|Set data awam, rekod penyemak dan ujian petani ialah sumber bukti berasingan. Kelayakan penyemak mesti disahkan secara berasingan.|公共数据集、审核记录和农户测试是不同的证据来源。审核员资格须单独核实。
Evaluation data is unavailable. Check access and the database migration.|Data penilaian tidak tersedia. Semak akses dan migrasi pangkalan data.|评估数据不可用。请检查访问权限及数据库迁移。
Completed / attempted|Selesai / dicuba|完成／尝试
Diagnostic agreement|Persetujuan diagnosis|诊断一致率
Healthy false alarm|Amaran palsu pada tanaman sihat|健康误报
Cases with recorded reviews|Kes dengan semakan direkod|有审核记录的案例
Mean response time|Purata masa respons|平均响应时间
Reported processing cost|Kos pemprosesan dilaporkan|已报告处理费用
Coverage:|Liputan:|覆盖率：
. Agreement excludes failures, unsupported cases and uncertain or abstained assessments. This view may combine different workflow versions; inspect versions before comparing results.|. Persetujuan tidak termasuk kegagalan, kes tidak disokong dan penilaian tidak pasti atau tidak dijawab. Paparan ini mungkin menggabungkan versi aliran kerja berbeza; semak versi sebelum membandingkan hasil.|。一致率不含失败、不支持、不确定或弃答案例。此视图可能包含不同流程版本，请先检查版本再比较结果。
attempted, coverage|percubaan, liputan|次尝试，覆盖率
Performance by crop|Prestasi mengikut tanaman|按作物查看表现
No crop results available.|Tiada hasil tanaman tersedia.|暂无作物结果。
Workflow versions:|Versi aliran kerja:|流程版本：
Export summary JSON|Eksport ringkasan JSON|导出 JSON 摘要
Export preliminary report|Eksport laporan awal|导出初步报告
Assessment explorer|Pelayar penilaian|评估浏览器
Import a result produced by the isolated local runner. Images require a separately configured evaluation image store.|Import hasil daripada pelaksana tempatan yang diasingkan. Imej memerlukan stor imej penilaian yang dikonfigurasi berasingan.|导入隔离本地运行器的结果。图像需要单独配置的评估图像存储。
Import result JSON|Import hasil JSON|导入结果 JSON
Dataset|Set data|数据集
All datasets|Semua set data|所有数据集
No evaluation cases on this page.|Tiada kes penilaian pada halaman ini.|此页没有评估案例。
Previous|Sebelumnya|上一页
Offset|Kedudukan|起始位置
Next|Seterusnya|下一页
Selected case|Kes dipilih|所选案例
Dataset image for the selected assessment|Imej set data untuk penilaian dipilih|所选评估的数据集图像
Original dataset label:|Label set data asal:|原始数据集标签：
; reference:|; rujukan:|；参考：
AI:|AI:|AI：
Review history|Sejarah semakan|审核历史
· reviewer|· penyemak|· 审核员
Not Expert Reviewed|Belum Disemak Pakar|未经专家审核
Add expert review|Tambah semakan pakar|添加专家审核
Verdict|Keputusan|结论
Reviewed — Agree|Disemak — Setuju|已审核 — 同意
Reviewed — Disagree|Disemak — Tidak setuju|已审核 — 不同意
Inconclusive|Tidak muktamad|无法定论
Requires Further Evidence|Memerlukan Bukti Lanjut|需要更多证据
Corrected condition|Keadaan yang dibetulkan|更正后的病况
Uncertainty|Ketidakpastian|不确定性
Follow-up appropriateness|Kesesuaian susulan|后续措施适当性
Professional comments|Ulasan profesional|专业意见
Save review|Simpan semakan|保存审核
Farmer usability|Kebolehgunaan petani|农户易用性
Use an anonymous ID and record only consented, real sessions. Do not enter names or contact details.|Gunakan ID tanpa nama dan rekod hanya sesi sebenar dengan persetujuan. Jangan masukkan nama atau maklumat hubungan.|请使用匿名编号，仅记录已获同意的真实测试。请勿输入姓名或联系方式。
Anonymous participant ID|ID peserta tanpa nama|匿名参与者编号
Test date|Tarikh ujian|测试日期
Task|Tugasan|任务
Plant assessment|Penilaian tanaman|植物评估
Agricultural assistant|Pembantu pertanian|农业助手
Find a product|Cari produk|查找产品
Record farm activity|Rekod aktiviti ladang|记录农事活动
Duration in seconds|Tempoh dalam saat|时长（秒）
Task completed|Tugasan selesai|任务已完成
Assistance required|Bantuan diperlukan|需要协助
Reported difficulty|Kesukaran dilaporkan|报告的困难
Participant feedback|Maklum balas peserta|参与者反馈
Observed issues|Masalah diperhatikan|观察到的问题
Participant consent recorded|Persetujuan peserta direkod|已记录参与者同意
Save usability session|Simpan sesi kebolehgunaan|保存易用性测试
Product recommendation evaluation|Penilaian cadangan produk|产品建议评估
Run a controlled scenario through the existing catalogue matcher. A match is not proof of agricultural suitability or product registration. The live catalogue and API quota may be used.|Jalankan senario terkawal melalui pemadan katalog sedia ada. Padanan bukan bukti kesesuaian pertanian atau pendaftaran produk. Katalog langsung dan kuota API mungkin digunakan.|使用现有目录匹配器运行受控场景。匹配不代表农业适用性或产品注册证明。可能使用实时目录及 API 配额。
Condition|Keadaan|病况
Scenario status|Status senario|场景状态
Uncertain|Tidak pasti|不确定
Likely|Berkemungkinan|可能
Confirmed (scenario only)|Disahkan (senario sahaja)|已确认（仅场景）
Scenario confidence, 0–100 (optional)|Keyakinan senario, 0–100 (pilihan)|场景置信度 0–100（可选）
Requires more evidence|Memerlukan lebih bukti|需要更多证据
Product scenarios are unavailable or still loading.|Senario produk tidak tersedia atau masih dimuatkan.|产品场景不可用或仍在加载。
No product scenarios recorded.|Tiada senario produk direkod.|未记录产品场景。
Catalogue response|Respons katalog|目录响应
Reasoning:|Sebab:|理由：
· ID|· ID|· 编号
No products returned; inspect the original response and consultation guidance.|Tiada produk dikembalikan; semak respons asal dan panduan konsultasi.|未返回产品，请查看原始响应及咨询指导。
Product ID|ID produk|产品编号
Suitability verdict|Keputusan kesesuaian|适用性结论
Requires verification|Memerlukan pengesahan|需要核实
Suitable|Sesuai|适用
Unsuitable|Tidak sesuai|不适用
Save product review|Simpan semakan produk|保存产品审核
Agricultural Dataset|Set Data Pertanian|农业数据集
Reference labels and AI assessments are stored separately.|Label rujukan dan penilaian AI disimpan berasingan.|参考标签与 AI 评估分开保存。
Imported images|Imej diimport|已导入图像
Completed assessments|Penilaian selesai|已完成评估
Agreement|Persetujuan|一致率
Sources:|Sumber:|来源：
Crops:|Tanaman:|作物：
Dataset labels:|Label set data:|数据集标签：
Original POC assessments are marked baseline and may predate the health-status fix. Agreement uses the latest result per image and excludes review and unassessed cases.|Penilaian POC asal ditanda garis dasar dan mungkin mendahului pembetulan status kesihatan. Persetujuan menggunakan hasil terkini setiap imej dan mengecualikan kes perlu semakan serta belum dinilai.|原始概念验证评估标记为基线，可能早于健康状态修复。一致率使用每张图像的最新结果，排除待审核及未评估案例。
Source|Sumber|来源
Page|Halaman|页
Selected image|Imej dipilih|所选图像
Selected agricultural dataset example|Contoh set data pertanian dipilih|所选农业数据集示例
Reference:|Rujukan:|参考：
Confirm AI diagnosis|Sahkan diagnosis AI|确认 AI 诊断
Correct the diagnosis|Betulkan diagnosis|更正诊断
Uncertain / needs more information|Tidak pasti / perlu maklumat lanjut|不确定／需要更多信息
Needs more information|Memerlukan maklumat lanjut|需要更多信息
Unnamed result|Hasil tanpa nama|未命名结果
Unknown crop|Tanaman tidak diketahui|未知作物
no level|tiada tahap|无等级
yes|ya|是
no|tidak|否
Farmer says correct|Petani menyatakan betul|农户认为正确
Farmer says incorrect|Petani menyatakan tidak betul|农户认为不正确
Farmer comment|Ulasan petani|农户评论
 (unverified)| (belum disahkan)|（未经核实）
Saving…|Menyimpan…|正在保存…
Review saved. The original AI assessment is unchanged.|Semakan disimpan. Penilaian AI asal tidak berubah.|审核已保存，原始 AI 评估保持不变。
Not yet available|Belum tersedia|暂不可用
Crop compatibility|Keserasian tanaman|作物兼容性
Product purpose|Tujuan produk|产品用途
Condition relevance|Kaitan keadaan|病况相关性
Available label information|Maklumat label tersedia|现有标签信息
Restrictions and warnings|Sekatan dan amaran|限制与警告
Missing information|Maklumat tiada|缺失信息
Unsupported claims|Dakwaan tanpa sokongan|缺乏依据的声明
Uncertainty communication|Penyampaian ketidakpastian|不确定性说明
Running…|Sedang dijalankan…|正在运行…
Run and save scenario|Jalankan dan simpan senario|运行并保存场景
Verdict for|Keputusan untuk|结论适用于
confirmed|disahkan|已确认
corrected|dibetulkan|已更正
uncertain|tidak pasti|不确定
needs_review|perlu semakan|待审核
reviewed|telah disemak|已审核
high|tinggi|高
medium|sederhana|中
low|rendah|低
Reference labels and AI assessments are stored separately. Labels are never sent to the AI.|Label rujukan dan penilaian AI disimpan berasingan. Label tidak dihantar kepada AI.|参考标签与 AI 评估分开保存，标签不会发送给 AI。
PlantVillage / PlantDoc|PlantVillage / PlantDoc|PlantVillage / PlantDoc
Healthy / diseased|Sihat / berpenyakit|健康／患病
Review needed|Perlu semakan|需要审核
Crops (|Tanaman (|作物（
Disease categories (|Kategori penyakit (|病害类别（
Agreement uses the latest completed result per image and excludes review-needed cases. Baseline POC results predate the health-status fix. Dataset labels are not expert diagnoses.|Persetujuan menggunakan hasil lengkap terkini setiap imej dan mengecualikan kes perlu semakan. Hasil POC garis dasar mendahului pembetulan status kesihatan. Label set data bukan diagnosis pakar.|一致率使用每张图像的最新已完成结果，排除待审核案例。基线结果早于健康状态修复。数据集标签不是专家诊断。
Assessed only|Yang telah dinilai sahaja|仅已评估
Reference (crop / label)|Rujukan (tanaman / label)|参考（作物／标签）
AI prediction|Ramalan AI|AI 预测
Result|Hasil|结果
View|Lihat|查看
Match|Sepadan|匹配
Different|Berbeza|不同
Unassessed|Belum dinilai|未评估
Not assessed|Belum dinilai|未评估`;

export const REVIEWER_PHRASES = Object.fromEntries(rows.split('\n').map(row => {
    const [en, ms, zh] = row.split('|');
    return [en, { en, ms, zh }];
}));
export const getReviewerText = (language, phrase) => REVIEWER_PHRASES[phrase]?.[language] || phrase;
export const useReviewerText = () => {
    const { language } = useLanguage();
    const translate = phrase => getReviewerText(language, phrase);
    translate.locale = language === 'zh' ? 'zh-MY' : language === 'ms' ? 'ms-MY' : 'en-MY';
    return translate;
};
