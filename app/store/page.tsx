"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "../components/Sidebar";
import { ShoppingBag, Download, Check, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { fetchMarketplacePlugins, MarketplacePlugin } from "./actions";
import { getOrganizationName, logout } from "../actions";

export default function ExtensionStorePage() {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [orgName, setOrgName] = useState("Overseer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
        getOrganizationName(),
        fetchMarketplacePlugins()
    ]).then(([org, list]) => {
        setOrgName(org);
        setPlugins(list);
        setLoading(false);
    });
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        monitors={[]} 
        orgName={orgName}
        selectedMonitorId={undefined} 
        onLogout={logout} 
      />

      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Extension Store</h1>
                    <p className="text-gray-500">Discover and install new monitoring capabilities</p>
                </div>
            </div>
            <a 
                href="https://github.com/OverseerOSS/plugins" 
                target="_blank"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
            >
                <ExternalLink className="w-4 h-4" />
                Contribute
            </a>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p>Fetching latest extensions...</p>
            </div>
        ) : plugins.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-500 bg-white">
                <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Unavailable</h3>
                <p>Could not fetch extensions from the repository.</p>
                <button onClick={() => window.location.reload()} className="mt-4 text-blue-600 hover:underline">Retry</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {plugins.map(plugin => (
                    <div key={plugin.id} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col hover:border-blue-300 transition-colors shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900">{plugin.name}</h3>
                                <div className="text-xs text-gray-500">by {plugin.author} • v{plugin.version}</div>
                            </div>
                            {plugin.isInstalled ? (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Installed
                                </span>
                            ) : (
                                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">
                                    Free
                                </span>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-6 flex-1 line-clamp-3">
                            {plugin.description}
                        </p>

                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                            {plugin.isInstalled ? (
                                <button disabled className="flex-1 py-2 bg-gray-100 text-gray-400 rounded-lg font-medium text-sm cursor-not-allowed">
                                    Installed
                                </button>
                            ) : (
                                <a 
                                    href={plugin.url}
                                    target="_blank"
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Install
                                </a>
                            )}
                            <a 
                                href={plugin.url}
                                target="_blank"
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="View Source"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
