# Overseer 🔭

A powerful, extensible infrastructure monitoring platform built with Next.js. Monitor servers, databases, APIs, containers, and more through a unified dashboard.

## Features

- 📊 **Real-time Monitoring** - Track server metrics, API health, and service status
- 🔌 **Plugin System** - Create custom monitoring extensions for any infrastructure
- 🔐 **Secure Credentials** - Built-in encryption for API keys and passwords
- 📈 **Historical Data** - View metrics over time with interactive graphs
- 🚀 **Easy Setup** - Get started in minutes with simple configuration

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Environment variables configured (see [Configuration](#configuration))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Overseer

# Install dependencies
npm install

# Set up database
npx prisma migrate dev

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## Configuration

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/overseer"
SESSION_SECRET="your-very-long-random-secret-at-least-32-characters"
```

Generate a secure `SESSION_SECRET`:
```bash
openssl rand -hex 32
```

## Built-in Monitors

Overseer comes with these monitoring extensions:

- **Linux Server** - Monitor CPU, RAM, and system metrics via SSH
- **Dokploy** - Monitor Dokploy-managed containers and applications

## Documentation

- 📖 **[Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md)** - Create your own monitoring extensions
- 🔒 **[Credential Management](./docs/CREDENTIALS.md)** - Securely store API keys and secrets
- 📚 **[Full Documentation](./docs/)** - Complete guides and references

## Creating a Plugin

Overseer uses a **drop-in plugin system**. Simply create a folder in `app/extensions/` and it will be automatically registered.

```typescript
// app/extensions/my-plugin/index.ts
import { MonitoringExtension } from "../types";

export const myPlugin: MonitoringExtension = {
  id: "my-plugin",
  name: "My Service Monitor",
  description: "Monitor my custom service",
  
  configSchema: [
    {
      key: "apiUrl",
      label: "API URL",
      type: "url",
      required: true
    }
  ],
  
  async fetchStatus(config) {
    const response = await fetch(config.apiUrl);
    const data = await response.json();
    
    return [{
      id: "service",
      name: "My Service",
      type: "api",
      status: data.healthy ? "running" : "error",
      details: { uptime: data.uptime }
    }];
  }
};
```

See the [Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md) for complete documentation.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org) with App Router
- **Database:** [PostgreSQL](https://www.postgresql.org) with [Prisma ORM](https://www.prisma.io)
- **Authentication:** Iron Session
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com)
- **Charts:** [Recharts](https://recharts.org)

## Project Structure

```
Overseer/
├── app/
│   ├── extensions/        # Monitoring plugins
│   ├── components/        # React components
│   ├── actions.ts         # Server actions
│   └── page.tsx          # Dashboard
├── lib/
│   ├── credentials.ts    # Credential encryption utilities
│   ├── db.ts            # Database helpers
│   └── session.ts       # Authentication
├── prisma/
│   └── schema.prisma    # Database schema
└── docs/                # Documentation
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## License

MIT License - see LICENSE file for details

## Need Help?

- 📖 Check the [documentation](./docs/)
- 🐛 Open an [issue](../../issues)
- 💬 Start a [discussion](../../discussions)
