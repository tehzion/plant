import { buildContactOptions } from '../../shared/assistantContact.js';

const COPY = {
    en: {
        out_of_scope: 'I can help with plant care, farming, myGAP records, the KANB app and our services. I cannot help with that request. Please ask about one of those topics.',
        uncertain: 'I’m not sure from the information available. Please contact our team for help. For a crop problem, a clear photo scan and field checks may help; do not spray based on a guess.',
        contact: 'I cannot check private accounts, orders, delivery, payments or partnership details here. Please contact our team so they can help securely. Do not share passwords or payment details in this chat.',
    },
    ms: {
        out_of_scope: 'Saya boleh membantu tentang penjagaan tanaman, pertanian, rekod myGAP, aplikasi KANB dan perkhidmatan kami. Saya tidak dapat membantu permintaan itu. Sila tanya tentang topik tersebut.',
        uncertain: 'Saya tidak pasti berdasarkan maklumat yang tersedia. Sila hubungi pasukan kami. Untuk masalah tanaman, imbasan foto yang jelas dan pemeriksaan ladang boleh membantu; jangan menyembur berdasarkan tekaan.',
        contact: 'Saya tidak boleh menyemak akaun peribadi, pesanan, penghantaran, bayaran atau butiran kerjasama di sini. Sila hubungi pasukan kami untuk bantuan selamat. Jangan kongsi kata laluan atau butiran bayaran dalam sembang.',
    },
    zh: {
        out_of_scope: '我可以帮助您了解植物护理、农业、myGAP记录、KANB应用及我们的服务。这个请求不在我的服务范围内，请询问相关问题。',
        uncertain: '根据现有信息，我不确定。请联系我们的团队获取帮助。如有作物问题，可先提供清晰照片并检查田间症状；不要根据猜测喷药。',
        contact: '我无法在此查看私人账户、订单、配送、付款或合作详情。请联系我们的团队安全处理。请勿在聊天中分享密码或支付信息。',
    },
};
export const policyReply = (reason = 'uncertain', language = 'en') => ({
    reply: (COPY[language] || COPY.en)[reason] || COPY.en.uncertain,
    encyclopedia: [], products: [], suggestScan: false,
    contact: reason === 'out_of_scope' ? null : buildContactOptions(language),
    disposition: reason,
});

// Conservative routing before inference. Topic words are routing hints, never
// authorization: the model must separately classify scope and uncertainty.
const FARM = /\b(plant\w*|crop\w*|farm\w*|agri\w*|mygap|kanb|soil|leaf|leaves|root\w*|pest\w*|disease\w*|fertili[sz]\w*|fung\w*|pesticid\w*|spray\w*|harvest\w*|water\w*|irrigat\w*|rice|paddy|padi|durian|chill?i|tomato\w*|mango\w*|banana\w*|oil palm|pokok|tanaman|daun|akar|ladang|kebun|baja|racun|kulat|serangga|penyakit|tuai|siram|tanah|nutrien|imbas\w*|scan\w*|app|logbook|rekod|records?|nutrition|nurt\w*)\b|植物|种植|农业|农场|病害|虫害|叶|根|施肥|收获|土壤|扫描|应用|榴莲|辣椒|水稻|黄瓜|黄叶|真菌/iu;
const CONTACT = /\b(order\w*|delivery|shipping|payment\w*|refund\w*|partnership\w*|invoice\w*|account\w*|login|log in|sign in|password\w*|pesanan|penghantaran|bayaran|pembayaran|pulangan|akaun|kerjasama|kata laluan)\b|订单|配送|付款|退款|账户|密码|合作/iu;
const OFF_TOPIC = /\b(bitcoin|crypto\w*|stock market|election\w*|president|politic\w*|horoscope|astrolog\w*|celebrity|football|soccer|porn\w*|gambl\w*|casino|homework|essay|love poem|joke|stand.?up|human medicine|medical diagnosis|code|coding|javascript|python|sql|html|react|malware|hack\w*|exploit\w*|bomb|weapon\w*)\b|比特币|政治|色情|赌博|写代码|笑话|选举|股票/iu;
const OVERRIDE = /ignore.{0,40}(instructions?|rules?|previous|above)|reveal.{0,40}(prompt|secret|system)|system\s*(prompt|message)|developer\s*(mode|message)|jailbreak|do anything now|pretend.{0,30}(unrestricted|no rules)|abaikan.{0,35}(arahan|peraturan)|忽略.{0,20}(指令|规则)|系统提示/iu;
const FOLLOW_UP = /^(what (should|can|do)|how (do|can|should)|why|when|which|tell me more|explain|yes\b|no\b|and\b|is (it|that)|can (i|it)|should i|berapa|bagaimana|kenapa|bila|apa|boleh|ya\b|tidak\b|macam mana|怎么|为什么|何时|可以|接下来|需要)/iu;
const GREETING = /^(hi|hello|hey|salam|assalamualaikum|hai|helo|你好|您好)[!.?\s]*$/iu;

export const routeAssistantRequest = (history, scan = null) => {
    const latest = history.at(-1)?.content || '';
    if (OVERRIDE.test(latest) || OFF_TOPIC.test(latest)) return 'out_of_scope';
    if (CONTACT.test(latest)) return 'contact';
    if (FARM.test(latest) || GREETING.test(latest)) return 'in_scope';
    const priorUser = history.slice(0, -1).filter(message => message.role === 'user').slice(-2);
    if (FOLLOW_UP.test(latest) && (scan || priorUser.some(message => FARM.test(message.content) && !OFF_TOPIC.test(message.content) && !OVERRIDE.test(message.content)))) return 'in_scope';
    return 'out_of_scope';
};
