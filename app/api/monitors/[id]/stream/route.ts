import { NextRequest } from "next/server";
import { getExtension } from "@/app/extensions/loader";
import { db } from "@/lib/db";
import { ServiceInfo } from "@/app/extensions/types";

// Disable caching for SSE
export const dynamic = "force-dynamic";

// Stream interval in ms (1 second for near-realtime feel)
const STREAM_INTERVAL = 1000;

// Fetch monitor status (similar to fetchMonitorStatus action but without rate limiting)
async function fetchMonitorData(monitorId: string): Promise<{ success: boolean; data?: ServiceInfo[]; error?: string }> {
  const monitor = await db.serviceMonitor.findUnique({
    where: { id: monitorId },
  });
  if (!monitor) return { success: false, error: "Monitor not found" };

  const extension = await getExtension(monitor.extensionId);
  if (!extension) return { success: false, error: "Extension missing" };

  // Get global config
  const installedExt = await db.installedExtension.findUnique({
    where: { extensionId: monitor.extensionId },
  });
  const globalConfig = installedExt?.config
    ? JSON.parse(installedExt.config)
    : {};

  try {
    const monitorConfig = JSON.parse(monitor.config);
    const finalConfig = { ...globalConfig, ...monitorConfig };

    // Clean up empty values
    Object.keys(finalConfig).forEach((key) => {
      if (finalConfig[key] === "" || finalConfig[key] === null) {
        delete finalConfig[key];
        if (monitorConfig[key] === "" && globalConfig[key]) {
          finalConfig[key] = globalConfig[key];
        }
      }
    });

    const data = await extension.fetchStatus(finalConfig);

    // Save to database (don't block the stream)
    db.metric
      .create({
        data: {
          monitorId: monitor.id,
          data: JSON.stringify(data),
        },
      })
      .catch((err: unknown) => {
        // If monitor is deleted, ignore P2003 foreign key violation
        if ((err as any)?.code === 'P2003') return;
        console.error("Failed to save metrics:", err);
      });

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: monitorId } = await params;

  // Verify monitor exists
  const monitor = await db.serviceMonitor.findUnique({
    where: { id: monitorId },
  }).catch(() => null);

  if (!monitor) {
    return new Response("Monitor not found", { status: 404 });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      if (isClosed) return;

      // Send initial connection message
      try {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ monitorId, timestamp: Date.now() })}\n\n`)
        );
      } catch (e) { isClosed = true; return; }

      // Immediately fetch first data point
      if (!isClosed) {
        const initialResult = await fetchMonitorData(monitorId);
        if (isClosed) return;

        if (initialResult) {
          const eventData = JSON.stringify({
            timestamp: Date.now(),
            ...initialResult,
          });
          try {
            controller.enqueue(encoder.encode(`event: update\ndata: ${eventData}\n\n`));
          } catch(e) { isClosed = true; return; }
        }
      }

      // Set up interval for continuous updates
      intervalId = setInterval(async () => {
        if (isClosed) {
          if (intervalId) clearInterval(intervalId);
          return;
        }

        try {
          const result = await fetchMonitorData(monitorId);
          
          if (!result.success && result.error === "Monitor not found") {
            isClosed = true;
            if (intervalId) clearInterval(intervalId);
            try { controller.close(); } catch(e) {}
            return;
          }

          if (isClosed) return;

          const eventData = JSON.stringify({
            timestamp: Date.now(),
            ...result,
          });
          controller.enqueue(encoder.encode(`event: update\ndata: ${eventData}\n\n`));
        } catch (error) {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "Fetch failed" })}\n\n`)
            );
          } catch (e) {
            isClosed = true;
            if (intervalId) clearInterval(intervalId);
          }
        }
      }, STREAM_INTERVAL);
    },

    cancel() {
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
