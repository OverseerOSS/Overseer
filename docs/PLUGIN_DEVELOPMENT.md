# Overseer Plugin Development Guide

Overseer allows developers to create extensions to monitor various types of infrastructure (servers, databases, APIs, docker containers, etc.). Plugins are dynamically loaded from the `app/extensions` directory.

## Directory Structure

Each extension lives in its own folder under `app/extensions/`.
Example: `app/extensions/my-new-plugin/index.ts`

The plugin must export a default object complying with the `MonitoringExtension` interface.

## Interface Definitions

### `MonitoringExtension`

```typescript
interface MonitoringExtension {
  id: string;          // Unique ID (e.g., "my-plugin")
  name: string;        // Display name (e.g., "My Plugin")
  description: string; // Short description
  configSchema: ExtensionConfigField[];
  
  // Implementation
  fetchStatus: (config: Record<string, any>) => Promise<ServiceInfo[]>;
  
  // Lifecycle Hooks
  prepareConfig?: (config: Record<string, any>) => Promise<{ 
      config: Record<string, any>; 
      metadata?: Record<string, any> 
  }>;
  testConnection?: (config: Record<string, any>) => Promise<{ 
      success: boolean; 
      message?: string; 
      error?: string 
  }>;
}
```

### `ExtensionConfigField`

Start identifying which configuration values your plugin needs.

```typescript
interface ExtensionConfigField {
  key: string;         // Config key passed in `config` object
  label: string;       // UI Label
  type: "text" | "password" | "number" | "url" | "checkbox";
  defaultValue?: string | number | boolean;
  required?: boolean;
  description?: string;
  
  // Controls where this config is asked for:
  // "global"  : Asked once in Settings -> Global Config
  // "monitor" : Asked every time a monitor is added
  // "both"    : (Default) Asked in monitor, with Global config as fallback/default
  scope?: "global" | "monitor" | "both";
  
  // Mark sensitive fields for encryption
  encrypt?: boolean;   // If true, automatically encrypt this value
}
```

## Core Hooks

### 1. `fetchStatus` (Required)

This is the main loop function. It is called every few seconds (polling interval) by the Overseer backend to get the current status of the monitored service.

**Parameters:**
- `config`: An object containing the merged configuration (Global + Monitor specific).

**Returns:** `Promise<ServiceInfo[]>`

```typescript
interface ServiceInfo {
  id: string;        // Unique identifier for the resource
  name: string;      // Name of resource
  type: string;      // e.g., "linux-server", "postgres-db"
  status: "running" | "stopped" | "error" | "unknown";
  details?: {
      cpuUsage?: number; // 0-100
      ramUsed?: number;  // bytes
      ramTotal?: number; // bytes
      [key: string]: any;
  };
}
```

### 2. `prepareConfig` (Optional)

Called **once** when a user creates a new Monitor instance using your plugin. Use this to generate keys, key pairs, setup webhooks, encrypt credentials, or validate inputs before saving.

**Use Cases:**
- Generating SSH key pairs for server connections
- Encrypting API keys and passwords before database storage
- Validating API credentials
- Setting up webhooks or callbacks

**Returns:**
- `config`: The modified configuration object to save to the database.

## Custom UI Cards

Each extension can provide a specialized React component to visualize its data. 

1. Create a `card.tsx` file in your extension directory.
2. Export a default component that accepts `ExtensionCardProps`.
3. Register it in `app/extensions/registry.tsx`.

### Interface

```typescript
export interface ExtensionCardProps {
  service: ServiceInfo;
  history: Array<{ timestamp: number; data: ServiceInfo }>;
}
```

### Example `card.tsx`

```tsx
"use client";

import { ExtensionCardProps } from "../types";
import { MetricGraph } from "@/app/components/MetricGraph";

export default function MyPluginCard({ service, history }: ExtensionCardProps) {
  // Extract custom metrics from service.details or the history array
  const cpu = service.details?.cpuUsage;

  return (
    <div className="p-4 border rounded">
      <h3>{service.name}</h3>
      <div className="text-2xl">{cpu}% CPU</div>
      {/* ... render graphs or other details ... */}
    </div>
  );
}
```
- `metadata`: Data to be returned to the frontend UI immediately (e.g., to show the user the public key they need to install).

### 3. `testConnection` (Optional)

Called when the user clicks "Test Connection" in the UI. Use this to verify credentials, check connectivity, and provide helpful error messages.

**Returns:** `{ success: boolean; message?: string; error?: string }`

---

## Storing API Keys and Credentials

**IMPORTANT:** Never store sensitive data (API keys, passwords, tokens) in plaintext in the database!

Overseer provides built-in encryption utilities specifically for this purpose.

### Quick Start: Credential Encryption

