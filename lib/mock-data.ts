export const MOCK_MONITORS = [
  {
    id: "demo-1",
    name: "Main Website",
    type: "HTTP",
    url: "https://example.com",
    method: "GET",
    interval: 60,
    config: JSON.stringify({ url: "https://example.com" }),
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-2",
    name: "API Gateway",
    type: "HTTP",
    url: "https://api.example.com/health",
    method: "GET",
    interval: 30,
    config: JSON.stringify({ url: "https://api.example.com/health" }),
    order: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "demo-3",
    name: "Database Cluster",
    type: "PING",
    url: "10.0.0.5",
    method: "GET",
    interval: 30,
    config: JSON.stringify({ host: "10.0.0.5" }),
    order: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

export const MOCK_STATUS_PAGES = [
  {
    id: "sp-1",
    title: "Public Status",
    slug: "public",
    description: "Real-time status of our public services",
    showMetrics: true,
    showHistory: true,
    showBanner: true,
    showRecentHistory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    monitors: MOCK_MONITORS,
  }
];

export const MOCK_METRICS = MOCK_MONITORS.map(m => ({
  id: `metric-${m.id}`,
  monitorId: m.id,
  timestamp: new Date(),
  data: JSON.stringify([{ 
    id: "endpoint-1",
    name: m.name,
    type: m.type.toLowerCase(),
    status: 'running' as const, 
    metrics: {
      latency: Math.floor(Math.random() * 100) + 20
    },
    details: {
      lastCheck: new Date().toISOString()
    }
  }])
}));
