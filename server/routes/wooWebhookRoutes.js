import crypto from 'node:crypto';
import express from 'express';
import { refreshCatalogCache } from '../services/wooCommerceService.js';

// WooCommerce calls this when a product changes (Settings → Advanced →
// Webhooks, topics "Product created/updated/deleted/restored", delivery URL
// https://<api host>/api/webhooks/woocommerce, secret = WOOCOMMERCE_WEBHOOK_SECRET).
// The app then reloads its copy of the catalogue, so price and stock changes
// show within seconds instead of up to an hour.
//
// Every delivery is signed: X-WC-Webhook-Signature is the base64 HMAC-SHA256
// of the raw body with the shared secret. Unsigned or wrongly signed requests
// are refused. The route is switched off when no secret is set.
export const WOO_WEBHOOK_PATH = '/api/webhooks/woocommerce';
const PRODUCT_TOPIC = /^product\.(created|updated|deleted|restored)$/;

export const isValidWooSignature = (rawBody, signature, secret) => {
    if (!secret || !signature || !Buffer.isBuffer(rawBody)) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
    let given;
    try {
        given = Buffer.from(String(signature), 'base64');
    } catch {
        return false;
    }
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
};

export const registerWooWebhookRoutes = (app, { refresh = refreshCatalogCache } = {}) => {
    app.post(WOO_WEBHOOK_PATH, express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
        const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
        if (!secret) return res.status(404).json({ error: 'Not found' });

        const signature = req.get('x-wc-webhook-signature');
        // When a webhook is saved, WooCommerce sends an unsigned test ping
        // ("webhook_id=…"). Answer it so the store marks the webhook active.
        if (!signature && /^webhook_id=\d+$/.test(req.body?.toString('utf8') || '')) {
            return res.status(200).json({ ok: true });
        }
        if (!isValidWooSignature(req.body, signature, secret)) {
            console.warn(JSON.stringify({ event: 'woo_webhook_rejected', requestId: req.requestId }));
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const topic = String(req.get('x-wc-webhook-topic') || '');
        if (!PRODUCT_TOPIC.test(topic)) return res.status(202).json({ ok: true, ignored: topic || 'unknown' });

        const reloaded = refresh();
        console.log(JSON.stringify({ event: 'woo_catalog_refresh', topic, reloaded, requestId: req.requestId }));
        return res.status(202).json({ ok: true });
    });
};