```typescript
import { encryptCredential, decryptCredential } from "@/lib/credentials";

// 1. In your configSchema, mark sensitive fields
{
  key: "apiKey",
  label: "API Key",
  type: "password",
  required: true,
  encrypt: true  // Documents that this should be encrypted
}

// 2. In prepareConfig, encrypt before saving
prepareConfig: async (config) => {
  if (config.apiKey) {
    config.encrypted_apiKey = encryptCredential(
      config.apiKey, 
      "my-plugin-apiKey"  // Unique purpose string
    );
    delete config.apiKey; // Remove plaintext
  }
  
  return { config };
}

// 3. In fetchStatus, decrypt when needed
fetchStatus: async (config) => {
  const apiKey = decryptCredential(config.encrypted_apiKey);
  
  // Use apiKey securely in your API calls
  const response = await fetch("https://api.example.com/data", {
    headers: { "Authorization": `Bearer ${apiKey}` }
  });
  
  // ... process response
}
```

### Encryption Functions

#### `encryptCredential(data, purpose)`

Encrypts a single credential using AES-256-GCM.

**Parameters:**
- `data` (string): The sensitive value to encrypt
- `purpose` (string): A unique identifier for this credential (e.g., "my-plugin-api-key")

**Returns:** Encrypted JSON string safe for database storage

```typescript
import { encryptCredential } from "@/lib/credentials";

const encrypted = encryptCredential(config.apiToken, "github-plugin-token");
config.encrypted_apiToken = encrypted;
delete config.apiToken; // Always remove plaintext
```

#### `decryptCredential(encryptedJson)`

Decrypts a credential encrypted with `encryptCredential()`.

**Parameters:**
- `encryptedJson` (string): The encrypted value from the database

**Returns:** Original plaintext credential

```typescript
import { decryptCredential } from "@/lib/credentials";

const apiToken = decryptCredential(config.encrypted_apiToken);
// Use apiToken for authenticated requests
```

#### `encryptCredentials(credentials, pluginId)`

Convenience function to encrypt multiple credentials at once.

**Parameters:**
- `credentials` (object): Key-value pairs of credentials to encrypt
- `pluginId` (string): Your plugin's unique ID

**Returns:** Object with encrypted values (keys prefixed with "encrypted_")

```typescript
import { encryptCredentials } from "@/lib/credentials";

const encrypted = encryptCredentials(
  {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    webhookToken: config.webhookToken
  },
  "my-plugin"
);

// Returns:
// {
//   encrypted_apiKey: "...",
//   encrypted_apiSecret: "...",
//   encrypted_webhookToken: "..."
// }

Object.assign(config, encrypted);
delete config.apiKey;
delete config.apiSecret;
delete config.webhookToken;
```

#### `decryptCredentials(encryptedCredentials)`

Decrypts multiple credentials at once.

```typescript
import { decryptCredentials } from "@/lib/credentials";

const credentials = decryptCredentials({
  encrypted_apiKey: config.encrypted_apiKey,
  encrypted_apiSecret: config.encrypted_apiSecret
});

// Returns:
// {
//   apiKey: "actual-key",
//   apiSecret: "actual-secret"
// }

const { apiKey, apiSecret } = credentials;
```

### Security Best Practices

1. **Always use `prepareConfig` to encrypt:** Don't store plaintext credentials
2. **Use unique purpose strings:** Each credential should have a unique purpose identifier
3. **Delete plaintext after encryption:** Always remove the original plaintext value
4. **Decrypt only when needed:** Don't store decrypted values in memory longer than necessary
5. **Use password type for sensitive fields:** This prevents the UI from displaying the value

---

## Example Plugins

### Example 1: Simple Website Pinger

```typescript
import { MonitoringExtension } from "../types";

export const websitePinger: MonitoringExtension = {
  id: "website-pinger",
  name: "Website Pinger",
  description: "Check if a website is up and measure response time",
  
  configSchema: [
    {
      key: "url",
      label: "Website URL",
      type: "url",
      required: true,
      scope: "monitor"
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      defaultValue: 5000,
      scope: "global"
    }
  ],

  async fetchStatus(config) {
    try {
      const start = Date.now();
      const res = await fetch(config.url, { 
        signal: AbortSignal.timeout(config.timeout) 
      });
      const latency = Date.now() - start;
      
      return [{
        id: "main",
        name: config.url,
        type: "http",
        status: res.ok ? "running" : "error",
        details: {
          latency,
          statusCode: res.status
        }
      }];
    } catch (e: any) {
      return [{
        id: "main",
        name: config.url,
        type: "http",
        status: "error",
        details: { error: e.message }
      }];
    }
  },

  async testConnection(config) {
    try {
      const res = await fetch(config.url, { 
        method: "HEAD",
        signal: AbortSignal.timeout(config.timeout) 
      });
      return {
        success: res.ok,
        message: res.ok ? `Connected! Status: ${res.status}` : undefined,
        error: res.ok ? undefined : `HTTP ${res.status}: ${res.statusText}`
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message
      };
    }
  }
};
```

