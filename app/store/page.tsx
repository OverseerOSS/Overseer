"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Sidebar } from "../components/Sidebar";
import { ShoppingBag, Download, Check, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { fetchMarketplacePlugins, MarketplacePlugin } from "./actions";
import { getOrganizationName, logout } from "../actions";

export default function ExtensionStorePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-black uppercase tracking-widest">Loading Store...</div>}>
      <StoreContent />
    </Suspense>
  );
}

function StoreContent() {
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
    <div className="flex h-screen bg-white">
      <Sidebar 
        monitors={[]} 
        orgName={orgName}
        selectedMonitorId={undefined} 
        onLogout={logout} 
      />

      <div className="flex-1 ml-64 p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-12 border-b-4 border-black pb-8">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-black uppercase tracking-tighter">Extension Store</h1>
                    <p className="text-black font-bold uppercase text-xs tracking-widest opacity-60">Discover and install new monitoring capabilities</p>
                </div>
            </div>
            <a 
                href="https://github.com/OverseerOSS/plugins" 
                target="_blank"
                className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:underline"
            >
                <ExternalLink className="w-4 h-4" />
                Contribute
            </a>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-black">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-black uppercase tracking-widest">Fetching latest extensions...</p>
            </div>
        ) : plugins.length === 0 ? (
            <div className="border-4 border-black p-12 text-center text-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <ShoppingBag className="w-16 h-16 mx-auto mb-6" />
                <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Unavailable</h3>
                <p className="font-bold opacity-60 mb-6">Could not fetch extensions from the repository.</p>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-black text-white font-black uppercase tracking-widest hover:bg-white hover:text-black border-2 border-black transition-all">Retry</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {plugins.map(plugin => (
                    <div key={plugin.id} className="bg-white border-4 border-black p-6 flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-black text-black uppercase tracking-tighter mb-1">{plugin.name}</h3>
                                <div className="text-xs font-bold uppercase tracking-widest opacity-60">by {plugin.author} • v{plugin.version}</div>
                            </div>
                            {plugin.isInstalled ? (
                                <span className="bg-black text-white text-[10px] px-2 py-1 font-black uppercase tracking-widest flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Installed
                                </span>
                            ) : (
                                <span className="border-2 border-black text-black text-[10px] px-2 py-1 font-black uppercase tracking-widest">
                                    Free
                                </span>
                            )}
                        </div>
                        
                        <p className="text-sm font-bold text-black mb-8 flex-1 line-clamp-3 leading-tight uppercase opacity-80">
                            {plugin.description}
                        </p>

                        <div className="flex items-center gap-3 pt-6 border-t-2 border-black">
                            {plugin.isInstalled ? (
                                <button disabled className="flex-1 py-3 bg-gray-100 text-black/30 border-2 border-black/10 font-black uppercase tracking-widest text-xs cursor-not-allowed uppercase font-bold">
                                    Installed
                                </button>
                            ) : plugin.isLocal ? (
                              <Link 
                                  href={`/settings?tab=extension&id=${plugin.id}`}
                                  className="flex-1 py-3 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors"
                              >
                                  <RefreshCw className="w-4 h-4" />
                                  Enable
                              </Link>
                            ) : (
                                <a 
                                    href={plugin.url}
                                    target="_blank"
                                    className="flex-1 py-3 bg-black text-white border-2 border-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-white hover:text-black transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Install
                                </a>
                            )}
                            <a 
                                href={plugin.url === "#" ? "https://github.com/OverseerOSS/plugins" : plugin.url}
                                target="_blank"
                                className="p-3 border-2 border-black hover:bg-black hover:text-white transition-colors"
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
