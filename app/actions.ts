"use server";

import { ServiceInfo, MonitorMetadata } from "@/lib/monitoring/types";
import { fetchCoreStatus, getAvailableMonitorTypes } from "@/lib/monitoring/core-engine";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { getSystemSetting, setSystemSetting, isDemoMode } from "@/lib/settings";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getDashboardData() {
  if (isDemoMode()) {
    return {
      monitors: [], // Client will load from demo-client
      monitorTypes: await getAvailableMonitorTypes(),
      orgName: "Overseer Demo",
      notificationChannels: []
    };
  }
  const [monitors, monitorTypes, orgName, notificationChannels] = await Promise.all([
    getServiceMonitors(),
    getAvailableMonitorTypes(),
    getOrganizationName(),
    getNotificationChannels()
  ]);

  return {
    monitors,
    monitorTypes,
    orgName,
    notificationChannels
  };
}

export async function checkDatabaseReady() {
  if (isDemoMode()) return { ready: true, isDemo: true };
  try {
    await db.user.count();
    return { ready: true };
  } catch (error: any) {
    return { ready: false, error: error.code === 'P2021' ? 'setup_required' : error.message };
  }
}

export async function getIsDemoMode() {
  return isDemoMode();
}

export async function getOrganizationName() {
  if (isDemoMode()) return "Overseer Demo";
  return await getSystemSetting("orgName", "Overseer");
}

export async function updateOrganizationName(name: string) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    await setSystemSetting("orgName", name);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update organization name" };
  }
}

export async function getTheme() {
  if (isDemoMode()) return "light";
  return await getSystemSetting("theme", "light");
}

export async function updateTheme(theme: "light" | "dark") {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    await setSystemSetting("theme", theme);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update theme" };
  }
}

export async function getDefaultPingInterval() {
  if (isDemoMode()) return 60;
  const val = await getSystemSetting("defaultPingInterval", "60");
  return parseInt(val, 10);
}

export async function updateDefaultPingInterval(interval: number) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    if (interval < 10 || interval > 60) {
      return { success: false, error: "Interval must be between 10 and 60 seconds" };
    }
    await setSystemSetting("defaultPingInterval", interval.toString());
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update default ping interval" };
  }
}

export async function probeMonitor(url: string) {
  if (!url) return { success: false, error: "URL is required" };
  
  // Normalize URL if protocol is missing
  let targetUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    targetUrl = `https://${url}`;
  }

  try {
    const start = Date.now();
    const response = await fetch(targetUrl, { 
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Overseer/1.0' },
      cache: 'no-store'
    });
    const latency = Date.now() - start;

    return {
      success: true,
      suggestions: {
        url: targetUrl,
        expectedStatus: response.status,
        method: 'GET',
        timeout: Math.max(2000, Math.min(10000, latency * 3)), // 3x the actual latency as buffer
        advancedSsl: targetUrl.startsWith('https://')
      }
    };
  } catch (err: any) {
    // If https fails, try http
    if (targetUrl.startsWith('https://')) {
        try {
            const httpUrl = targetUrl.replace('https://', 'http://');
            const start = Date.now();
            const response = await fetch(httpUrl, { method: 'GET', cache: 'no-store' });
            const latency = Date.now() - start;
            return {
                success: true,
                suggestions: {
                    url: httpUrl,
                    expectedStatus: response.status,
                    method: 'GET',
                    timeout: Math.max(2000, Math.min(10000, latency * 3)),
                    advancedSsl: false
                }
            };
        } catch (e) {}
    }
    return { success: false, error: "Failed to connect to target URL" };
  }
}

export async function login(username: string, password: string) {
  if (isDemoMode() && username === "demo" && password === "demo") {
    await createSession("demo-user", "demo");
    return { success: true };
  }
  try {
    const user = await db.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return { error: "Invalid credentials" };
    }

    await createSession(user.id, user.username);
    return { success: true };
  } catch (error) {
    return { error: "An unexpected error occurred" };
  }
}

export async function createAccount(data: any) {
  const { username, password, orgName } = data;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword
      }
    });

    if (orgName) {
      await setSystemSetting("orgName", orgName);
    }

    await createSession(user.id, user.username);
    return { success: true };
  } catch (error) {
    console.error("Failed to create account:", error);
    return { success: false, error: "Failed to create account" };
  }
}

export async function logout() {
  await deleteSession();
}

export async function getServiceMonitors() {
  return await db.serviceMonitor.findMany({
    orderBy: { order: "asc" },
  });
}

export async function addServiceMonitor(type: string, name: string, config: Record<string, any>) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const defaultInterval = await getDefaultPingInterval();
    const interval = config.interval ? parseInt(config.interval, 10) : defaultInterval;

    const monitor = await db.serviceMonitor.create({
      data: {
        type,
        name,
        config: JSON.stringify(config),
        url: config.url || null,
        method: config.method || "GET",
        interval: interval
      },
    });
    revalidatePath("/");
    return { success: true, monitor };
  } catch (error) {
    return { success: false, error: "Failed to create monitor" };
  }
}

