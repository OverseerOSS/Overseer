"use client";

import { useState } from "react";
import { createAdminUser, runMigration, installDefaultPlugins } from "./actions";
import { ArrowRight, CheckCircle, Database, Download, Shield, Server, Loader2 } from "lucide-react";

type SetupStep = "welcome" | "migration" | "account" | "plugins" | "finish";

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>("welcome");
  
  // Account Form State
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState(""); // New state
  
  // Status State
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [migrationLog, setMigrationLog] = useState("");
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);

  // --- Handlers ---

  const startSetup = () => {
    setStep("migration");
    handleMigration();
  };

  const handleMigration = async () => {
    setIsLoading(true);
    setMigrationLog("Running database migrations...");
    setError("");

    try {
      // Small delay for UI smoothness
      await new Promise(r => setTimeout(r, 800));
      
      const result = await runMigration();
      if (result.success) {
        setMigrationLog((prev) => prev + "\n" + (result.output || "Database schema up to date."));
        setTimeout(() => setStep("account"), 1000); // Auto advance
      } else {
        setError(result.error || "Migration failed");
        setMigrationLog((prev) => prev + "\nError: " + result.error);
      }
    } catch (err: any) {
      setError("Migration failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createAdminUser(username, password, orgName);
      if (result.success) {
        setStep("plugins");
        handlePlugins();
      } else {
        setError(result.error || "Failed to create account");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlugins = async () => {
    setIsLoading(true);
    // Simulate fetching
    await new Promise(r => setTimeout(r, 1000));
    
    try {
       const result = await installDefaultPlugins();
       if (result.success) {
          setInstalledPlugins(result.installed || []);
          setTimeout(() => setStep("finish"), 1500);
       } else {
          setError(result.error || "Failed to install plugins");
       }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  const finishSetup = () => {
    window.location.href = "/";
  };

  // --- UI Components ---

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-black bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
      {/* Header */}
      <div className="bg-white border-b-2 border-black sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-black font-bold">O</div>
             <span className="font-bold text-xl uppercase tracking-tighter leading-none">Overseer Setup</span>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-black/40">
             Step {step === "welcome" ? 1 : step === "migration" ? 2 : step === "account" ? 3 : step === "plugins" ? 4 : 5} of 5
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            
            {/* Welcome Step */}
            {step === "welcome" && (
                <div className="p-12 text-center">
                    <div className="w-20 h-20 border-2 border-black flex items-center justify-center mx-auto mb-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Server className="w-10 h-10 text-black" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Welcome</h2>
                    <p className="text-gray-500 mb-10 font-bold uppercase tracking-widest text-[10px]">
                        The infrastructure monitoring platform.
                    </p>
                    
                    <div className="space-y-4 text-left border-2 border-black p-6 bg-white mb-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-4">
                            <Database className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold uppercase tracking-widest">Prepare Database Schema</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold uppercase tracking-widest">Create Admin User</span>
                        </div>
                         <div className="flex items-center gap-4">
                            <Download className="w-5 h-5 text-black" />
                            <span className="text-xs font-bold uppercase tracking-widest">Install Community Plugins</span>
                        </div>
                    </div>

                    <button 
                        onClick={startSetup}
                        className="w-full py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-3"
                    >
                        Start Setup <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Migration Step */}
            {step === "migration" && (
                <div className="p-12">
                     <h2 className="text-3xl font-bold mb-8 flex items-center gap-4 uppercase tracking-tighter">
                        <Database className="w-8 h-8 text-black" />
                        Database
                     </h2>
                     
                     <div className="p-8 border-2 border-black bg-black font-mono text-[10px] text-green-400 min-h-[200px] overflow-auto mb-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <p className="opacity-50 font-bold">$ prisma migrate deploy</p>
                        <pre className="mt-4 whitespace-pre-wrap">{migrationLog}</pre>
                        {isLoading && (
                            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>
                        )}
                     </div>

                     {error && (
                        <div className="border-2 border-black bg-white text-red-600 p-6 mb-8 text-[10px] font-bold uppercase tracking-widest text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {error}
                            <button 
                                onClick={handleMigration} 
                                className="block mt-4 font-bold underline hover:text-black mx-auto"
                            >
                                RETRY OPERATION
                            </button>
                        </div>
                     )}
                </div>
            )}

            {/* Account Step */}
            {step === "account" && (
                <div className="p-12">
                    <h2 className="text-3xl font-bold mb-8 flex items-center gap-4 uppercase tracking-tighter">
                        <Shield className="w-6 h-6 text-black" />
                        Admin Account
                     </h2>
                     
                     <form onSubmit={handleCreateAccount} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Organization Name</label>
                            <input 
                                type="text" 
                                required
                                value={orgName}
                                onChange={e => setOrgName(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-black focus:outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-sm tracking-widest"
                                placeholder="MY COMPANY"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Username</label>
                            <input 
                                type="text" 
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-black focus:outline-none focus:bg-black focus:text-white transition-all font-bold uppercase text-sm tracking-widest"
                                placeholder="ADMIN"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-black focus:outline-none focus:bg-black focus:text-white transition-all font-bold text-sm tracking-widest"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-black uppercase tracking-widest mb-3">Confirm Password</label>
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full px-5 py-4 border-2 border-black focus:outline-none focus:bg-black focus:text-white transition-all font-bold text-sm tracking-widest"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest text-center border-2 border-black p-4 bg-red-50">{error}</p>}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Account Setup"}
                        </button>
                     </form>
                </div>
            )}

            {/* Plugins Step */}
            {step === "plugins" && (
                <div className="p-12 text-center">
                    <h2 className="text-3xl font-bold mb-8 flex items-center justify-center gap-4 uppercase tracking-tighter">
                        <Download className="w-8 h-8 text-black" />
                        Plugins
                     </h2>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 mb-10 italic">Fetching official extensions...</p>

                     {isLoading ? (
                         <div className="flex flex-col items-center justify-center py-12">
                             <Loader2 className="w-12 h-12 text-black animate-spin mb-8" />
                             <p className="text-[10px] font-bold uppercase tracking-widest text-black">INSTALLING ASSETS...</p>
                         </div>
                     ) : (
                         <div className="space-y-6">
                            <div className="border-2 border-black text-black p-8 flex items-center gap-6 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <CheckCircle className="w-8 h-8 flex-shrink-0 text-green-500" />
                                <div className="text-left">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Discovery complete:</span>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {installedPlugins.map(p => (
                                            <span key={p} className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                         </div>
                     )}
                     
                     {error && <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-6 border-2 border-black p-4">{error}</p>}
                </div>
            )}

            {/* Finish Step */}
            {step === "finish" && (
                <div className="p-12 text-center">
                    <div className="w-20 h-20 border-2 border-black flex items-center justify-center mx-auto mb-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-4xl font-bold mb-4 uppercase tracking-tighter">Ready!</h2>
                    <p className="text-gray-500 mb-12 font-bold uppercase tracking-widest text-[10px]">
                        Setup complete. Redirecting to core.
                    </p>
                    
                    <button 
                        onClick={finishSetup}
                        className="w-full py-5 border-2 border-black bg-black text-white font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                    >
                        Enter Overseer
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
