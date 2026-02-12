"use server";

import { getExtension, loadExtensions } from "./extensions/loader";
import { ServiceInfo, ExtensionMetadata } from "./extensions/types";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { getSystemSetting, setSystemSetting } from "@/lib/settings";

export async function getDashboardData() {
  const [monitors, installedExtensions, allExtensions, orgName] = await Promise.all([
    getServiceMonitors(),
    getInstalledExtensions(),
    getAvailableExtensionsMetadata(),
    getOrganizationName()
  ]);

  return {
    monitors,
    installedExtensions,
    allExtensions,
    orgName
  };
}

export async function checkDatabaseReady() {
  try {
    await db.user.count();
    return { ready: true };
  } catch (error: any) {
    // P2021: Table does not exist
    return { ready: false, error: error.code === 'P2021' ? 'setup_required' : error.message };
  }
}

export async function getOrganizationName() {
  return await getSystemSetting("orgName", "Overseer");
}

export async function updateOrganizationName(name: string) {
  try {
    await setSystemSetting("orgName", name);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update organization name" };
  }
}

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// --- Auth Actions ---

export async function login(username: string, password: string) {
  const userCount = await db.user.count();
  if (userCount === 0) {
    return {
      success: false,
      error: "No users exist. Please create an account.",
    };
  }

  const user = await db.user.findUnique({ where: { username } });

  if (!user) {
    return { success: false, error: "Invalid credentials" };
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return { success: false, error: "Invalid credentials" };
  }

  await createSession(user.id, user.username);
  return { success: true };
}

export async function createAccount(username: string, password: string) {
  const userCount = await db.user.count();
  if (userCount > 0) {
    return { success: false, error: "System already setup. Please login." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: { username, password: passwordHash },
  });

  await createSession(user.id, user.username);
  return { success: true };
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

// --- Extension Management (Settings) ---

export async function toggleExtensionInstall(
  extensionId: string,
  install: boolean
) {
  try {
    if (install) {
      await db.installedExtension.upsert({
        where: { extensionId },
        update: {},
        create: { extensionId },
      });
    } else {
      await db.installedExtension.deleteMany({
        where: { extensionId },
      });
    }
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update extension status" };
  }
}

export async function getAvailableExtensionsMetadata(): Promise<ExtensionMetadata[]> {
  const exts = await loadExtensions();
  return exts.map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
    configSchema: e.configSchema,
  }));
}

export async function getInstalledExtensions() {
  const installed = await db.installedExtension.findMany();
  return installed.map(i => i.extensionId);
}

// --- Monitor Management (Dashboard) ---

export async function addServiceMonitor(
  extensionId: string,
  name: string,
  config: Record<string, any>
) {
  try {
    // Find the extension
    const extension = await getExtension(extensionId);
    if (!extension) {
      return { success: false, error: "Extension not found" };
    }

    // Call extension's prepareConfig lifecycle hook if it exists
    let metadata: Record<string, any> | undefined;
    if (extension.prepareConfig) {
      const prepared = await extension.prepareConfig(config);
      config = prepared.config;
      metadata = prepared.metadata;
    }

    const configStr = JSON.stringify(config);
    const monitor = await db.serviceMonitor.create({
      data: {
        name,
        extensionId,
        config: configStr,
      },
    });

    revalidatePath("/");

    return {
      success: true,
      monitorId: monitor.id,
      metadata, // Return metadata from prepareConfig (e.g., publicKey for display)
    };
  } catch (error) {
    return { success: false, error: "Failed to add service monitor" };
  }
}

export async function deleteServiceMonitor(id: string) {
  try {
    await db.serviceMonitor.delete({ where: { id } });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete monitor" };
  }
}

export async function getServiceMonitors() {
  const monitors = await db.serviceMonitor.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });
  return monitors;
}

export async function reorderMonitor(monitorId: string, direction: "up" | "down") {
  const monitor = await db.serviceMonitor.findUnique({ where: { id: monitorId } });
  if (!monitor) return { success: false };

  const allMonitors = await db.serviceMonitor.findMany({
    orderBy: [
      { order: "asc" },
      { createdAt: "desc" },
    ],
  });

  const index = allMonitors.findIndex((m) => m.id === monitorId);
  if (index === -1) return { success: false };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= allMonitors.length) return { success: false };

  const target = allMonitors[swapIndex];

  // If both have default 0 or same order, we need to re-index everything to ensure stability
  const updates = [];
  
  // Create a new ordered list with the swap
  const newOrder = [...allMonitors];
  newOrder[index] = target;
  newOrder[swapIndex] = monitor;

  // Update all monitors with their new index
  for (let i = 0; i < newOrder.length; i++) {
    updates.push(
      db.serviceMonitor.update({
        where: { id: newOrder[i].id },
        data: { order: i },
      })
    );
  }

  await db.$transaction(updates);
  revalidatePath("/");
  return { success: true };
}

