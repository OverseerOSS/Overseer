"use client";

import { useState, useEffect } from "react";
import { getNotificationChannels, createNotificationChannel, deleteNotificationChannel } from "../actions";
import { Bell, Trash2, Plus, Check, Info } from "lucide-react";

export function NotificationsSettings() {
  const [channels, setChannels] = useState<any[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    const data = await getNotificationChannels();
    setChannels(data);
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName || !webhookUrl) return;

    setIsSubmitting(true);
    setError("");

    const result = await createNotificationChannel(newChannelName, "discord", { webhookUrl });
    setIsSubmitting(false);

    if (result.success) {
      setNewChannelName("");
      setWebhookUrl("");
      loadChannels();
    } else {
      setError(result.error || "Failed to add channel");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteNotificationChannel(id);
    if (result.success) {
      loadChannels();
    }
  };

  return (
    <div className="space-y-12">
      <div>
        <label className="block text-xs font-black mb-4 uppercase tracking-widest text-black dark:text-white flex items-center gap-2">
          <Bell className="w-4 h-4" /> Add Discord Webhook
        </label>
        <form onSubmit={handleAddChannel} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              value={newChannelName} 
              onChange={(e) => setNewChannelName(e.target.value)}
              className="px-6 py-5 bg-white dark:bg-black border-2 border-black dark:border-white font-bold uppercase tracking-widest text-sm focus:outline-none focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black transition-colors text-black dark:text-white"
              placeholder="CHANNEL NAME (E.G. TEAM ALERTS)"
              required
            />
            <input 
              type="url" 
              value={webhookUrl} 
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="px-6 py-5 bg-white dark:bg-black border-2 border-black dark:border-white font-bold tracking-widest text-sm focus:outline-none focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black transition-colors text-black dark:text-white"
              placeholder="https://discord.com/api/webhooks/..."
              required
            />
          </div>
          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black dark:bg-white text-white dark:text-black px-10 py-6 font-black uppercase tracking-widest text-xs hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white border-2 border-black dark:border-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center gap-4"
          >
            <Plus className="w-5 h-5" />
            {isSubmitting ? 'ADDING...' : 'ADD DISCORD CHANNEL'}
          </button>
        </form>
      </div>

      <div className="pt-12 border-t-2 border-black dark:border-white">
        <label className="block text-xs font-black mb-8 uppercase tracking-widest text-black dark:text-white">Active Channels</label>
        {channels.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-black/20 dark:border-white/20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 dark:text-white/40 italic">No notification channels configured yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {channels.map((channel) => (
              <div key={channel.id} className="p-8 border-2 border-black dark:border-white flex items-center justify-between group hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center group-hover:bg-white dark:group-hover:bg-black group-hover:text-black dark:group-hover:text-white border-2 border-black dark:border-white transition-all">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-widest text-lg">{channel.name}</h3>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Discord Webhook</span>
                      <div className="w-1 h-1 bg-current rounded-full" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{channel.monitors.length} Monitors Linked</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(channel.id)}
                  className="p-4 border-2 border-black dark:border-white hover:bg-red-500 hover:text-white transition-all group-hover:border-white dark:group-hover:border-black"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 p-8 border-2 border-blue-500/20 rounded-sm flex gap-6">
        <Info className="w-6 h-6 text-blue-500 shrink-0" />
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">How it works</h4>
          <p className="text-[10px] font-bold tracking-widest text-blue-950/60 dark:text-blue-200/60 leading-relaxed uppercase">Notifications are sent automatically when a monitor's status changes (e.g., from Operational to Outage). You can link specific monitors to these channels in the dashboard.</p>
        </div>
      </div>
    </div>
  );
}
