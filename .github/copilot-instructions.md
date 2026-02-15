# Overseer Coding Standards & Architecture

Overseer is a monolithic infrastructure monitoring platform built with Next.js and Prisma, inspired by Uptime Kuma.

## Core Architecture
- **Monitoring Engine**: Located in `lib/monitoring/core-engine.ts`. This is the central hub for all status checks (HTTP/S, Ping, etc.).
- **Data Persistence**: Metrics are stored in the `Metric` table. Configuration for monitors is stored in `ServiceMonitor`.
- **Background Polling**: Managed by `lib/monitor-worker.ts`, which runs periodic checks for all active monitors.
- **Real-time Updates**: Handled via Server-Sent Events (SSE) in `app/api/monitors/[id]/stream/route.ts`.

## Development Workflows
- **New Monitor Types**: Add logic to `lib/monitoring/core-engine.ts` within `fetchMonitorStatus`.
- **Database Changes**: Update `prisma/schema.prisma`, then run `npx prisma migrate dev`.
- **Testing**: Use `npm run test:frontend` for Playwright end-to-end tests.
- **Environment**: Requires `DATABASE_URL` and `SESSION_SECRET` (at least 32 characters).

## Project Conventions
- **Monolithic Core**: All monitoring logic belongs in the core engine. Do not create external plugins or extensions.
- **Generic Components**: Use `GenericMonitorCard.tsx` and other reusable components in `app/components/` for UI.
- **Sensitive Data**: NEVER store secrets in plaintext. Use `encryptCredential(data, purpose)` and `decryptCredential(encryptedJson)` from `lib/credentials.ts`.
- **Server Actions**: Use `use server` actions in `app/actions.ts` for all data mutations and primary page data fetching.
- **Type Safety**: Adhere to types defined in `app/actions.ts` and `prisma/schema.prisma`.
- **Streaming**: Resource metrics should be updated asynchronously via the SSE stream route to avoid blocking the main UI.

## Key Files to Reference
- [lib/monitoring/core-engine.ts](lib/monitoring/core-engine.ts): The primary engine for status collection.
- [lib/monitor-worker.ts](lib/monitor-worker.ts): The background service that powers periodic monitoring.
- [app/actions.ts](app/actions.ts): Main hub for server-side logic and data retrieval.
- [lib/db.ts](lib/db.ts): Prisma client initialization and singleton pattern.
- [lib/credentials.ts](lib/credentials.ts): Purpose-based encryption utilities for secrets.
- [prisma/schema.prisma](prisma/schema.prisma): Database models and relationships.
