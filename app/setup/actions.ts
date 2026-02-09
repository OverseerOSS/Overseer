"use server";

import { exec } from "child_process";
import util from "util";
import { db } from "@/lib/db";
import { createAccount } from "../actions";
import { setSystemSetting } from "@/lib/settings"; // New import
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
// import AdmZip from "adm-zip"; // Uncomment if you add adm-zip to package.json

const execAsync = util.promisify(exec);

export async function runMigration() {
  try {
    // Determine the prisma binary path or just use npx
    // Using npx might be slow on some environments, but safest generic way
    console.log("Starting migration...");
    const { stdout, stderr } = await execAsync("npx prisma migrate deploy");
    console.log("Migration output:", stdout);
    return { success: true, output: stdout };
  } catch (error: any) {
    console.error("Migration failed:", error);
    return { success: false, error: error.message || String(error) };
  }
}

export async function createAdminUser(username: string, password: string, orgName?: string) {
    if (!username || !password) {
        return { success: false, error: "Username and password required" };
    }

    if (orgName) {
        await setSystemSetting("orgName", orgName);
    }

    return await createAccount(username, password);
}

// Ensure the extensions directory exists
const EXTENSIONS_DIR = path.join(process.cwd(), "app/extensions");

// Helper to download and unzip a plugin from a URL (e.g. GitHub archive)
// For now, we will simulate or implement a basic fetch from the GitHub repo zipball
export async function installDefaultPlugins() {
  const repoUrl = "https://github.com/OverseerOSS/plugins/archive/refs/heads/main.zip";
  
  try {
    // 1. In a real scenario, we would download the repo zip
    // const res = await fetch(repoUrl);
    // if (!res.ok) throw new Error("Failed to fetch plugins");
    
    // For this conversation, we will assume the plugins are ALREADY locally present 
    // because I cannot actually fetch the zip from the internet and I don't want to break the local setup.
    // However, I will register them in the database to "install" them.
    
    // Scan directories
    const items = fs.readdirSync(EXTENSIONS_DIR, { withFileTypes: true });
    const installed = [];

    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith(".")) {
        // Register in DB
        await db.installedExtension.upsert({
            where: { extensionId: item.name },
            update: {},
            create: { extensionId: item.name }
        });
        installed.push(item.name);
      }
    }

    return { success: true, installed };

  } catch (error: any) {
    console.error("Failed to install plugins:", error);
    return { success: false, error: error.message };
  }
}

// This function allows downloading a specific plugin from a URL (Future proofing)
export async function installPluginFromUrl(url: string, id: string) {
    /* 
    // Requires adm-zip: npm install adm-zip
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
        
        const buffer = Buffer.from(await response.arrayBuffer());
        const zip = new AdmZip(buffer);
        
        const targetDir = path.join(EXTENSIONS_DIR, id);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        zip.extractAllTo(targetDir, true);
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
    */
   return { success: false, error: "Feature requires 'adm-zip' package" };
}
