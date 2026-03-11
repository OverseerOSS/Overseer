"use client";

import { useState, useEffect } from "react";
import { createAdminUser, runMigration } from "./actions";
import { getIsDemoMode, updateOrganizationName } from "../actions";
import { ArrowRight, CheckCircle, Database, Shield, Server, Loader2 } from "lucide-react";

type SetupStep = "welcome" | "migration" | "account" | "finish";

export default function SetupPage() {
  const [step, setStep] = useState<SetupStep>("welcome");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [migrationLog, setMigrationLog] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    getIsDemoMode().then(setIsDemo);
  }, []);

  const startSetup = () => {
    setStep("migration");
    handleMigration();
  };

  const handleMigration = async () => {
    setIsLoading(true);
    setMigrationLog("Running database migrations...");
    setError("");

    try {
      await new Promise(r => setTimeout(r, 800));
      if (isDemo) {
        setMigrationLog((prev) => prev + "\n[DEMO] Skipping real migration...");
        setMigrationLog((prev) => prev + "\n[DEMO] Mock database initialized.");
        setTimeout(() => setStep("account"), 1000);
      } else {
        const result = await runMigration();
        if (result.success) {
          setMigrationLog((prev) => prev + "\nDatabase schema up to date.");
          setTimeout(() => setStep("account"), 1000);
        } else {
          setError(result.error || "Migration failed");
          setMigrationLog((prev) => prev + "\nError: " + result.error);
        }
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
      if (isDemo) {
        await updateOrganizationName(orgName || "Overseer Demo");
        setStep("finish");
      } else {
        const result = await createAdminUser(username, password, orgName);
        if (result.success) {
          setStep("finish");
        } else {
          setError(result.error || "Failed to create account");
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex items-center justify-center p-6 selection:bg-black selection:text-white">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="w-full max-w-2xl bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative z-10 transition-all duration-500">
        <div className="p-12">
            <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rotate-45 flex items-center justify-center">
                        <div className="w-4 h-4 bg-white -rotate-45" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Overseer Setup</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-3 py-1">
                    Step {step === "welcome" ? 1 : step === "migration" ? 2 : step === "account" ? 3 : 4} of 4
                </div>
            </div>

            {step === "welcome" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">Welcome to Overseer.</h1>
                    <p className="text-lg font-bold uppercase tracking-widest text-black/40 leading-relaxed italic">The minimalist infrastructure monitor for high-stakes environments.</p>
                    <button onClick={startSetup} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-4">
                        Initialize Engine <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/20 text-center italic">Version 1.0.0 Alpha • Open Source Edition</p>
                </div>
            )}

            {step === "migration" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 border-b-2 border-black pb-4">
                        <Database className="w-8 h-8" />
                        <h2 className="text-4xl font-black uppercase tracking-tighter">Schema Setup</h2>
                    </div>
                    <div className="bg-black text-white p-6 font-mono text-xs leading-relaxed lowercase overflow-auto max-h-[200px] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
                        {migrationLog || "Awaiting signal..."}
                    </div>
                    {isLoading && <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest animate-pulse"><Loader2 className="w-4 h-4 animate-spin" /> Provisioning Data Tunnels...</div>}
                    {error && <div className="p-6 bg-red-500 text-white font-bold uppercase tracking-widest text-xs border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{error}</div>}
                    {!isLoading && error && (
                        <button onClick={handleMigration} className="w-full py-4 border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Retry Migration</button>
                    )}
                </div>
            )}

            {step === "account" && (
                <form onSubmit={handleCreateAccount} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center gap-4 border-b-2 border-black pb-4">
                        <Shield className="w-8 h-8" />
                        <h2 className="text-4xl font-black uppercase tracking-tighter">Identity</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-black/40 italic">Organization Identity</label>
                            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-black font-bold uppercase tracking-widest text-sm focus:bg-black focus:text-white transition-colors" placeholder="E.G. OVERSEER CORP" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-black/40 italic">Admin Login</label>
                                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-black font-bold uppercase tracking-widest text-xs focus:bg-black focus:text-white transition-colors" placeholder="USERNAME" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-black/40 italic">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-black font-bold uppercase tracking-widest text-xs focus:bg-black focus:text-white transition-colors" placeholder="MIN 8 CHARS" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black mb-2 uppercase tracking-widest text-black/40 italic">Confirm Access</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-black font-bold uppercase tracking-widest text-xs focus:bg-black focus:text-white transition-colors" placeholder="REPEAT PASSWORD" required />
                        </div>
                    </div>
                    {error && <div className="p-4 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{error}</div>}
                    <button type="submit" disabled={isLoading} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-white hover:text-black border-2 border-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-4">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalize Configuration <ArrowRight className="w-5 h-5" /></>}
                    </button>
                </form>
            )}

            {step === "finish" && (
                <div className="space-y-10 animate-in zoom-in fade-in duration-700">
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-black rotate-45 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <CheckCircle className="w-10 h-10 text-white -rotate-45" />
                        </div>
                        <h2 className="text-5xl font-black uppercase tracking-tighter">Operational.</h2>
                        <p className="text-xs font-bold uppercase tracking-widest text-black/40 max-w-sm italic">Overseer engine has been initialized and secured. You are now in control of your infrastructure monitoring.</p>
                    </div>
                    <button onClick={() => window.location.href = "/"} className="w-full py-6 bg-black text-white font-black uppercase tracking-widest text-sm border-2 border-black hover:bg-white hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center justify-center gap-4">
                        Launch Dashboard <Server className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
