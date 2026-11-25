import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidWooSignature, registerWooWebhookRoutes, WOO_WEBHOOK_PATH } from './wooWebhookRoutes.js';

const SECRET = 'test-webhook-secret';
const sign = (body, secret = SECRET) => crypto.createHmac('sha256', secret).update(body).digest('base64');

let server;
let baseUrl;
const refresh = vi.fn(() => 3);

const post = (body, headers = {}) => fetch(`${baseUrl}${WOO_WEBHOOK_PATH}`, { method: 'POST', body, headers });

describe('WooCommerce webhook', () => {
    beforeEach(async () => {
        vi.stubEnv('WOOCOMMERCE_WEBHOOK_SECRET', SECRET);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        refresh.mockClear();
        const app = express();
        registerWooWebhookRoutes(app, { refresh });
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });
    afterEach(async () => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        await new Promise((resolve) => server.close(resolve));
    });

    it('reloads the catalogue for a correctly signed product update', async () => {
        const body = JSON.stringify({ id: 12, name: 'Urea', stock_status: 'outofstock' });
        const response = await post(body, {
            'content-type': 'application/json',
            'x-wc-webhook-topic': 'product.updated',
            'x-wc-webhook-signature': sign(body),
        });
        expect(response.status).toBe(202);
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('refuses a wrong or missing signature', async () => {
        const body = JSON.stringify({ id: 12 });
        const wrong = await post(body, { 'x-wc-webhook-topic': 'product.updated', 'x-wc-webhook-signature': sign(body, 'other') });
        const missing = await post(body, { 'x-wc-webhook-topic': 'product.updated' });
        expect(wrong.status).toBe(401);
        expect(missing.status).toBe(401);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('answers the store test ping without reloading', async () => {
        const response = await post('webhook_id=42', { 'content-type': 'application/x-www-form-urlencoded' });
        expect(response.status).toBe(200);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('ignores signed events that are not product changes', async () => {
        const body = JSON.stringify({ id: 99 });
        const response = await post(body, { 'x-wc-webhook-topic': 'order.created', 'x-wc-webhook-signature': sign(body) });
        expect(response.status).toBe(202);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('is switched off when no secret is set', async () => {
        vi.stubEnv('WOOCOMMERCE_WEBHOOK_SECRET', '');
        const body = '{}';
        const response = await post(body, { 'x-wc-webhook-topic': 'product.updated', 'x-wc-webhook-signature': sign(body) });
        expect(response.status).toBe(404);
        expect(refresh).not.toHaveBeenCalled();
    });

    it('checks signatures in constant time and rejects bad input', () => {
        const body = Buffer.from('{"a":1}');
        expect(isValidWooSignature(body, sign(body), SECRET)).toBe(true);
        expect(isValidWooSignature(body, 'short', SECRET)).toBe(false);
        expect(isValidWooSignature('not a buffer', sign('x'), SECRET)).toBe(false);
        expect(isValidWooSignature(body, sign(body), '')).toBe(false);
    });
});
