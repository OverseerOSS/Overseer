export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackgroundMonitoring } = await import("@/lib/monitor-worker");
    
    // Check if we are in a dev environment to avoid multiple intervals with Fast Refresh
    if (process.env.NODE_ENV === "development") {
        if (!(global as any)._overseerWorkerStarted) {
            (global as any)._overseerWorkerStarted = true;
            startBackgroundMonitoring(5000); // 5 seconds tick
        }
    } else {
        startBackgroundMonitoring(5000); // 5 seconds tick
    }
  }
}
