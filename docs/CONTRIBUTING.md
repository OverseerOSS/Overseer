# Contributing to Overseer

Thank you for your interest in contributing to Overseer! This guide will help you understand how to add new monitoring extensions (plugins).

## 🚀 Community Extensions

We maintained a separate repository for community extensions. If you have built a plugin that you want to share with the world, please contribute it to:

👉 **[OverseerOSS/plugins](https://github.com/OverseerOSS/plugins)**

The guide below explains the internal architecture, but for distribution, please refer to the [Plugins Repository Guide](https://github.com/OverseerOSS/plugins/blob/main/CONTRIBUTING.md).

## Plugin Architecture (Local Development)

Overseer uses a modular "drop-in" architecture for extensions. Each extension is a self-contained folder within `app/extensions/`.

### Directory Structure

To create a new extension, simply create a new folder with your plugin ID (e.g., `my-service`):

```
app/extensions/my-service/
├── manifest.json # (Required) Plugin metadata
├── index.ts      # (Required) Backend logic & configuration
├── card.tsx      # (Required) Frontend UI visualization
└── types.ts      # (Optional) TypeScript definitions
```

### 1. Plugin Metadata (`manifest.json`)

```json
{
  "id": "my-service",
  "name": "My Service Monitor",
  "version": "1.0.0",
  "description": "Monitors the status of My Service",
  "entry": "index.ts"
}
```

---

## 2. Backend Logic (`index.ts`)

This file defines how Overseer connects to your service and fetches data. It must export a default object implementing `MonitoringExtension`.

```typescript
import { MonitoringExtension, ServiceInfo } from "../types";

export const myServiceExtension: MonitoringExtension = {
  id: "my-service",
  name: "My Service Monitor",
  description: "Monitors status and metrics for My Service",
  
  // Define configuration fields the user needs to fill out
  configSchema: [
    {
      key: "endpoint",
      label: "API Endpoint",
      type: "url",
      required: true,
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      encrypt: true, // Automatically encrypts this value
    }
  ],

  // Main loop function called every few seconds
  fetchStatus: async (config): Promise<ServiceInfo[]> => {
    // 1. Fetch data from your service
    // 2. Return an array of ServiceInfo objects
    return [
      {
        id: "main-node",
        name: "Main Node",
        type: "node",
        status: "running",
        details: {
          uptime: 12345,
          requests: 50,
        }
      }
    ];
  }
};
```

See [PLUGIN_DEVELOPMENT.md](./PLUGIN_DEVELOPMENT.md) for full API documentation.

---

## 3. Frontend UI (`card.tsx`)

This file allows you to customize how your monitor looks on the dashboard. This file is required to provide a good user experience.

To create a custom visualization (graphs, icons, specific layouts):

1. Create `card.tsx` in your extension folder.
2. Export a default React component.

```tsx
"use client";

import { ExtensionCardProps } from "../types";
// import { MetricGraph } from "@/app/components/MetricGraph"; // Use if needed

export default function MyServiceCard({ service, history }: ExtensionCardProps) {
  // `service` contains the current real-time data
  // `history` contains the last ~100 data points for graphing
  
  // Custom UI here
  return (
     <div>
        <h3>{service.name}</h3>
        <p>Status: {service.status}</p>
     </div>
  );
}
```

## Submission Process

If you want to contribute your plugin to the official list:

1.  **Fork** the [Plugins Repository](https://github.com/OverseerOSS/plugins).
2.  Add your plugin folder with `manifest.json`, `index.ts` and `card.tsx`.
3.  Submit a Pull Request.

Happy coding!

## 3. Deployment

Once your folder is ready:
1. Restart the development server (`npm run dev`).
2. Your extension will appear in the "Add Monitor" dropdown.
3. The custom card will automatically load when you view the monitor.

## Best Practices

1. **Error Handling**: In `fetchStatus`, catch errors gracefully. If the service is down, return a ServiceInfo with `status: "error"` and a helpful `details.error` message.
2. **Performance**: `fetchStatus` runs frequently. Avoid heavy computations.
3. **Security**: Always use `encrypt: true` in `configSchema` for passwords, tokens, and keys.
4. **Types**: Use the shared types from `../types` to ensure compatibility.
