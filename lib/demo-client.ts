"use client";

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
