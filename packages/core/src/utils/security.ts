/**
 * Masks a sensitive key for safe display/logging.
 * Shows first 3 and last 4 characters, with dots in between.
 */
export function maskKey(key: string | undefined): string {
    if (!key) return '***';
    if (key.length <= 8) return '****';

    const prefix = key.slice(0, 3);
    const suffix = key.slice(-4);
    return `${prefix}...${suffix}`;
}

const SALT = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * Encodes a string (obfuscation only, not secure encryption).
 */
export function encodeKey(str: string): string {
    if (!str) return '';
    const encoded = str.split('').map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))
    ).join('');
    // Use Buffer for base64 in Node
    return Buffer.from(encoded).toString('base64');
}

/**
 * Decodes a string encoded with encodeKey.
 */
export function decodeKey(encoded: string): string {
    if (!encoded) return '';
    try {
        const decoded = Buffer.from(encoded, 'base64').toString('binary');
        return decoded.split('').map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ SALT.charCodeAt(i % SALT.length))
        ).join('');
    } catch {
        return encoded; // Fallback to raw if not base64/encoded
    }
}

