import { createChatCompletion, OPENAI_PRIMARY_MODEL, APP_CONSULTATION_WHATSAPP } from './aiService.js';
import { getAllProducts, isWooCommerceEnabled } from './wooCommerceService.js';
import { diseaseDatabase } from '../../src/data/diseaseDatabase.js';
import { redactDosageInstructions } from '../../shared/diseaseAssessment.js';

export const SUPPORT_EMAIL = 'support@smartplant.my';
const MAX_HISTORY = 10;
const MAX_PRODUCTS = 3;
const LANGUAGE_INSTRUCTION = {
    en: 'Reply in English.',
    ms: 'Reply in Bahasa Melayu.',
    zh: 'Reply in Simplified Chinese (简体中文).',
};

const pick = (field, language) => (field && typeof field === 'object' ? field[language] || field.en || '' : String(field || ''));

// A compact index the model can choose from; it never invents encyclopedia IDs.
export const buildEncyclopediaIndex = (language = 'en') => diseaseDatabase.map((entry) => ({
    id: entry.id,
    name: pick(entry.name, language),
    category: entry.category,
    symptoms: pick(entry.symptoms, 'en').slice(0, 120),
}));

export const normalizeChatHistory = (messages = []) => (Array.isArray(messages) ? messages : [])
    .filter((message) => ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string' && message.content.trim())
    .slice(-MAX_HISTORY)
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 1500) }));

const tokenize = (value) => String(value || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3);

// Products are matched locally against the live catalogue, so the model can
// only point at items that exist and are in stock.
export const matchStoreProducts = (keywords = [], products = [], limit = MAX_PRODUCTS) => {
    const terms = [...new Set((Array.isArray(keywords) ? keywords : []).flatMap(tokenize))].slice(0, 8);
    if (!terms.length) return [];
    return products
        .filter((product) => product?.permalink && product.inStock === true
            && !/\bparaquat\b/i.test([product.name, ...(product.categories || []), ...(product.tags || [])].join(' ')))
        .map((product) => {
            const name = tokenize(product.name);
            const meta = tokenize([...(product.categories || []), ...(product.tags || [])].join(' '));
            const score = terms.reduce((total, term) => total
                + (name.some((word) => word.includes(term)) ? 3 : 0)
                + (meta.some((word) => word.includes(term)) ? 2 : 0), 0);
            return { product, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ product }) => ({
            id: product.id,
            name: product.name,
            price: product.price || null,
            image: product.image || null,
            url: product.permalink,
        }));
};

const buildSystemPrompt = (language, index) => `You are the KANB AI Agropreneur assistant for Malaysian farmers. You help with crop problems, farm practice, myGAP records and finding products in the KANB online store.
${LANGUAGE_INSTRUCTION[language] || LANGUAGE_INSTRUCTION.en}
Rules:
- Keep replies short and practical: at most 120 words, plain language, no markdown tables.
- You cannot see the farmer's plants. For a specific diagnosis, suggest a photo scan in the app and say your answer is general guidance.
- Never state pesticide, fungicide or fertiliser dosages, mixing rates or spray intervals. Say to follow the product label.
- Never recommend banned products such as paraquat.
- Suggest contacting the team when the farmer asks about orders, delivery, payment, accounts or partnerships, when the problem is severe or spreading fast, or when you are unsure.
- If the question is not about farming or the app, politely steer back.

Encyclopedia entries you may link (use only these ids):
${index.map((entry) => `${entry.id} | ${entry.name} | ${entry.category}`).join('\n')}

Return JSON only:
{"reply": string,
 "encyclopediaIds": [up to 3 ids from the list above that directly match the topic, or []],
 "productKeywords": [up to 4 short English or Malay product words to search the store, e.g. "fungicide", "baja NPK", or [] if no product is relevant],
 "suggestContact": boolean,
 "suggestScan": boolean}`;

export const parseAssistantReply = (content, language = 'en') => {
    let parsed;
    try {
        parsed = JSON.parse(content || '{}');
    } catch {
        parsed = { reply: String(content || '') };
    }
    const knownIds = new Set(diseaseDatabase.map((entry) => entry.id));
    const [reply] = redactDosageInstructions([String(parsed.reply || '').trim()], language);
    return {
        reply,
        encyclopediaIds: (Array.isArray(parsed.encyclopediaIds) ? parsed.encyclopediaIds : [])
            .filter((id) => knownIds.has(id)).slice(0, 3),
        productKeywords: (Array.isArray(parsed.productKeywords) ? parsed.productKeywords : [])
            .filter((word) => typeof word === 'string').slice(0, 4),
        suggestContact: parsed.suggestContact === true,
        suggestScan: parsed.suggestScan === true,
    };
};

export const buildContactOptions = (language = 'en') => {
    const message = {
        en: 'Hi KANB team, I need help with my farm.',
        ms: 'Hai pasukan KANB, saya perlukan bantuan untuk ladang saya.',
        zh: '您好 KANB 团队，我的农场需要帮助。',
    }[language] || 'Hi KANB team, I need help with my farm.';
    return {
        whatsapp: `https://wa.me/${APP_CONSULTATION_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`,
        email: `mailto:${SUPPORT_EMAIL}`,
    };
};

export async function chatWithAssistant({ messages, language = 'en', signal } = {}) {
    const targetLanguage = ['ms', 'zh'].includes(language) ? language : 'en';
    const history = normalizeChatHistory(messages);
    if (!history.length || history[history.length - 1].role !== 'user') {
        throw Object.assign(new Error('A user message is required'), { status: 400 });
    }

    const index = buildEncyclopediaIndex(targetLanguage);
    const response = await createChatCompletion({
        model: OPENAI_PRIMARY_MODEL,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: buildSystemPrompt(targetLanguage, index) }, ...history],
        maxTokens: 700,
        temperature: 0.4,
        signal,
    });
    const answer = parseAssistantReply(response.choices?.[0]?.message?.content, targetLanguage);

    const products = answer.productKeywords.length && isWooCommerceEnabled()
        ? matchStoreProducts(answer.productKeywords, await getAllProducts({ signal }))
        : [];
    const byId = new Map(index.map((entry) => [entry.id, entry]));

    return {
        reply: answer.reply,
        encyclopedia: answer.encyclopediaIds.map((id) => ({ id, name: byId.get(id).name })),
        products,
        suggestScan: answer.suggestScan,
        contact: answer.suggestContact ? buildContactOptions(targetLanguage) : null,
    };
}
