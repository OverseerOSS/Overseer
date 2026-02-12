export type ServiceStatus = 
  | "running" 
  | "stopped" 
  | "error" 
  | "unknown" 
  | "degraded" 
  | "failed"
  | "starting"
  | "offline";

export interface ServiceMetrics {
  cpu?: number;      // Percentage 0-100
  ram?: number;      // Percentage 0-100
  ramUsed?: number;  // Bytes
  ramTotal?: number; // Bytes
  networkIn?: number;  // Bytes per second
  networkOut?: number; // Bytes per second
  latency?: number;    // ms
}

export interface ServiceInfo {
  id: string;
  name: string;
  type: string; // e.g., "application", "database", "container"
  status: ServiceStatus | string;
  startTime?: string; // ISO timestamp
  metrics?: ServiceMetrics;
  details?: Record<string, any>; // Extension-specific extra data
}

export interface ExtensionCardProps {
  service: ServiceInfo;
  history: Array<{ timestamp: number; data: any }>;
}

export interface ExtensionConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "url" | "checkbox";
  defaultValue?: string | number | boolean;
  required?: boolean;
  description?: string;
  category?: string; // Optional category for tabbed configuration
  scope?: "global" | "monitor" | "both"; // Defaults to "both"
  /**
   * If true, this field's value will be automatically encrypted before saving to the database.
   * Use this for API keys, passwords, tokens, and other sensitive data.
   * The encrypted value will be stored with an "encrypted_" prefix.
   * 
   * @example
   * // In your configSchema:
   * { key: "apiKey", type: "password", encrypt: true }
   * 
   * // In prepareConfig, encrypt it:
   * import { encryptCredential } from "@/lib/credentials";
   * config.encrypted_apiKey = encryptCredential(config.apiKey, "my-plugin-apiKey");
   * delete config.apiKey; // Remove plaintext
   * 
   * // In fetchStatus, decrypt it:
   * import { decryptCredential } from "@/lib/credentials";
   * const apiKey = decryptCredential(config.encrypted_apiKey);
   */
  encrypt?: boolean;
}

export interface ExtensionMetadata {
  id: string;
  name: string;
  description: string;
  configSchema: ExtensionConfigField[];
  displayOptions?: {
    hideStatusCards?: boolean;
    hideHistoryUptime?: boolean;
  };
}

export interface MonitoringExtension extends ExtensionMetadata {
  fetchStatus: (config: Record<string, any>) => Promise<ServiceInfo[]>;
  // Optional lifecycle hooks
  prepareConfig?: (
    config: Record<string, any>
  ) => Promise<{ config: Record<string, any>; metadata?: Record<string, any> }>;
  testConnection?: (
    config: Record<string, any>
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
}
