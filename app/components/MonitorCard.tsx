"use client";

import { memo, useState, useEffect, useRef, useMemo } from "react";
import { ServiceInfo, ExtensionMetadata } from "../extensions/types";
import { getMonitorHistory } from "../actions";
import { getExtensionCard } from "../extensions/registry";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";

interface MonitorCardProps {
  monitor: {
    id: string;
    name: string;
    extensionId: string;
  };
  extension?: ExtensionMetadata;
  onDelete: (id: string) => void;
}

export const MonitorCard = memo(function MonitorCard({
  monitor,
  extension,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MonitorCardProps & { 
  onMoveUp?: () => void; 
  onMoveDown?: () => void; 
}) {
  const [state, setState] = useState<{
    loading: boolean;
    data?: ServiceInfo[];
    error?: string;
  }>({ loading: true });
  const [history, setHistory] = useState<{ timestamp: number; data: any }[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  const ExtensionCard = useMemo(() => getExtensionCard(monitor.extensionId), [monitor.extensionId]);

  const handleUpdate = (data: ServiceInfo[]) => {
    setState({
      loading: false,
      data,
      error: undefined,
    });

    if (data && data.length > 0) {
      const mainService = data[0]; 

      setHistory(prev => {
        const next = [...prev, { timestamp: Date.now(), data: mainService }];
        if (next.length > 100) return next.slice(-100);
        return next;
      });
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const hist = await getMonitorHistory(monitor.id);
        if (hist && hist.length > 0) {
          const points = hist.map((h: any) => {
            const services = h.data as ServiceInfo[];
            const s = services.find((x) => x.type === monitor.extensionId) || services[0];
            return { timestamp: new Date(h.timestamp).getTime(), data: s };
          });
          setHistory(points);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    
    loadHistory();
  }, [monitor.id, monitor.extensionId]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/monitors/${monitor.id}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      setConnected(true);
    });

    eventSource.addEventListener('update', (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result.success && result.data) {
          handleUpdate(result.data);
        } else if (result.error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: result.error,
          }));
        }
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    });

    eventSource.addEventListener('error', () => {
      setConnected(false);
      setState(prev => ({
        ...prev,
        loading: false,
        error: prev.error || "Connection lost",
      }));
    });

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [monitor.id]);
  
  return (
    <div className="border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-700">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">
              {monitor.name}
            </h3>
            <span className="text-xs px-2.5 py-1 rounded-full border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
              {extension?.name || monitor.extensionId}
            </span>
          </div>
          <div className="text-xs">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
              connected 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
              }`} />
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-4">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-200 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded transition-colors"
              title="Move Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-200 dark:hover:bg-slate-800 dark:hover:text-slate-300 rounded transition-colors"
              title="Move Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(monitor.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        {state.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-xs text-slate-600 dark:text-slate-400">Loading...</p>
            </div>
          </div>
        ) : state.error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {state.error}
            </p>
          </div>
        ) : (
          <div>
            {state.data?.map((service) => (
              <div key={service.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {service.name}
                  </div>
                  <div className="text-sm">
                    {service.status === "running" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Running
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {service.status}
                      </span>
                    )}
                  </div>
                </div>
                
                <ExtensionCard service={service} history={history} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.monitor.id === nextProps.monitor.id &&
    prevProps.monitor.name === nextProps.monitor.name &&
    prevProps.extension?.id === nextProps.extension?.id
  );
});
