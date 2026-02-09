# Credential Management in Overseer

This guide covers how Overseer handles sensitive data like API keys, passwords, and tokens securely.

## Overview

Overseer uses **AES-256-GCM encryption** to protect all credentials stored in the database. Plugin developers have access to simple encryption utilities that handle all the complexity.

## Architecture

```
User Input (Plaintext)
        ↓
prepareConfig Hook
        ↓
encryptCredential() → AES-256-GCM Encryption
        ↓
Encrypted JSON → Database Storage
        ↓
fetchStatus Hook
        ↓
decryptCredential() → Plaintext (in memory only)
        ↓
API Calls / SSH Connections
```

## Encryption Details

### Algorithm

- **Cipher:** AES-256-GCM (Authenticated Encryption)
- **Key Derivation:** HKDF-SHA256 from `SESSION_SECRET`
- **IV:** 16 random bytes per encryption
- **Auth Tag:** GCM authentication tag for integrity verification

### Key Derivation

Each plugin can use unique encryption keys by specifying a "purpose" string:

```typescript
const key = HKDF(SESSION_SECRET, purpose: "my-plugin-api-key")
```

This means:
- Different plugins can't decrypt each other's data
- Different credential types within a plugin have separate keys
- Rotating SESSION_SECRET doesn't break existing credentials (purpose is stable)

## Basic Usage

### Single Credential

```typescript
import { encryptCredential, decryptCredential } from "@/lib/credentials";

// Encrypt before saving
const encrypted = encryptCredential(apiKey, "plugin-name-apiKey");
config.encrypted_apiKey = encrypted;
delete config.apiKey; // Remove plaintext

// Decrypt when needed
const apiKey = decryptCredential(config.encrypted_apiKey);
```

### Multiple Credentials

```typescript
import { encryptCredentials, decryptCredentials } from "@/lib/credentials";

// Encrypt multiple values
const encrypted = encryptCredentials(
  {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    token: config.token
  },
  "plugin-name"
);

Object.assign(config, encrypted);
// encrypted = { encrypted_apiKey: "...", encrypted_apiSecret: "...", encrypted_token: "..." }

// Decrypt multiple values
const credentials = decryptCredentials({
  encrypted_apiKey: config.encrypted_apiKey,
  encrypted_apiSecret: config.encrypted_apiSecret
});
// credentials = { apiKey: "...", apiSecret: "...", token: "..." }
```

## API Reference

### `encryptCredential(data, purpose)`

Encrypts a single credential.

**Parameters:**
- `data: string` - The plaintext credential
- `purpose: string` - Unique identifier (e.g., "github-plugin-token")

**Returns:** `string` - Encrypted JSON

**Example:**
```typescript
const encrypted = encryptCredential("sk_live_abc123", "stripe-plugin-key");
```

---

### `decryptCredential(encryptedJson)`

Decrypts a credential.

**Parameters:**
- `encryptedJson: string` - Encrypted data from database

**Returns:** `string` - Original plaintext

**Example:**
```typescript
const apiKey = decryptCredential(config.encrypted_apiKey);
```

---

### `encryptCredentials(credentials, pluginId)`

Encrypts multiple credentials at once.

**Parameters:**
- `credentials: Record<string, string>` - Key-value pairs to encrypt
- `pluginId: string` - Plugin identifier for namespacing

**Returns:** `Record<string, string>` - Object with "encrypted_" prefixed keys

**Example:**
```typescript
const encrypted = encryptCredentials(
  { apiKey: "key", secret: "secret" },
  "my-plugin"
);
// { encrypted_apiKey: "...", encrypted_secret: "..." }
```

---

### `decryptCredentials(encryptedCredentials)`

Decrypts multiple credentials.

**Parameters:**
- `encryptedCredentials: Record<string, string>` - Object with encrypted values

**Returns:** `Record<string, string>` - Decrypted values without "encrypted_" prefix

**Example:**
```typescript
const creds = decryptCredentials({
  encrypted_apiKey: config.encrypted_apiKey
});
// { apiKey: "actual-key-value" }
```

## Security Best Practices

### ✅ DO

- **Always encrypt sensitive data** before storing in the database
- **Use unique purpose strings** for each credential type
- **Delete plaintext immediately** after encryption
- **Decrypt only when needed** (e.g., right before making an API call)
- **Use the `password` field type** in configSchema for sensitive inputs
- **Mark fields with `encrypt: true`** in your config schema for documentation

### ❌ DON'T

- **Never log decrypted credentials** (even in development)
- **Don't store decrypted values** in persistent state
- **Don't reuse purpose strings** across different plugins
- **Don't skip encryption** for "less sensitive" data like usernames
- **Don't commit `SESSION_SECRET`** to version control

## Example: Full Plugin with Credentials

```typescript
import { MonitoringExtension } from "../types";
import { encryptCredential, decryptCredential } from "@/lib/credentials";

export const myPlugin: MonitoringExtension = {
  id: "my-api-plugin",
  name: "My API Monitor",
  description: "Monitor my API service",
  
  configSchema: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      scope: "global",
      encrypt: true  // Documents that this should be encrypted
    }
  ],

  async prepareConfig(config) {
    // Encrypt before saving
    if (config.apiKey) {
      config.encrypted_apiKey = encryptCredential(
        config.apiKey,
        "my-api-plugin-apiKey"
      );
      delete config.apiKey;
    }
    
    return { config };
  },

  async fetchStatus(config) {
    // Decrypt when needed
    const apiKey = decryptCredential(config.encrypted_apiKey);
    
    // Use in API call
    const response = await fetch("https://api.example.com/status", {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    
    // Process response...
    return [/* ... */];
  },

  async testConnection(config) {
    const apiKey = decryptCredential(config.encrypted_apiKey);
    
    try {
      const response = await fetch("https://api.example.com/test", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      
      return {
        success: response.ok,
        message: response.ok ? "Connection successful!" : undefined,
        error: response.ok ? undefined : "Authentication failed"
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
};
```

## Environment Setup

Make sure you have `SESSION_SECRET` set in your environment:

```bash
# .env.local
SESSION_SECRET=your-very-long-random-secret-here-at-least-32-chars
```

Generate a secure secret:

```bash
# Generate a random 64-character secret
openssl rand -hex 32
```

## Troubleshooting

### "SESSION_SECRET is not set" Error

**Cause:** Missing environment variable

**Solution:** Add `SESSION_SECRET` to your `.env.local` file

---

### Decryption Fails After Key Rotation

**Cause:** SESSION_SECRET was changed

**Solution:** 
- Don't rotate SESSION_SECRET without migrating encrypted data
- Use the same SESSION_SECRET across all instances
- Consider implementing a key rotation strategy with multiple key versions

---

### "Invalid credential format: missing purpose" Error

**Cause:** Trying to decrypt data that wasn't encrypted with the new system

**Solution:** Re-encrypt credentials or migrate old data

## Migration Guide

If you have existing plugins storing plaintext credentials:

1. Add encryption to your `prepareConfig` hook
2. Create a migration to encrypt existing database values
3. Update `fetchStatus` to decrypt credentials
4. Test thoroughly before deploying

## Need Help?

- Check [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md) for examples
- Review the source code in `lib/credentials.ts`
- Look at existing plugins like `linux-server` for real-world usage
