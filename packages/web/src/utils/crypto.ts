/**
 * A simple utility for encrypting and decrypting text. 
 * Note: This uses a fixed key for local-first storage obfuscation.
 * In a real-world multi-user environment, the key would be derived from a user password.
 */

const SECRET_KEY = "git-compass-v1-secret";

/**
 * Encrypts a string by XORing it with a key and converting to Base64.
 * This is effective for preventing casual inspection of local storage.
 */
export function encrypt(text: string): string {
    if (!text) return "";
    const charCodes = Array.from(text).map((char, i) => {
        return char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    });
    return btoa(JSON.stringify(charCodes));
}

/**
 * Decrypts a string that was encrypted with the above function.
 */
export function decrypt(encoded: string): string {
    if (!encoded) return "";
    try {
        const charCodes = JSON.parse(atob(encoded)) as number[];
        return charCodes.map((code, i) => {
            return String.fromCharCode(code ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
        }).join("");
    } catch (e) {
        console.error("Decryption failed", e);
        return "";
    }
}
