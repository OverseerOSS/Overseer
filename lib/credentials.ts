import crypto from "crypto";

/**
 * Generic credential encryption utilities for Overseer plugins.
 * 
 * Plugin developers can use these functions to securely store API keys,
 * passwords, tokens, and other sensitive data in the database.
 * 
 * All encryption uses AES-256-GCM with keys derived from SESSION_SECRET via HKDF.
 */

/**
 * Derive a purpose-specific encryption key from SESSION_SECRET using HKDF.
 * Each plugin can use its own purpose string to get a unique encryption key.
 */
function getDerivedEncryptionKey(purpose: string): Buffer {
  const baseSecret = process.env.SESSION_SECRET;
  if (!baseSecret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  // HKDF derives a purpose-specific key (32 bytes for AES-256)
  const derivedKey = crypto.hkdfSync("sha256", baseSecret, "", purpose, 32);
  return Buffer.from(derivedKey);
}

/**
 * Encrypt sensitive data (API keys, passwords, tokens, etc.)
 * 
 * @param data - The sensitive string to encrypt (e.g., API key, password)
 * @param purpose - A unique identifier for your plugin (e.g., "my-plugin-api-key")
 * @returns Encrypted JSON string that can be safely stored in the database
 * 
 * @example
 * ```typescript
 * const encrypted = encryptCredential(config.apiKey, "github-plugin-token");
 * // Store encrypted in database
 * ```
 */
export function encryptCredential(data: string, purpose: string): string {
  const key = getDerivedEncryptionKey(purpose);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(data, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    data: encrypted,
    purpose, // Store purpose for validation
  });
}

/**
 * Decrypt sensitive data previously encrypted with encryptCredential()
 * 
 * @param encryptedJson - The encrypted JSON string from the database
 * @returns The original plaintext credential
 * 
 * @example
 * ```typescript
 * const apiKey = decryptCredential(config.encryptedApiKey);
 * // Use apiKey in API calls
 * ```
 */
export function decryptCredential(encryptedJson: string): string {
  if (!encryptedJson) {
    throw new Error("Cannot decrypt: credential data is empty or undefined");
  }
  
  let parsed: any;
  try {
    parsed = JSON.parse(encryptedJson);
  } catch (error) {
    throw new Error(`Cannot decrypt: invalid credential format (${error instanceof Error ? error.message : 'JSON parse failed'})`);
  }
  
  const { iv, authTag, data, purpose } = parsed;
  
  if (!purpose) {
    throw new Error("Invalid credential format: missing purpose");
  }
  
  if (!iv || !authTag || !data) {
    throw new Error("Invalid credential format: missing encryption data");
  }

  const key = getDerivedEncryptionKey(purpose);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Convenience function to encrypt multiple credentials at once.
 * Useful in prepareConfig hooks to encrypt all sensitive fields.
 * 
 * @param credentials - Object with credential keys and values
 * @param pluginId - Your plugin's unique ID to namespace the encryption
 * @returns Object with encrypted values (keys prefixed with "encrypted_")
 * 
 * @example
 * ```typescript
 * const encrypted = encryptCredentials({
 *   apiKey: config.apiKey,
 *   secret: config.secret
 * }, "my-plugin");
 * // Returns: { encrypted_apiKey: "...", encrypted_secret: "..." }
 * ```
 */
export function encryptCredentials(
  credentials: Record<string, string>,
  pluginId: string
): Record<string, string> {
  const encrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(credentials)) {
    if (value) {
      encrypted[`encrypted_${key}`] = encryptCredential(
        value,
        `${pluginId}-${key}`
      );
    }
  }
  
  return encrypted;
}

/**
 * Convenience function to decrypt multiple credentials at once.
 * 
 * @param encryptedCredentials - Object with encrypted credential values
 * @returns Object with decrypted values (without "encrypted_" prefix)
 * 
 * @example
 * ```typescript
 * const decrypted = decryptCredentials({
 *   encrypted_apiKey: config.encrypted_apiKey
 * });
 * // Returns: { apiKey: "actual-api-key-value" }
 * ```
 */
export function decryptCredentials(
  encryptedCredentials: Record<string, string>
): Record<string, string> {
  const decrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(encryptedCredentials)) {
    if (key.startsWith("encrypted_") && value) {
      const originalKey = key.replace("encrypted_", "");
      decrypted[originalKey] = decryptCredential(value);
    }
  }
  
  return decrypted;
}
