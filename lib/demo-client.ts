"use client";

import type { ServiceInfo } from "@/lib/monitoring/types";

// Initial mock data for the demo
const INITIAL_MONITORS = [
  {
    id: "demo-1",
    name: "Main Website",
    type: "HTTP",
    url: "https://example.com",
    method: "GET",
    interval: 60,
    config: JSON.stringify({ url: "https://example.com" }),
    order: 0,
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
  }
];

const INITIAL_STATUS_PAGES = [
  {
    id: "sp-1",
    title: "Public Status",
    slug: "public",
    description: "Real-time status of our public services",
    showMetrics: true,
    showHistory: true,
    showBanner: true,
    showRecentHistory: true,
    monitorIds: ["demo-1", "demo-2"]
  }
];

export function getDemoMonitors() {
  if (typeof window === "undefined") return INITIAL_MONITORS;
  const stored = localStorage.getItem("demo_monitors");
  return stored ? JSON.parse(stored) : INITIAL_MONITORS;
}

export function saveDemoMonitors(monitors: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("demo_monitors", JSON.stringify(monitors));
}

export function getDemoStatusPages() {
  if (typeof window === "undefined") return INITIAL_STATUS_PAGES;
  const stored = localStorage.getItem("demo_status_pages");
  return stored ? JSON.parse(stored) : INITIAL_STATUS_PAGES;
}

export function saveDemoStatusPages(pages: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("demo_status_pages", JSON.stringify(pages));
}

export function getDemoOrgName() {
  if (typeof window === "undefined") return "Overseer Demo";
  return localStorage.getItem("demo_org_name") || "Overseer Demo";
}

export function saveDemoOrgName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("demo_org_name", name);
}

function parseConfig(raw: unknown): Record<string, any> {
  if (!raw || typeof raw !== "string") return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function fetchDemoMonitorStatus(monitor: any): Promise<ServiceInfo[]> {
  const monitorType = String(monitor?.type || "").toLowerCase();
  const config = parseConfig(monitor?.config);

  if (monitorType === "http" || monitorType === "https") {
    const url = monitor?.url || config.url;
    const method = config.method || monitor?.method || "GET";
    const expectedStatus = Number(config.expectedStatus ?? 200);
    const timeout = Number(config.timeout ?? 10000);

    if (!url) return [];

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow"
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      const isOperational = response.status === expectedStatus;

      return [{
        id: "endpoint",
        name: monitor?.name || url,
        type: "http",
        status: isOperational ? "running" : "degraded",
        metrics: {
          latency,
          status: response.status
        },
        details: {
          url,
          method,
          latency: `${latency}ms`,
          statusCode: response.status,
          expectedStatus,
          statusText: response.statusText,
          checkTime: new Date().toISOString(),
          advancedSsl: Boolean(config.advancedSsl)
        }
      }];
    } catch (error: any) {
      const latency = Date.now() - start;
      return [{
        id: "endpoint",
        name: monitor?.name || url,
        type: "http",
        status: "error",
        metrics: {
          latency
        },
        details: {
          url,
          method,
          latency: `${latency}ms`,
          error: error?.name === "AbortError" ? "Timeout" : (error?.message || "Request failed")
        }
      }];
    }
  }

  if (monitorType === "ping") {
    const host = monitor?.url || config.url;
    const latency = Math.floor(Math.random() * 40) + 10;
    return [{
      id: "host",
      name: monitor?.name || host || "Ping Monitor",
      type: "ping",
      status: "running",
      metrics: { latency },
      details: { host, latency: `${latency}ms` }
    }];
  }

  return [{
    id: "demo-resource",
    name: monitor?.name || "Demo Monitor",
    type: monitorType || "http",
    status: "running",
    metrics: {},
    details: {
      note: "Demo monitor type simulated"
    }
  } as ServiceInfo];
}
