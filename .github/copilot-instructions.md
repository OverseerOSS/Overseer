# Overseer Coding Standards & Architecture

Overseer is an extensible infrastructure monitoring platform built with Next.js and Prisma.

## Core Architecture
- **Extension System**: Located in `app/extensions/`. Each subdirectory is a standalone plugin (e.g., `linux-server`, `dokploy`).
- **Dynamic Loading**: `app/extensions/loader.ts` scans the directory and loads extensions that implement the `MonitoringExtension` interface.
- **Metric Collection**: `fetchStatus` within each extension is the primary data source. It returns an array of `ServiceInfo`.
- **Data Persistence**: Metrics are stored in the `Metric` table as JSON strings. Configuration is stored in `ServiceMonitor`.
- **Real-time Updates**: Handled via SSE in `app/api/monitors/[id]/stream/route.ts`.

## Development Workflows
- **New Plugin**: Create `app/extensions/<id>/index.ts` and `card.tsx`. Define configuration schema in `configSchema`.
- **Database Changes**: Update `prisma/schema.prisma`, then run `npx prisma migrate dev`.
- **Testing**: Use `npm run test:frontend` for Playwright end-to-end tests.
- **Environment**: Requires `DATABASE_URL` and `SESSION_SECRET` (at least 32 characters).

## Project Conventions
- **STRICT DECOUPLING**: Extension-specific logic MUST NOT exist in the main repository (outside of `app/extensions/<id>/`). Never hardcode checks for extension IDs in core components.
- **NO HARDCODING**: Use `displayOptions` in `ExtensionMetadata` for feature flags or load dynamic components (e.g., `card.tsx`, `setup.tsx`) via `app/extensions/registry.tsx`.
- **Encapsulation**: Plugin developers MUST NOT modify common dashboard components or `app/page.tsx` to add UI elements. All custom visualizations must be implemented within `app/extensions/<id>/card.tsx`.
- **Sensitive Data**: NEVER store secrets in plaintext. Use `encryptCredential(data, purpose)` and `decryptCredential(encryptedJson)` from `lib/credentials.ts`.
- **Server Actions**: Use `use server` actions in `app/actions.ts` for all data mutations and primary page data fetching.
- **Type Safety**: Adhere to `MonitoringExtension` and `ServiceInfo` types in `app/extensions/types.ts`.
- **Streaming**: Don't block the main dashboard thread. Metrics should be updated asynchronously via the stream route.

## Key Files to Reference
- [app/extensions/types.ts](app/extensions/types.ts): All core interfaces for monitoring extensions.
- [app/extensions/loader.ts](app/extensions/loader.ts): Logic for how plugins are discovered and loaded.
- [app/extensions/registry.tsx](app/extensions/registry.tsx): Handles dynamic loading of plugin-specific `card.tsx` components.
- [lib/db.ts](lib/db.ts): Prisma client initialization and singleton pattern.
- [lib/credentials.ts](lib/credentials.ts): Purpose-based encryption utilities for secrets.
- [prisma/schema.prisma](prisma/schema.prisma): Database models and relationships.

## Extension Implementation Pattern
When creating a new extension, its `index.ts` must export an object matching `MonitoringExtension`. To add custom UI to the dashboard, create a `card.tsx` in the same folder:

### index.ts
```typescript
export const myExtension: MonitoringExtension = {
// ... config and fetchStatus
```

### card.tsx
```tsx
import { ExtensionCardProps } from "../types";

export default function MyExtensionCard({ service, history }: ExtensionCardProps) {
  // This component will be dynamically loaded by the dashboard
  return <div>{service.name}</div>;
}
```
