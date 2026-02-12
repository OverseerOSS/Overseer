# Contributing to Overseer

Thank you for your interest in contributing to Overseer! This guide will help you understand how to add new monitoring extensions (plugins).

## 🚀 Community Extensions

We maintained a separate repository for community extensions. If you have built a plugin that you want to share with the world, please contribute it to:

👉 **[OverseerOSS/plugins](https://github.com/OverseerOSS/plugins)**

The guide below explains the internal architecture, but for distribution, please refer to the [Plugins Repository Guide](https://github.com/OverseerOSS/plugins/blob/main/CONTRIBUTING.md).

## Plugin Architecture (Local Development)

Overseer uses a modular "drop-in" architecture for extensions. Each extension is a self-contained folder within `app/extensions/`. **The system automatically discovers and registers any folder placed in this directory.**

### Directory Structure

To create a new extension, simply create a new folder with your plugin ID (e.g., `my-service`):

```
app/extensions/my-service/
├── index.ts      # (Required) Backend logic & configuration
├── card.tsx      # (Required) Frontend UI visualization
├── components/   # (Recommended) Sub-components for the card UI
│   ├── Metrics.tsx
│   └── Details.tsx
└── types.ts      # (Optional) TypeScript definitions
```

### 1. Backend Logic (`index.ts`)

This file defines how Overseer connects to your service and fetches data. It must export a named constant (e.g., `myServiceExtension`) that implements the `MonitoringExtension` interface.

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
      encrypt: true, // Automatically marks for encryption
    }
  ],

  // Main loop function called every few seconds
  fetchStatus: async (config): Promise<ServiceInfo[]> => {
    // 1. Fetch data from your service using 'config'
    // 2. Return an array of ServiceInfo objects
    return [
      {
        id: "main-node",
        name: "Main Node",
        type: "node",
        status: "running",
        details: {
          metrics: { cpu: 12, ram: 45 },
          port: 8080
        }
      }
    ];
  }
};
```

---

## 2. Frontend UI (`card.tsx`)

This file determines how your monitor looks on the dashboard. 

### Modular UI Pattern (Recommended)
As your plugin grows, we recommend splitting your UI into sub-components within a `components/` folder in your plugin directory. This keeps the main `card.tsx` readable.

```tsx
"use client";

import { ExtensionCardProps } from "../types";
import { MyMetrics } from "./components/MyMetrics";

export default function MyServiceCard({ service }: ExtensionCardProps) {
  const details = service.details || {};

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="text-sm font-medium">Node: {service.name}</div>
      
      {/* Visualizing custom detail data */}
      {details.metrics && <MyMetrics data={details.metrics} />}
      
      <div className="text-[10px] text-slate-400 border-t pt-2">
        ID: {service.id}
      </div>
    </div>
  );
}
```

---

## 3. Local Testing & Deployment

1. **Drop it in**: Simply move your folder into `app/extensions/`.
2. **Auto-Discovery**: The system will automatically detect the new plugin. You may need to refresh the page or restart `npm run dev` for the dynamic loader to pick up new files in some environments.
3. **Add Monitor**: Go to the Overseer Dashboard, click "Add Monitor", and your plugin should appear in the "Type" dropdown.

## Best Practices

1. **Clean UI**: Keep the card compact. Use `details` to store complex data and sub-components to render it.
2. **Encryption**: Always set `encrypt: true` for sensitive config fields (API keys, passwords).
3. **Error Reporting**: If `fetchStatus` fails, return `status: "error"` instead of letting the function throw an uncaught exception.
4. **Icons**: Use standard `lucide-react` icons for consistency with the rest of the application.

## Submission Process

If you want to share your plugin:

1. **Fork** the [Plugins Repository](https://github.com/OverseerOSS/plugins).
2. Add your plugin folder.
3. Submit a Pull Request.

Happy coding!