// --- Data Fetching ---

// Rate limiting: track last fetch time per monitor
const lastFetchTimes = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 second minimum between fetches

export async function fetchMonitorStatus(monitorId: string) {
  // Rate limiting check
  const now = Date.now();
  const lastFetch = lastFetchTimes.get(monitorId) || 0;
  if (now - lastFetch < RATE_LIMIT_MS) {
    return {
      success: false,
      error: "Rate limited. Please wait before fetching again.",
    };
  }
  lastFetchTimes.set(monitorId, now);

  const monitor = await db.serviceMonitor.findUnique({
    where: { id: monitorId },
  });
  if (!monitor) return { success: false, error: "Monitor not found" };

  const extension = await getExtension(monitor.extensionId);
  if (!extension) return { success: false, error: "Extension missing" };

  // Check for Global Config
  const installedExt = await db.installedExtension.findUnique({
    where: { extensionId: monitor.extensionId },
  });
  const globalConfig = installedExt?.config
    ? JSON.parse(installedExt.config)
    : {};

  try {
    const monitorConfig = JSON.parse(monitor.config);
    // Merge: Monitor config takes precedence OVER global? Or Global over Monitor?
    // Typically: Global fills gaps. Monitor overrides.
    const finalConfig = { ...globalConfig, ...monitorConfig };

    // Remove keys that are empty strings if they exist in both (cleanup)
    Object.keys(finalConfig).forEach(key => {
      if (finalConfig[key] === "" || finalConfig[key] === null) {
        delete finalConfig[key];
        // If global had it, restore it? No, spread operator handles overwrite.
        // But if monitorConfig has "apiKey": "" (empty), we might want to fallback to global?
        // Let's explicitly check:
        if (monitorConfig[key] === "" && globalConfig[key]) {
          finalConfig[key] = globalConfig[key];
        }
      }
    });

    const data = await extension.fetchStatus(finalConfig);

    // Save metrics to database (fire and forget / side effect)
    // We don't await this to keep response fast, but in serverless/lambdas this might be risky.
    // Given this is a VPS/Node env, it's generally okay, but safer to await or use waitUntil if available.
    // For now, we await it to ensure it's saved.
    try {
        await db.metric.create({
            data: {
                monitorId: monitor.id,
                data: JSON.stringify(data),
            }
        });
        
        // Optional: Prune old metrics? Maybe keep last 24h?
        // Doing this on every write is expensive. A cron job would be better.
    } catch (err) {
        console.error("Failed to save metrics:", err);
    }

    return { success: true, data, monitorName: monitor.name };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMonitorHistory(monitorId: string, limit = 50) {
    try {
        const metrics = await db.metric.findMany({
            where: { monitorId },
            orderBy: { timestamp: 'desc' },
            take: limit
        });
        
        // Return in ascending order for graphing
        return metrics.reverse().map(m => ({
            timestamp: m.timestamp,
            data: JSON.parse(m.data) as ServiceInfo[]
        }));
    } catch (error) {
        console.error("Failed to fetch history:", error);
        return [];
    }
}

export async function testMonitorConnection(monitorId: string) {
  try {
    const monitor = await db.serviceMonitor.findUnique({
      where: { id: monitorId },
    });
    if (!monitor) {
      return { success: false, error: "Monitor not found" };
    }

    const extension = await getExtension(monitor.extensionId);
    if (!extension) {
      return { success: false, error: "Extension not found" };
    }

    // Check if extension supports connection testing
    if (!extension.testConnection) {
      return {
        success: false,
        error: "This extension does not support connection testing",
      };
    }

    const config = JSON.parse(monitor.config);
    const result = await extension.testConnection(config);

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Global Configuration ---

export async function saveGlobalConfig(
  extensionId: string,
  config: Record<string, any>
) {
  try {
    const configStr = JSON.stringify(config);
    await db.installedExtension.update({
      where: { extensionId },
      data: { config: configStr },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to save global config" };
  }
}

export async function getGlobalConfig(extensionId: string) {
  const ext = await db.installedExtension.findUnique({
    where: { extensionId },
  });
  if (ext?.config) {
    return JSON.parse(ext.config);
  }
  return {};
}
