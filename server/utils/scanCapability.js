import crypto from 'node:crypto';

// Scan capabilities let a guest prove they ran a particular analysis without an
// account. The token is an HMAC over the scan ID and a hash of the caller's
// identity, so it cannot be forged for someone else's scan ID.
const CAPABILITY_VERSION = 'v1';
const developmentSecret = crypto.randomBytes(32).toString('hex');

const getSecret = () => {
    const secret = process.env.SCAN_CAPABILITY_SECRET || process.env.ORDER_ACCESS_SECRET;
    if (secret && secret.length >= 32) return secret;
    if (process.env.NODE_ENV !== 'production') return developmentSecret;
    const error = new Error('Scan feedback signing is not configured');
    error.status = 503;
    throw error;
};

// Identities are stored only as one-way hashes so audit rows never hold raw
// IP addresses or account IDs alongside images.
export const hashIdentity = (identity = '') => crypto
    .createHash('sha256')
    .update(`scan-owner:${String(identity || 'anonymous')}`)
    .digest('hex')
    .slice(0, 40);

const sign = (scanId, ownerHash) => crypto
    .createHmac('sha256', getSecret())
    .update(`${CAPABILITY_VERSION}:${scanId}:${ownerHash}`)
    .digest('base64url');

export const createScanCapability = (scanId, identity) => {
    const ownerHash = hashIdentity(identity);
    return `${CAPABILITY_VERSION}.${ownerHash}.${sign(String(scanId), ownerHash)}`;
};

/** Returns the owner hash bound to the token, or null when it is invalid. */
export const verifyScanCapability = (scanId, token = '') => {
    if (typeof token !== 'string' || token.length > 200 || !scanId) return null;
    const [version, ownerHash, signature] = token.split('.');
    if (version !== CAPABILITY_VERSION || !/^[a-f0-9]{40}$/.test(ownerHash || '') || !signature) return null;
    const expected = Buffer.from(sign(String(scanId), ownerHash));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    return ownerHash;
};
