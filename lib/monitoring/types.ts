export type ServiceStatus = 'running' | 'degraded' | 'error' | 'unknown';

export interface ServiceInfo {
  id: string;
  name: string;
  type: string;
  status: ServiceStatus;
  metrics?: Record<string, any>;
  details?: Record<string, any>;
}

export interface MonitorMetadata {
  id: string;
  name: string;
  description: string;
  configSchema: any[];
}
