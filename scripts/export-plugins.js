const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = path.join(__dirname, '../app/extensions');
// Target directory on Desktop for the new repo
const TARGET_REPO_DIR = path.join(process.env.USERPROFILE || process.env.HOME, 'Desktop/OverseerPlugins');

// List of core files to exclude (not plugins)
const EXCLUDED = ['loader.ts', 'registry.tsx', 'types.ts', 'index.ts', 'node_modules'];

function main() {
    console.log(`Preparing plugins in ${TARGET_REPO_DIR}...`);

    if (fs.existsSync(TARGET_REPO_DIR)) {
        console.log("Cleaning existing directory...");
        fs.rmSync(TARGET_REPO_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TARGET_REPO_DIR, { recursive: true });

    // Copy plugins
    const items = fs.readdirSync(SOURCE_DIR, { withFileTypes: true });
    
    let count = 0;
    for (const item of items) {
        if (EXCLUDED.includes(item.name)) continue;
        if (item.name.startsWith('.')) continue;

        if (item.isDirectory()) {
            // Check if it's a valid plugin (has manifest or index.ts)
            // Ideally we check for manifest.json now
            const srcPath = path.join(SOURCE_DIR, item.name);
            const destPath = path.join(TARGET_REPO_DIR, item.name);
            
            console.log(`Copying plugin: ${item.name}`);
            fs.cpSync(srcPath, destPath, { recursive: true });
            count++;
        }
    }

    if (count === 0) {
        console.log("No plugins found to export.");
        return;
    }

    // Initialize Git
    try {
        console.log("Initializing Git repository...");
        execSync('git init', { cwd: TARGET_REPO_DIR, stdio: 'inherit' });
        execSync('git add .', { cwd: TARGET_REPO_DIR, stdio: 'inherit' });
        execSync('git commit -m "Initial plugin commit"', { cwd: TARGET_REPO_DIR, stdio: 'inherit' });
        execSync('git branch -M main', { cwd: TARGET_REPO_DIR, stdio: 'inherit' });
        
        console.log("\nPlugins exported successfully!");
        console.log(`Repository location: ${TARGET_REPO_DIR}`);
        console.log("\nTo push to GitHub, run these commands in that folder:");
        console.log(`cd "${TARGET_REPO_DIR}"`);
        console.log("git remote add origin https://github.com/OverseerOSS/plugins.git");
        console.log("git push -u origin main");
    } catch (err) {
        console.error("Failed to initialize git:", err.message);
    }
}

main();
