"use server";

import { db } from "@/lib/db";
import { ServiceInfo } from "@/app/extensions/types";

export interface PublicMonitorStatus {
  id: string;
  name: string;
  updatedAt: Date;
  services: ServiceInfo[];
  isOnline: boolean;
}

export interface StatusPageData {
  title: string;
  description: string | null;
  monitors: PublicMonitorStatus[];
}

export async function getStatusPage(slug?: string): Promise<StatusPageData | null> {
  // If slug is provided, fetch specific page. If not, return default (all monitors, or maybe we shouldn't have a default anymore?)
  // For backward compatibility and the "main" /status page, we can treat no-slug as "everything" or a specific "default" page.
  // The user asked for "individual status pages", so /status might be an index or the "main" one.

  let monitors;
  let title = "System Status";
  let description = "Current status of all services";

  if (slug) {
    const page = await db.statusPage.findUnique({
      where: { slug },
      include: {
        monitors: {
          include: {
            metrics: {
              orderBy: { timestamp: "desc" },
              take: 1,
            },
          },
          orderBy: [
            { order: "asc" },
            { createdAt: "desc" },
          ],
        },
      },
    });

    if (!page) return null;
    monitors = page.monitors;
    title = page.title;
    description = page.description || null;
  } else {
    // Default behavior: fetch all monitors
    monitors = await db.serviceMonitor.findMany({
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        metrics: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });
  }

  const processedMonitors = monitors.map((monitor) => {
    const latestMetric = monitor.metrics[0];
    let services: ServiceInfo[] = [];
    let isOnline = false;

    if (latestMetric) {
      try {
        services = JSON.parse(latestMetric.data);
        isOnline = true;
      } catch (e) {
        console.error("Failed to parse metric data", e);
      }
    }

    return {
      id: monitor.id,
      name: monitor.name,
      updatedAt: latestMetric ? latestMetric.timestamp : monitor.updatedAt,
      services,
      isOnline,
    };
  });

  return {
    title,
    description,
    monitors: processedMonitors,
  };
} 

// Admin Actions
export async function createStatusPage(data: { slug: string; title: string; description?: string; monitorIds: string[] }) {
  try {
    const existing = await db.statusPage.findUnique({ where: { slug: data.slug } });
    if (existing) return { success: false, error: "Slug already exists" };

    await db.statusPage.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        monitors: {
          connect: data.monitorIds.map(id => ({ id })),
        },
      },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create status page" };
  }
}

export async function deleteStatusPage(slug: string) {
  try {
    await db.statusPage.delete({ where: { slug } });
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete status page" };
  }
}

export async function getStatusPagesList() {
    return await db.statusPage.findMany();
}

