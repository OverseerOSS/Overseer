// Example: Simple API Monitor with Credential Encryption
// File: app/extensions/example-api/index.ts

import { MonitoringExtension } from "@/app/extensions/types";
import { encryptCredential, decryptCredential } from "@/lib/credentials";

interface ExampleApiConfig {
  apiUrl: string;
  encrypted_apiKey: string;
  checkInterval: number;
}

export const exampleApiMonitor: MonitoringExtension = {
  id: "example-api",
  name: "Example API Monitor",
  description: "A simple example showing how to monitor APIs with secure credential storage",
  
  configSchema: [
    {
      key: "apiUrl",
      label: "API Base URL",
      type: "url",
      required: true,
      description: "The base URL of your API (e.g., https://api.example.com)",
      scope: "monitor"
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      description: "Your API authentication key",
      scope: "global",
      encrypt: true  // Mark this field as sensitive
    },
    {
      key: "checkInterval",
      label: "Check Interval (seconds)",
      type: "number",
      defaultValue: 60,
      description: "How often to check the API health",
      scope: "global"
    }
  ],

  /**
   * prepareConfig: Called when a monitor is created
   * Use this to encrypt credentials before saving to database
   */
  async prepareConfig(config: Record<string, any>) {
    // Encrypt the API key before saving
    if (config.apiKey) {
      config.encrypted_apiKey = encryptCredential(
        config.apiKey,
        "example-api-apiKey"  // Unique purpose string
      );
      
      // Remove plaintext from config
      delete config.apiKey;
    }
    
    return { config };
  },

  /**
   * fetchStatus: Called periodically to check service status
   * Decrypt credentials here when you need to use them
   */
  async fetchStatus(config: Record<string, any>): Promise<any[]> {
    const { apiUrl, encrypted_apiKey } = config as ExampleApiConfig;
    
    try {
      // Decrypt API key only when needed
      const apiKey = decryptCredential(encrypted_apiKey);
      
      // Make authenticated request to your API
      const healthEndpoint = `${apiUrl}/health`;
      const response = await fetch(healthEndpoint, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Return service info
      return [{
        id: "api",
        name: apiUrl,
        type: "api",
        status: data.status === "healthy" ? "running" : "error",
        details: {
          statusCode: response.status,
          responseTime: data.responseTime || "N/A",
          version: data.version || "unknown",
          uptime: data.uptime || "N/A"
        }
      }];

    } catch (error: any) {
      // Handle errors gracefully
      return [{
        id: "api",
        name: apiUrl,
        type: "api",
        status: "error",
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }];
    }
  },

  /**
   * testConnection: Called when user clicks "Test Connection"
   * Verify credentials and connectivity
   */
  async testConnection(config: Record<string, any>) {
    const { apiUrl, encrypted_apiKey } = config as ExampleApiConfig;
    
    try {
      // Decrypt API key for testing
      const apiKey = decryptCredential(encrypted_apiKey);
      
      // Test the connection
      const response = await fetch(`${apiUrl}/health`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        return {
          success: true,
          message: `Successfully connected to ${apiUrl}!`
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "Authentication failed. Please check your API key."
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
