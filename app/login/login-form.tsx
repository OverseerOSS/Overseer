"use client";

import { useState, useEffect } from "react";
import { login } from "../actions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(username, password);

      if (!result.success) {
        if (result.error === "No users exist. Please create an account.") {
          // Redirect to setup
          router.push("/setup");
          return;
        }
        setError(result.error || "Login failed");
      } else {
        // Redirect to dashboard
        window.location.href = "/";
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e1e1e_1px,transparent_1px)] [background-size:16px_16px]">
      <div className="w-full max-w-md space-y-8 p-12 bg-white dark:bg-black border-2 border-black dark:border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
        <div className="text-center">
          <h2 className="text-5xl font-bold tracking-tighter text-black dark:text-white uppercase">
            Overseer
          </h2>
          <p className="mt-4 text-[10px] text-black/40 dark:text-white/40 font-bold uppercase tracking-widest">
            AUTHENTICATION REQUIRED
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full border-2 border-black dark:border-white bg-white dark:bg-black px-4 py-3 text-black dark:text-white placeholder-gray-400 focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black focus:outline-none text-sm font-bold uppercase tracking-widest transition-colors"
                placeholder="ADMIN"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-bold text-black dark:text-white uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full border-2 border-black dark:border-white bg-white dark:bg-black px-4 py-3 text-black dark:text-white placeholder-gray-400 focus:bg-black dark:focus:bg-white focus:text-white dark:focus:text-black focus:outline-none text-sm font-bold tracking-widest transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-[10px] text-red-600 text-center border-2 border-black dark:border-white p-3 font-bold uppercase tracking-widest">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex w-full justify-center border-2 border-black dark:border-white bg-black dark:bg-white px-4 py-5 text-sm font-bold text-white dark:text-black uppercase tracking-[0.2em] hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
          >
             {isLoading ? "AUTHENTICATING..." : "Enter Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}