export async function updateServiceMonitor(id: string, name: string, config: Record<string, any>) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const defaultInterval = await getDefaultPingInterval();
    const interval = config.interval ? parseInt(config.interval, 10) : defaultInterval;

    const monitor = await db.serviceMonitor.update({
      where: { id },
      data: {
        name,
        config: JSON.stringify(config),
        url: config.url || null,
        method: config.method || "GET",
        interval: interval
      },
    });
    revalidatePath("/");
    return { success: true, monitor };
  } catch (error) {
    return { success: false, error: "Failed to update monitor" };
  }
}

export async function deleteServiceMonitor(id: string) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    await db.serviceMonitor.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete monitor" };
  }
}

const lastFetchTimes = new Map<string, number>();
const RATE_LIMIT_MS = 2000;

export async function fetchMonitorStatus(monitorId: string) {
  if (isDemoMode()) {
    return {
      success: true,
      data: [{ 
        id: "demo-endpoint",
        name: "Demo Monitor",
        type: "http",
        status: 'running' as const, 
        metrics: {
          latency: Math.floor(Math.random() * 50) + 10
        },
        details: {
          lastCheck: new Date().toISOString()
        }
      }],
      monitorName: "Demo Monitor"
    };
  }
  const now = Date.now();
  const lastFetch = lastFetchTimes.get(monitorId) || 0;
  if (now - lastFetch < RATE_LIMIT_MS) {
    return { success: false, error: "Rate limited" };
  }
  lastFetchTimes.set(monitorId, now);

  const monitor = await db.serviceMonitor.findUnique({ where: { id: monitorId } });
  if (!monitor) return { success: false, error: "Monitor not found" };

  try {
    const config = JSON.parse(monitor.config);
    const data = await fetchCoreStatus(monitor.type, { 
      alias: monitor.name, 
      ...config, 
      url: monitor.url, 
      method: monitor.method 
    });
    
    await db.metric.create({
      data: {
        monitorId: monitor.id,
        data: JSON.stringify(data),
      }
    });

    return { success: true, data, monitorName: monitor.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMonitorUptimeStats(monitorId: string) {
  if (isDemoMode()) {
    return {
      uptime24h: 100,
      uptime30d: 99.98
    };
  }
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [last24h, last30d] = await Promise.all([
    db.metric.findMany({
      where: { monitorId, timestamp: { gte: dayAgo } },
      select: { data: true }
    }),
    db.metric.findMany({
      where: { monitorId, timestamp: { gte: thirtyDaysAgo } },
      select: { data: true }
    })
  ]);

  const calculateUptime = (metrics: any[]) => {
    if (metrics.length === 0) return 100;
    const running = metrics.filter(m => {
      try {
        const data = JSON.parse(m.data);
        const services = Array.isArray(data) ? data : [];
        return services.every((s: any) => s.status === 'running');
      } catch { return false; }
    }).length;
    return (running / metrics.length) * 100;
  };

  return {
    uptime24h: calculateUptime(last24h),
    uptime30d: calculateUptime(last30d)
  };
}

export async function getMonitorHistory(monitorId: string, limit = 50) {
  if (isDemoMode()) {
    // Return empty history or mock history for demo
    const history = [];
    const now = new Date();
    for (let i = 0; i < limit; i++) {
        const time = new Date(now.getTime() - i * 60000);
        history.push({
            timestamp: time,
            data: [{ 
                id: "demo-endpoint",
                name: "Demo Monitor",
                type: "http",
                status: 'running' as const, 
                metrics: {
                  latency: Math.floor(Math.random() * 50) + 10
                },
                details: {
                  lastCheck: time.toISOString()
                }
            }]
        });
    }
    return history.reverse();
  }
  try {
    const metrics = await db.metric.findMany({
      where: { monitorId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    return metrics.reverse().map(m => ({
      timestamp: m.timestamp,
      data: JSON.parse(m.data) as ServiceInfo[]
    }));
  } catch (error) {
    return [];
  }
}

export async function getMonitorUptimeHistory(monitorId: string, days = 30) {
  if (isDemoMode()) {
    const history = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        history.push({ 
            date: date.toISOString().split('T')[0], 
            status: 'operational' 
        });
    }
    return history.reverse();
  }
  const history = [];
  const now = new Date();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await db.metric.findMany({
    where: {
      monitorId,
      timestamp: { gte: startDate }
    },
    orderBy: { timestamp: 'asc' }
  });

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayMetrics = metrics.filter(m => m.timestamp.toISOString().split('T')[0] === dateStr);
    
    if (dayMetrics.length === 0) {
      history.push({ date: dateStr, status: 'no-data' });
      continue;
    }

    const hasOutage = dayMetrics.some(m => {
      try {
        const data = JSON.parse(m.data);
        const services = Array.isArray(data) ? data : [];
        return services.some((s: any) => s.status !== 'running');
      } catch { return true; }
    });

    history.push({ 
        date: dateStr, 
        status: hasOutage ? 'outage' : 'operational' 
    });
  }
  return history.reverse();
}

export async function getStatusPages() {
  if (isDemoMode()) {
    return [
      {
        id: "demo-sp",
        title: "Public Status",
        slug: "public",
        name: "Public Status",
        description: "Demo status page",
        showMetrics: true,
        showHistory: true,
        showBanner: true,
        showRecentHistory: true,
        showCpu: true,
        showRam: true,
        showNetwork: true,
        config: {} as any,
        monitorIds: ["demo-1", "demo-2"],
        monitors: [
            { id: "demo-1", name: "Main Website", type: "HTTP" },
            { id: "demo-2", name: "API Gateway", type: "HTTP" }
        ]
      }
    ];
  }
  const pages = await db.statusPage.findMany({
    include: { monitors: true },
  });
  return pages.map(p => ({
    ...p,
    name: p.title,
    monitorIds: p.monitors.map(m => m.id)
  }));
}

export async function getStatusPageBySlug(slug: string) {
  if (isDemoMode()) {
    return {
      id: "demo-sp",
      title: "Public Status",
      slug: slug,
      description: "Demo status page",
      showMetrics: true,
      showHistory: true,
      showBanner: true,
      showRecentHistory: true,
      showCpu: true,
      showRam: true,
      showNetwork: true,
      config: {} as any,
      monitors: [
        { id: "demo-1", name: "Main Website", type: "HTTP" },
        { id: "demo-2", name: "API Gateway", type: "HTTP" }
      ]
    };
  }
  return await db.statusPage.findUnique({
    where: { slug },
    include: { monitors: true },
  });
}

export async function createStatusPage(data: any) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const { name, slug, description, monitorIds, showMetrics, showHistory, showBanner, showRecentHistory } = data;
    const page = await db.statusPage.create({
      data: {
        title: name,
        slug,
        description,
        showMetrics: showMetrics ?? false,
        showHistory: showHistory ?? true,
        showBanner: showBanner ?? true,
        showRecentHistory: showRecentHistory ?? true,
        monitors: {
          connect: monitorIds.map((id: string) => ({ id }))
        }
      }
    });
    revalidatePath("/status-pages");
    revalidatePath("/s/" + slug);
    return { success: true, page };
  } catch (error) {
    console.error("Failed to create status page:", error);
    return { success: false, error: "Failed to create status page" };
  }
}

export async function updateStatusPage(id: string, data: any) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const { name, slug, description, monitorIds, showMetrics, showHistory, showBanner, showRecentHistory } = data;
    // Disconnect all and reconnect new ones to sync monitorIds
    await db.statusPage.update({
      where: { id },
      data: {
        monitors: {
          set: []
        }
      }
    });

    const page = await db.statusPage.update({
      where: { id },
      data: {
        title: name,
        slug,
        description,
        showMetrics: showMetrics ?? false,
        showHistory: showHistory ?? true,
        showBanner: showBanner ?? true,
        showRecentHistory: showRecentHistory ?? true,
        monitors: {
          connect: monitorIds.map((mid: string) => ({ id: mid }))
        }
      }
    });
    revalidatePath("/status-pages");
    revalidatePath("/s/" + slug);
    return { success: true, page };
  } catch (error) {
    console.error("Failed to update status page:", error);
    return { success: false, error: "Failed to update status page" };
  }
}

export async function deleteStatusPage(id: string) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const page = await db.statusPage.delete({ where: { id } });
    revalidatePath("/status-pages");
    revalidatePath("/s/" + page.slug);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete status page:", error);
    return { success: false, error: "Failed to delete status page" };
  }
}

export async function getNotificationChannels() {
  return await db.notificationChannel.findMany({
    include: { monitors: { select: { id: true } } }
  });
}

export async function createNotificationChannel(name: string, type: string, config: any) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    const channel = await db.notificationChannel.create({
      data: {
        name,
        type,
        config: JSON.stringify(config)
      }
    });
    revalidatePath("/settings");
    return { success: true, channel };
  } catch (error) {
    return { success: false, error: "Failed to create notification channel" };
  }
}

export async function deleteNotificationChannel(id: string) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    await db.notificationChannel.delete({ where: { id } });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete notification channel" };
  }
}

export async function updateMonitorNotificationChannels(monitorId: string, channelIds: string[]) {
  if (isDemoMode()) return { success: false, error: "Demo mode: Action disabled" };
  try {
    await db.serviceMonitor.update({
      where: { id: monitorId },
      data: {
        notificationChannels: {
          set: channelIds.map(id => ({ id }))
        }
      }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update monitor notifications" };
  }
}
