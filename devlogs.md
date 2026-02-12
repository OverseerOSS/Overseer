Addded a way to encrypt api keys and such! And also added this nice  linux monitor!

### Latest Updates
- **Modular Plugin System**: Refactored the extension loader to automatically discover and register plugins from the `app/extensions` directory.
- **Enhanced Dokploy Support**: Updated the Dokploy plugin to capture CPU, Memory, and Network metrics, with a modular UI using extension-internal components.
- **Environment Management**: Added `.env.example` and improved server configuration to support Codespaces and Server Actions.
- **Dashboard Consistency**: Fixed sidebar navigation and implemented URL-based monitor selection with proper React Suspense boundaries.
- **Database Stability**: Resolved Prisma migration issues and created documentation for database updates.