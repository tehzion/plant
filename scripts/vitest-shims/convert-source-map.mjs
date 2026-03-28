const INLINE_MAP_PATTERN = /\/\/[#@]\s*sourceMappingURL=data:application\/json[^,]*,(.+)$/m;
const FILE_MAP_PATTERN = /\/\/[#@]\s*sourceMappingURL=(?!data:)(.+)$/m;

const parseJson = (source) => {
    if (!source) return null;

    try {
        return JSON.parse(source);
    } catch {
        return null;
    }
};

const decodeInlineMap = (encoded) => {
    if (!encoded) return null;

    try {
        if (encoded.startsWith('ey') || encoded.includes('=')) {
            return Buffer.from(encoded, 'base64').toString('utf-8');
        }
        return decodeURIComponent(encoded);
    } catch {
        return null;
    }
};

const createMapWrapper = (map) => {
    if (!map) return null;
    return {
        toObject() {
            return map;
        },
    };
};

export const fromSource = (code = '') => {
    const match = code.match(INLINE_MAP_PATTERN);
    if (!match) return null;
    const decoded = decodeInlineMap(match[1].trim());
    return createMapWrapper(parseJson(decoded));
};

export const fromMapFileSource = (code = '', readMap) => {
    const match = code.match(FILE_MAP_PATTERN);
    if (!match) return null;

    const filename = match[1].trim().replace(/^['"]|['"]$/g, '');
    try {
        const source = readMap?.(filename);
        return createMapWrapper(parseJson(source));
    } catch {
        return null;
    }
};

const convertSourceMap = {
    fromSource,
    fromMapFileSource,
};

export default convertSourceMap;