### Example 2: API Monitor with Credentials

```typescript
import { MonitoringExtension } from "../types";
import { encryptCredential, decryptCredential } from "@/lib/credentials";

export const apiMonitor: MonitoringExtension = {
  id: "api-monitor",
  name: "API Health Monitor",
  description: "Monitor API endpoints with authentication",
  
  configSchema: [
    {
      key: "apiUrl",
      label: "API Base URL",
      type: "url",
      required: true,
      scope: "monitor"
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "Your API authentication key",
      scope: "global",
      encrypt: true  // Mark as sensitive
    },
    {
      key: "endpoint",
      label: "Health Check Endpoint",
      type: "text",
      defaultValue: "/health",
      scope: "monitor"
    }
  ],

  // Encrypt API key before saving to database
  async prepareConfig(config) {
    if (config.apiKey) {
      config.encrypted_apiKey = encryptCredential(
        config.apiKey,
        "api-monitor-key"
      );
      delete config.apiKey; // Remove plaintext
    }
    
    return { config };
  },

  async fetchStatus(config) {
    // Decrypt API key when needed
    const apiKey = decryptCredential(config.encrypted_apiKey);
    const url = `${config.apiUrl}${config.endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        }
      });
      
      const data = await response.json();
      
      return [{
        id: "api",
        name: config.apiUrl,
        type: "api",
        status: response.ok ? "running" : "error",
        details: {
          statusCode: response.status,
          responseTime: data.responseTime,
          version: data.version
        }
      }];
    } catch (error: any) {
      return [{
        id: "api",
        name: config.apiUrl,
        type: "api",
        status: "error",
        details: { error: error.message }
      }];
    }
  },

  async testConnection(config) {
    const apiKey = decryptCredential(config.encrypted_apiKey);
    const url = `${config.apiUrl}${config.endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      
      if (response.ok) {
        return {
          success: true,
          message: "Successfully connected to API"
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`
      };
    }
  }
};
```

### Example 3: Database Monitor with Multiple Credentials

```typescript
import { MonitoringExtension } from "../types";
import { encryptCredentials, decryptCredentials } from "@/lib/credentials";

export const databaseMonitor: MonitoringExtension = {
  id: "postgres-monitor",
  name: "PostgreSQL Monitor",
  description: "Monitor PostgreSQL database health and performance",
  
  configSchema: [
    {
      key: "host",
      label: "Database Host",
      type: "text",
      required: true,
      scope: "monitor"
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      defaultValue: 5432,
      scope: "monitor"
    },
    {
      key: "database",
      label: "Database Name",
      type: "text",
      required: true,
      scope: "monitor"
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      scope: "global",
      encrypt: true
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      scope: "global",
      encrypt: true
    }
  ],

  async prepareConfig(config) {
    // Encrypt multiple credentials at once
    const encrypted = encryptCredentials(
      {
        username: config.username,
        password: config.password
      },
      "postgres-monitor"
    );
    
    Object.assign(config, encrypted);
    delete config.username;
    delete config.password;
    
    return { config };
  },

  async fetchStatus(config) {
    // Decrypt credentials
    const { username, password } = decryptCredentials({
      encrypted_username: config.encrypted_username,
      encrypted_password: config.encrypted_password
    });
    
    // Connect to database using decrypted credentials
    // (Simplified - in reality you'd use a proper PostgreSQL client)
    try {
      const connectionString = `postgresql://${username}:${password}@${config.host}:${config.port}/${config.database}`;
      
      // Your database monitoring logic here
      
      return [{
        id: "db",
        name: config.database,
        type: "database",
        status: "running",
        details: {
          connections: 10,
          queries: 245
        }
      }];
    } catch (error: any) {
      return [{
        id: "db",
        name: config.database,
        type: "database",
        status: "error",
        details: { error: error.message }
      }];
    }
  }
};
```

---

## Testing Your Plugin

1. **Create your plugin:** Add it to `app/extensions/your-plugin/index.ts`
2. **Restart the dev server:** `npm run dev`
3. **Navigate to Settings:** Install your extension
4. **Add a monitor:** Create a new monitor using your plugin
5. **Test connection:** Use the Test Connection button to verify your configuration
6. **Monitor the dashboard:** Check that your plugin displays data correctly

## Debugging Tips

- Use `console.log()` in `fetchStatus` to debug data flow
- Check the browser console for UI errors
- Test your plugin's `testConnection` hook thoroughly
- Verify that encrypted credentials are never logged in plaintext
- Use TypeScript to catch type errors early

## Need Help?

- Check existing plugins in `app/extensions/` for examples
- Review the credential encryption utilities in `lib/credentials.ts`
- See the types in `app/extensions/types.ts` for the full API

---

**Happy Plugin Development! 🚀**
