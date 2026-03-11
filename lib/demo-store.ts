import "server-only";

import { fetchCoreStatus } from "@/lib/monitoring/core-engine";
import type { ServiceInfo } from "@/lib/monitoring/types";

type DemoMonitor = {
  id: string;
  name: string;
  type: string;
  config: string;
  url: string | null;
  method: string;
  interval: number;
  active: boolean;
  lastStatus: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type DemoStatusPage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  showMetrics: boolean;
  showCpu: boolean;
  showRam: boolean;
  showNetwork: boolean;
  showBanner: boolean;
  showHistory: boolean;
  showRecentHistory: boolean;
  config: Record<string, any>;
  monitorIds: string[];
};

type DemoMetricPoint = {
  timestamp: Date;
  data: ServiceInfo[];
};

type DemoState = {
  resetAt: number;
  orgName: string;
  theme: "light" | "dark";
  defaultPingInterval: number;
  monitors: DemoMonitor[];
  statusPages: DemoStatusPage[];
  metricsByMonitor: Map<string, DemoMetricPoint[]>;
};

const RESET_INTERVAL_MS = 15 * 60 * 1000;
const MAX_POINTS_PER_MONITOR = 500;

let state: DemoState | null = null;

function randomId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMonitorConfig(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function buildInitialState(): DemoState {
  const monitors: DemoMonitor[] = [];

  const statusPages: DemoStatusPage[] = [];

  return {
    resetAt: Date.now(),
    orgName: "Overseer Demo",
    theme: "light",
    defaultPingInterval: 60,
    monitors,
    statusPages,
    metricsByMonitor: new Map(),
  };
}

function ensureState(): DemoState {
  if (!state) {
    state = buildInitialState();
    return state;
  }

  if (Date.now() - state.resetAt >= RESET_INTERVAL_MS) {
    state = buildInitialState();
  }

  return state;
}

function recordMetricPoint(monitorId: string, data: ServiceInfo[]) {
  const current = ensureState();
  const points = current.metricsByMonitor.get(monitorId) || [];
  points.push({ timestamp: new Date(), data });
  if (points.length > MAX_POINTS_PER_MONITOR) {
    points.splice(0, points.length - MAX_POINTS_PER_MONITOR);
  }
  current.metricsByMonitor.set(monitorId, points);
}

export function getDemoOrgName() {
  return ensureState().orgName;
}

export function setDemoOrgName(name: string) {
  ensureState().orgName = name || "Overseer Demo";
}

export function getDemoTheme() {
  return ensureState().theme;
}

export function setDemoTheme(theme: "light" | "dark") {
  ensureState().theme = theme;
}

export function getDemoDefaultPingInterval() {
  return ensureState().defaultPingInterval;
}

export function setDemoDefaultPingInterval(interval: number) {
  ensureState().defaultPingInterval = interval;
}

export function getDemoMonitors(): DemoMonitor[] {
  const current = ensureState();
  return clone(current.monitors);
}

export function getDemoMonitorById(id: string): DemoMonitor | null {
  const current = ensureState();
  const monitor = current.monitors.find((m) => m.id === id);
  return monitor ? clone(monitor) : null;
}

export function addDemoMonitor(input: {
  type: string;
  name: string;
  config: Record<string, any>;
  url?: string | null;
  method?: string | null;
  interval: number;
}) {
  const current = ensureState();
  const monitor: DemoMonitor = {
    id: randomId("demo-monitor"),
    name: input.name,
    type: input.type,
    config: JSON.stringify(input.config || {}),
    url: input.url || null,
    method: input.method || "GET",
    interval: input.interval,
    active: true,
    lastStatus: "unknown",
    order: current.monitors.length,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  current.monitors.push(monitor);

  // In demo mode every new monitor is visible by default on all status pages.
  current.statusPages = current.statusPages.map((page) => ({
    ...page,
    monitorIds: page.monitorIds.includes(monitor.id) ? page.monitorIds : [...page.monitorIds, monitor.id],
  }));

  return clone(monitor);
}

export function updateDemoMonitor(id: string, updates: { name: string; config: Record<string, any>; url?: string | null; method?: string | null; interval: number; }) {
  const current = ensureState();
  const monitorIndex = current.monitors.findIndex((m) => m.id === id);
  if (monitorIndex === -1) return null;

  const existing = current.monitors[monitorIndex];
  const next: DemoMonitor = {
    ...existing,
    name: updates.name,
    config: JSON.stringify(updates.config || {}),
    url: updates.url || null,
    method: updates.method || "GET",
    interval: updates.interval,
    updatedAt: new Date(),
  };

  current.monitors[monitorIndex] = next;
  return clone(next);
}

export function deleteDemoMonitor(id: string) {
  const current = ensureState();
  const exists = current.monitors.some((m) => m.id === id);
  if (!exists) return false;

  current.monitors = current.monitors
    .filter((m) => m.id !== id)
    .map((m, index) => ({ ...m, order: index }));

  current.statusPages = current.statusPages.map((page) => ({
    ...page,
    monitorIds: page.monitorIds.filter((monitorId) => monitorId !== id),
  }));

  current.metricsByMonitor.delete(id);
  return true;
}

export function getDemoStatusPages() {
  const current = ensureState();
  return clone(current.statusPages.map((p) => ({ ...p, name: p.title })));
}

export function getDemoStatusPageBySlug(slug: string) {
  const current = ensureState();
  const page = current.statusPages.find((p) => p.slug === slug);
  if (!page) return null;

  const monitors = page.monitorIds
    .map((id) => current.monitors.find((m) => m.id === id))
    .filter((m): m is DemoMonitor => Boolean(m))
    .map((m) => ({ id: m.id, name: m.name, type: m.type }));

  return clone({ ...page, monitors, name: page.title });
}

export function createDemoStatusPage(data: any) {
  const current = ensureState();
  const page: DemoStatusPage = {
    id: randomId("demo-sp"),
    slug: data.slug,
    title: data.name || data.title || "Status Page",
    description: data.description || "Demo status page",
    showMetrics: data.showMetrics ?? true,
    showCpu: data.showCpu ?? true,
    showRam: data.showRam ?? true,
    showNetwork: data.showNetwork ?? true,
    showBanner: data.showBanner ?? true,
    showHistory: data.showHistory ?? true,
    showRecentHistory: data.showRecentHistory ?? true,
    config: data.config || {},
    monitorIds: Array.isArray(data.monitorIds) ? data.monitorIds : [],
  };

  current.statusPages.push(page);
  return clone(page);
}

export function updateDemoStatusPage(id: string, data: any) {
  const current = ensureState();
  const pageIndex = current.statusPages.findIndex((p) => p.id === id);
  if (pageIndex === -1) return null;

  const existing = current.statusPages[pageIndex];
  const updated: DemoStatusPage = {
    ...existing,
    slug: data.slug ?? existing.slug,
    title: data.name ?? data.title ?? existing.title,
    description: data.description ?? existing.description,
    showMetrics: data.showMetrics ?? existing.showMetrics,
    showCpu: data.showCpu ?? existing.showCpu,
    showRam: data.showRam ?? existing.showRam,
    showNetwork: data.showNetwork ?? existing.showNetwork,
    showBanner: data.showBanner ?? existing.showBanner,
    showHistory: data.showHistory ?? existing.showHistory,
    showRecentHistory: data.showRecentHistory ?? existing.showRecentHistory,
    config: data.config ?? existing.config,
    monitorIds: Array.isArray(data.monitorIds) ? data.monitorIds : existing.monitorIds,
  };

  current.statusPages[pageIndex] = updated;
  return clone(updated);
}

export function deleteDemoStatusPage(id: string) {
  const current = ensureState();
  const page = current.statusPages.find((p) => p.id === id);
  if (!page) return null;
  current.statusPages = current.statusPages.filter((p) => p.id !== id);
  return clone(page);
}

export async function checkDemoMonitorNow(monitorId: string): Promise<{ success: boolean; data?: ServiceInfo[]; monitorName?: string; error?: string }> {
  const current = ensureState();
  const monitor = current.monitors.find((m) => m.id === monitorId);
  if (!monitor) return { success: false, error: "Monitor not found" };

  try {
    const config = parseMonitorConfig(monitor.config);
    const data = await fetchCoreStatus(monitor.type, {
      alias: monitor.name,
      ...config,
      url: monitor.url,
      method: monitor.method,
    });

    monitor.lastStatus = data.every((item) => item.status === "running") ? "running" : "degraded";
    monitor.updatedAt = new Date();
    recordMetricPoint(monitor.id, data);

    return { success: true, data, monitorName: monitor.name };
  } catch (error: any) {
    const data: ServiceInfo[] = [
      {
        id: "demo-endpoint",
        name: monitor.name,
        type: String(monitor.type || "http").toLowerCase(),
        status: "error",
        details: {
          error: error?.message || "Request failed",
          lastCheck: new Date().toISOString(),
        },
      },
    ];

    monitor.lastStatus = "error";
    monitor.updatedAt = new Date();
    recordMetricPoint(monitor.id, data);

    return { success: true, data, monitorName: monitor.name };
  }
}

export function getDemoMonitorHistory(monitorId: string, limit = 50) {
  const current = ensureState();
  const points = current.metricsByMonitor.get(monitorId) || [];
  return clone(points.slice(-Math.max(1, limit)));
}

export function getDemoMonitorUptimeHistory(monitorId: string, days = 30) {
  const current = ensureState();
  const points = current.metricsByMonitor.get(monitorId) || [];

  const byDate = new Map<string, ServiceInfo[][]>();
  for (const point of points) {
    const key = point.timestamp.toISOString().split("T")[0];
    const existing = byDate.get(key) || [];
    existing.push(point.data);
    byDate.set(key, existing);
  }

  const history: Array<{ date: string; status: "operational" | "outage" | "no-data" }> = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    const dayPoints = byDate.get(key) || [];

    if (dayPoints.length === 0) {
      history.push({ date: key, status: "no-data" });
      continue;
    }

    const hasOutage = dayPoints.some((services) => services.some((s) => s.status !== "running"));
    history.push({ date: key, status: hasOutage ? "outage" : "operational" });
  }

  return history.reverse();
}

export function getDemoMonitorUptimeStats(monitorId: string) {
  const current = ensureState();
  const points = current.metricsByMonitor.get(monitorId) || [];
  const now = Date.now();

  const within = (ms: number) => points.filter((point) => now - point.timestamp.getTime() <= ms);

  const calculate = (subset: DemoMetricPoint[]) => {
    if (subset.length === 0) return 100;
    const ok = subset.filter((point) => point.data.every((item) => item.status === "running")).length;
    return (ok / subset.length) * 100;
  };

  return {
    uptime24h: calculate(within(24 * 60 * 60 * 1000)),
    uptime30d: calculate(within(30 * 24 * 60 * 60 * 1000)),
  };
}
