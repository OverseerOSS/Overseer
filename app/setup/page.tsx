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
      const result = await createAdminUser(username, password);
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">O</div>
             <span className="font-semibold text-lg">Overseer Setup</span>
          </div>
          <div className="text-sm text-gray-500">
             Step {step === "welcome" ? 1 : step === "migration" ? 2 : step === "account" ? 3 : step === "plugins" ? 4 : 5} of 5
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Welcome Step */}
            {step === "welcome" && (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Server className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Welcome to Overseer</h2>
                    <p className="text-gray-600 mb-8">
                        The open-source infrastructure monitoring platform. We will guide you through the initial configuration.
                    </p>
                    
                    <div className="space-y-4 text-left border rounded-lg p-4 bg-gray-50 mb-8">
                        <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-gray-400" />
                            <span className="text-sm">Prepare Database Schema</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-gray-400" />
                            <span className="text-sm">Create Admin User</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <Download className="w-5 h-5 text-gray-400" />
                            <span className="text-sm">Install Community Plugins</span>
                        </div>
                    </div>

                    <button 
                        onClick={startSetup}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        Start Setup <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Migration Step */}
            {step === "migration" && (
                <div className="p-8">
                     <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Database className="w-6 h-6 text-blue-600" />
                        Database Setup
                     </h2>
                     
                     <div className="bg-zinc-900 rounded-lg p-4 font-mono text-xs text-green-400 min-h-[200px] overflow-auto mb-6">
                        <p className="opacity-50">$ prisma migrate deploy</p>
                        <pre className="mt-2 whitespace-pre-wrap">{migrationLog}</pre>
                        {isLoading && (
                            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1"></span>
                        )}
                     </div>

                     {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
                            {error}
                            <button 
                                onClick={handleMigration} 
                                className="block mt-2 font-medium underline hover:text-red-700"
                            >
                                Retry
                            </button>
                        </div>
                     )}
                </div>
            )}

            {/* Account Step */}
            {step === "account" && (
                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-blue-600" />
                        Administrator Account
                     </h2>
                     
                     <form onSubmit={handleCreateAccount} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input 
                                type="text" 
                                required
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="admin"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input 
                                type="password" 
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input 
                                type="password" 
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                            />
                        </div>

                        {error && <p className="text-red-600 text-sm">{error}</p>}

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
                        </button>
                     </form>
                </div>
            )}

            {/* Plugins Step */}
            {step === "plugins" && (
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-6 flex items-center justify-center gap-3">
                        <Download className="w-6 h-6 text-blue-600" />
                        Installing Plugins
                     </h2>
                     <p className="text-gray-500 mb-8">Fetching default plugins from OverseerOSS/plugins...</p>

                     {isLoading ? (
                         <div className="flex flex-col items-center justify-center py-8">
                             <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                             <p className="text-sm text-gray-400">Downloading packages...</p>
                         </div>
                     ) : (
                         <div className="space-y-4">
                            <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                <div className="text-left text-sm">
                                    <span className="font-medium">Successfully installed:</span>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {installedPlugins.map(p => (
                                            <span key={p} className="bg-white px-2 py-1 rounded border border-green-200 text-xs font-mono">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                         </div>
                     )}
                     
                     {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                </div>
            )}

            {/* Finish Step */}
            {step === "finish" && (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Setup Complete!</h2>
                    <p className="text-gray-600 mb-8">
                        Overseer is now up and running. 
                    </p>
                    
                    <button 
                        onClick={finishSetup}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
