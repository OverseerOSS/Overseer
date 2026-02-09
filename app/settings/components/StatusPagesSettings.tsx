"use client";

import { useEffect, useState } from "react";
import { createStatusPage, deleteStatusPage, getStatusPagesList } from "@/app/status/actions";
import { getServiceMonitors } from "@/app/actions";

export default function StatusPagesSettings() {
  const [pages, setPages] = useState<any[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Form
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    Promise.all([getStatusPagesList(), getServiceMonitors()])
      .then(([p, m]) => {
        setPages(p);
        setMonitors(m);
        setLoading(false);
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const result = await createStatusPage({
      slug: newSlug,
      title: newTitle,
      monitorIds: selectedMonitors,
    });
    
    if (result.success) {
      setNewSlug("");
      setNewTitle("");
      setSelectedMonitors([]);
      // Reload
      const updated = await getStatusPagesList();
      setPages(updated);
    } else {
      alert(result.error || "Failed");
    }
    setIsCreating(false);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Delete this status page?")) return;
    await deleteStatusPage(slug);
    setPages(pages.filter((p: any) => p.slug !== slug));
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold mb-4">Manage Status Pages</h2>
        <div className="space-y-4">
           {loading ? (
             <div>Loading...</div>
           ) : pages.length === 0 ? (
             <div className="p-4 border border-dashed rounded text-center text-gray-500">
               No public status pages created yet.
             </div>
           ) : (
             pages.map((page: any) => (
               <div key={page.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg">
                 <div>
                   <div className="font-semibold">{page.title}</div>
                   <div className="text-sm text-gray-500 font-mono">/status/{page.slug}</div>
                 </div>
                 <div className="flex gap-2">
                    <a 
                      href={`/status/${page.slug}`} 
                      target="_blank"
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 rounded"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDelete(page.slug)}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 rounded"
                    >
                      Delete
                    </button>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg border border-gray-200 dark:border-zinc-800">
        <h3 className="text-lg font-semibold mb-4">Create New Page</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Page Title</label>
            <input 
              required
              className="w-full p-2 rounded border dark:bg-zinc-950 dark:border-zinc-700" 
              placeholder="My Company Status"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL Slug</label>
            <div className="flex items-center">
               <span className="p-2 bg-gray-100 dark:bg-zinc-800 border border-r-0 border-gray-300 dark:border-zinc-700 rounded-l text-gray-500 text-sm">/status/</span>
               <input 
                 required
                 className="w-full p-2 rounded-r border dark:bg-zinc-950 dark:border-zinc-700" 
                 placeholder="public"
                 value={newSlug}
                 onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
               />
            </div>
            <p className="text-xs text-gray-500 mt-1">Letters, numbers, and hyphens only.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Monitors to Include</label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-white dark:bg-zinc-950 dark:border-zinc-700">
               {monitors.map((m: any) => (
                 <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded">
                   <input 
                     type="checkbox"
                     checked={selectedMonitors.includes(m.id)}
                     onChange={(e) => {
                       if (e.target.checked) setSelectedMonitors([...selectedMonitors, m.id]);
                       else setSelectedMonitors(selectedMonitors.filter(id => id !== m.id));
                     }}
                   />
                   <span className="text-sm">{m.name}</span>
                 </label>
               ))}
            </div>
          </div>

          <button 
            disabled={isCreating}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "Create Status Page"}
          </button>
        </form>
      </div>
    </div>
  );
}
