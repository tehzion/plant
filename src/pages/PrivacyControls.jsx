import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useDataOwner } from '../context/AuthContext';
import { useLanguage } from '../i18n/i18n.jsx';
import DataConsentToggle from '../components/DataConsentToggle';
import { getAnalyticsConsent, setAnalyticsConsent } from '../utils/privacyChoices.js';
import { buildPrivacyExport, clearPrivacyDeviceData, privacyRequestLink } from '../utils/privacyTools.js';
import { PRIVACY_EMAIL } from '../../shared/privacy.js';
import './LegalPages.css';
import './PrivacyControls.css';

const PrivacyControls = () => {
    const owner = useDataOwner();
    const { user } = useAuth();
    const { language } = useLanguage();
    const ms = language === 'ms';
    const text = (en, bm) => ms ? bm : en;
    const [analytics, setAnalytics] = useState(() => Boolean(getAnalyticsConsent(owner)));
    const [confirmClear, setConfirmClear] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const active = useRef(true);
    useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
    const work = async action => {
        setBusy(true); setMessage('');
        try { await action(); }
        catch { if (active.current) setMessage(text('Could not complete this action. Your session may have changed or storage may be unavailable. Retry, or contact the privacy team.', 'Tindakan tidak dapat diselesaikan. Sesi mungkin berubah atau storan tidak tersedia. Cuba lagi atau hubungi pasukan privasi.')); }
        finally { if (active.current) setBusy(false); }
    };
    const download = () => work(async () => {
        const exported = await buildPrivacyExport({ owner, userId: user?.id, assertOwner: () => { if (!active.current) throw new Error('Account changed'); } });
        if (!active.current) return;
        const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kanb-records-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage(text('Your download contains personal data. Keep it private on a trusted device.', 'Muat turun mengandungi data peribadi. Simpan dengan selamat pada peranti yang dipercayai.'));
    });
    const clear = () => work(async () => {
        await clearPrivacyDeviceData(owner);
        if (active.current) window.location.assign('/privacy-controls?cleared=1');
    });
    const requests = [
        ['Access to all personal data', 'Akses semua data peribadi'],
        ['Correct my personal data', 'Betulkan data peribadi saya'],
        ['Withdraw consent, including previously shared improvement photos', 'Tarik persetujuan termasuk foto penambahbaikan yang telah dikongsi'],
        ['Account closure / deletion review', 'Penutupan akaun / semakan pemadaman'],
        ['Direct transfer to another data controller', 'Pemindahan terus kepada pengawal data lain'],
        ['Stop direct marketing / restrict processing', 'Hentikan pemasaran langsung / hadkan pemprosesan'],
    ];
    return <div className="page legal-page privacy-controls"><div className="container legal-container">
        <header className="legal-page-header">
            <p><Link to="/">{text('Back to my farm', 'Kembali ke ladang saya')}</Link></p>
            <span className="legal-kicker">KANB · {text('Your choices', 'Pilihan anda')}</span>
            <h1 className="page-title">{text('Privacy controls', 'Kawalan privasi')}</h1>
            <p>{text('Choose what you share, keep a copy, or ask our privacy team for help.', 'Pilih perkara yang dikongsi, simpan salinan atau dapatkan bantuan pasukan privasi.')}</p>
            <Link to="/privacy">{text('Read the privacy notice · Bahasa Malaysia / English', 'Baca notis privasi · Bahasa Malaysia / English')}</Link>
        </header>
        <div className="legal-content-wrapper">
            <section className="legal-section-card"><h2>{text('Optional sharing', 'Perkongsian pilihan')}</h2>
                <DataConsentToggle disabled={busy} />
                <p>{text('Turning this off stops improvement-photo sharing on future scans for this account or guest. It does not remove earlier copies. Use the withdrawal request below for previously shared data, exports and provider copies.', 'Mematikannya menghentikan perkongsian foto penambahbaikan untuk imbasan baharu akaun atau tetamu ini. Salinan terdahulu tidak dipadam. Gunakan permintaan penarikan di bawah untuk data, eksport dan salinan penyedia yang telah dikongsi.')}</p>
                <label className="privacy-choice"><input type="checkbox" checked={analytics} disabled={busy || !owner} onChange={event => {
                    if (setAnalyticsConsent(event.target.checked, owner)) setAnalytics(event.target.checked);
                    else { setAnalytics(false); setMessage(text('Your choice could not be saved. Optional analytics stays off.', 'Pilihan tidak dapat disimpan. Analitik pilihan kekal dimatikan.')); }
                }} /><span>{text('Share product-click analytics to improve recommendations (optional)', 'Kongsi analitik klik produk untuk menambah baik cadangan (pilihan)')}</span></label>
                <p>{text('If enabled, product clicks may include account/guest ID, scan reference, crop, diagnosis and selected product. Shopping and scanning work with this off.', 'Jika diaktifkan, klik produk boleh merangkumi ID akaun/tetamu, rujukan imbasan, tanaman, diagnosis dan produk pilihan. Membeli-belah dan imbasan tetap berfungsi jika dimatikan.')}</p>
            </section>
            <section className="legal-section-card"><h2>{text('Keep a copy of your records', 'Simpan salinan rekod anda')}</h2>
                <p>{text('Download the six main account collections and this actor’s device records, photos, drafts, preferences and pending changes. This is a convenience export, not the full statutory access response. Commerce, authentication, audit, review, feedback, analytics and backup copies need a request below. Large exports may need team assistance.', 'Muat turun enam koleksi utama akaun serta rekod peranti, foto, draf, pilihan dan perubahan menunggu bagi pengguna ini. Ini eksport kemudahan, bukan respons akses berkanun penuh. Salinan perdagangan, pengesahan, audit, semakan, maklum balas, analitik dan sandaran memerlukan permintaan di bawah. Eksport besar mungkin memerlukan bantuan pasukan.')}</p>
                <button type="button" className="btn btn-secondary" disabled={busy || !owner} onClick={download}>{text('Download my app records', 'Muat turun rekod aplikasi saya')}</button>
            </section>
            <section className="legal-section-card"><h2>{text('Records saved before sign-in', 'Rekod sebelum log masuk')}</h2>
                <p>{text('Device guest records are kept separate when you sign in. To request help moving records into your account, contact the privacy team and confirm that they belong to you. Nothing is uploaded automatically at login.', 'Rekod tetamu peranti disimpan berasingan apabila anda log masuk. Untuk bantuan memindahkan rekod ke akaun, hubungi pasukan privasi dan sahkan bahawa rekod itu milik anda. Tiada muat naik automatik semasa log masuk.')}</p>
                <a href={privacyRequestLink('Help importing my own device records', language)}>{text('Ask about importing my records', 'Tanya tentang pemindahan rekod saya')}</a>
            </section>
            <section className="legal-section-card"><h2>{text('Clear this device’s copies', 'Kosongkan salinan pada peranti ini')}</h2>
                <p>{text('Removes this account/guest’s local chats, preferences, records, photos, drafts and unsynced changes. Unsynced work will be lost. Cloud records and your login remain; this does not close your account. Export first if needed.', 'Memadam sembang, pilihan, rekod, foto, draf dan perubahan belum disegerakkan bagi akaun/tetamu ini pada peranti. Kerja belum disegerakkan akan hilang. Rekod awan dan log masuk kekal; akaun tidak ditutup. Eksport dahulu jika perlu.')}</p>
                <label className="privacy-choice"><input type="checkbox" checked={confirmClear} disabled={busy} onChange={event => setConfirmClear(event.target.checked)} /><span>{text('I understand unsynced changes will be lost.', 'Saya faham perubahan belum disegerakkan akan hilang.')}</span></label>
                <button type="button" className="btn btn-secondary" disabled={busy || !owner || !confirmClear} onClick={clear}>{text('Clear my device copies', 'Kosongkan salinan peranti saya')}</button>
            </section>
            <section className="legal-section-card"><h2>{text('Make a written privacy request', 'Buat permintaan privasi bertulis')}</h2>
                <p>{text('These links open an email draft. Review and send it yourself; opening a draft does not submit a request. Do not send passwords, access tokens or identity-card copies. We may ask for proportionate identity verification through a secure channel.', 'Pautan ini membuka draf e-mel. Semak dan hantarkan sendiri; membuka draf tidak menghantar permintaan. Jangan hantar kata laluan, token akses atau salinan MyKad. Pengesahan identiti yang bersesuaian mungkin diminta melalui saluran selamat.')}</p>
                <ul className="privacy-requests">{requests.map(([en, bm]) => <li key={en}><a href={privacyRequestLink(en, language)}>{text(en, bm)}</a></li>)}</ul>
                <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
                <p>{text('Access/correction requests are handled within applicable statutory time limits. Any refusal, permitted extension or legally required retention must be explained. Portability to another controller is subject to technical feasibility and compatible formats.', 'Permintaan akses/pembetulan dikendalikan dalam tempoh berkanun yang berkenaan. Penolakan, lanjutan dibenarkan atau penyimpanan wajib undang-undang mesti dijelaskan. Kebolehportan kepada pengawal lain tertakluk pada kebolehlaksanaan teknikal dan keserasian format.')}</p>
            </section>
        </div>
        <p role="status" aria-live="polite" className="privacy-status">{busy ? text('Working…', 'Sedang diproses…') : message}</p>
    </div></div>;
};
export default PrivacyControls;
