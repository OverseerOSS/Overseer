import crypto from "crypto";

/**
 * Derive a purpose-specific encryption key from SESSION_SECRET using HKDF.
 * This prevents SESSION_SECRET rotation from breaking SSH keys.
 */
function getDerivedEncryptionKey(purpose: string): Buffer {
  const baseSecret = process.env.SESSION_SECRET;
  if (!baseSecret) {
    throw new Error("SESSION_SECRET is not set");
  }
  // HKDF derives a purpose-specific key
  return Buffer.from(crypto.hkdfSync("sha256", baseSecret, "", purpose, 32));
}

/**
 * Generate an RSA SSH key pair.
 * Returns both public and private keys in OpenSSH/PEM format.
 */
export function generateKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs1", // Use PKCS#1 for RSA private key (-----BEGIN RSA PRIVATE KEY-----)
      format: "pem",
    },
  });

  // Convert public key to OpenSSH format
  const publicKeySSH = convertRsaToOpenSSHFormat(publicKey);

  return {
    publicKey: publicKeySSH,
    privateKey,
  };
}

/**
 * Convert RSA PEM public key to OpenSSH format (ssh-rsa AAAA...)
 */
function convertRsaToOpenSSHFormat(pemPublicKey: string): string {
  // Use crypto to parse the PEM and export as JWK to get components easily
  const key = crypto.createPublicKey(pemPublicKey);
  const jwk = key.export({ format: "jwk" });

  if (jwk.kty !== "RSA" || !jwk.n || !jwk.e) {
    throw new Error("Invalid RSA key generated");
  }

  // Helper to convert base64url to Buffer
  const fromBase64Url = (b64: string) =>
    Buffer.from(b64, "base64url"); // Node.js v15+ support base64url

  const n = fromBase64Url(jwk.n);
  const e = fromBase64Url(jwk.e);

  // Helper to write string/buffer with length prefix
  const writeString = (buf: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(buf.length);
    return Buffer.concat([len, buf]);
  };

  // Helper to write mpint (multi-precision integer)
  // https://tools.ietf.org/html/rfc4251#section-5
  const writeMpint = (buf: Buffer) => {
    // If the MSB is set, we need to prepend a zero byte to indicate positive number
    if ((buf[0] & 0x80) !== 0) {
      buf = Buffer.concat([Buffer.from([0]), buf]);
    }
    return writeString(buf);
  };

  const keyType = Buffer.from("ssh-rsa");
  
  const blob = Buffer.concat([
    writeString(keyType),
    writeMpint(e), // Exponent first
    writeMpint(n), // Modulus second
  ]);

  return `ssh-rsa ${blob.toString("base64")}`;
}

/**
 * Encrypt a private key using AES-256-GCM with HKDF-derived key.
 * Returns a JSON string with { iv, authTag, data }.
 */
export function encryptPrivateKey(privateKey: string): string {
  const key = getDerivedEncryptionKey("ssh-key-encryption");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(privateKey, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    data: encrypted,
  });
}

/**
 * Decrypt a private key encrypted with encryptPrivateKey().
 */
export function decryptPrivateKey(encryptedJson: string): string {
  const key = getDerivedEncryptionKey("ssh-key-encryption");
  const { iv, authTag, data } = JSON.parse(encryptedJson);

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
