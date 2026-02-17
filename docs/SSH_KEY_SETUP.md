# SSH Monitoring Setup with Key-Based Authentication

## Overview

SSH monitoring now supports an easy key-based setup flow where Overseer generates an SSH key pair and provides users with a setup command to run on their target server.

## How It Works

### 1. User Initiates SSH Monitor Creation
The user provides:
- **Monitor Name**: Display name for the server
- **Hostname/IP**: Target server IP address  
- **Username**: SSH username (e.g., `root`, `ubuntu`)
- **Port**: SSH port (default: 22)

### 2. System Generates SSH Keys
When the user initiates setup, the system:
- Generates a 4096-bit RSA key pair
- Encrypts the private key using AES-256-GCM (derived from SESSION_SECRET)
- Stores the encrypted private key in the database
- Creates a key fingerprint for verification
- Generates setup commands

### 3. User Runs Setup Command on Target Server
The system provides two options:

#### Option A: One-Liner (Quick Copy-Paste)
A single SSH command that automatically adds the public key:
```bash
ssh user@1.2.3.4 'mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
```

#### Option B: Script (For Advanced Users)
A bash script the user can save and run:
```bash
#!/bin/bash
# Create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add public key
echo 'ssh-rsa AAAA...' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "✓ Overseer monitoring authorized"
```

### 4. Continuous Monitoring
- Overseer uses the stored private key for subsequent SSH connections
- The private key is decrypted only when needed for monitoring
- Key fingerprint is displayed for verification purposes

## Implementation Details

### Database Schema

```sql
-- SSH Key storage
CREATE TABLE "SshKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "monitorId" TEXT NOT NULL UNIQUE,
  "publicKey" TEXT NOT NULL,           -- OpenSSH format public key
  "encryptedPrivateKey" TEXT NOT NULL, -- AES-256-GCM encrypted PEM
  "fingerprint" TEXT NOT NULL,         -- MD5 fingerprint for verification
  "createdAt" TIMESTAMP NOT NULL,
  
  FOREIGN KEY ("monitorId") REFERENCES "ServiceMonitor"("id")
);
```

### Files Modified

- **prisma/schema.prisma**: Added `SshKey` model and relation to `ServiceMonitor`
- **lib/ssh-keys.ts**: Added functions:
  - `generateFingerprint()`: Creates SSH key fingerprint
  - `generateSshSetupCommand()`: Generates bash setup script
  - `generateSshOneLiner()`: Generates single SSH command
- **app/actions.ts**: Added `generateSshSetup()` server action
- **lib/monitoring/core-engine.ts**: Updated SSH monitor config schema

## Usage Example

### Client-Side (React Component)
```typescript
const handleSshSetup = async (name: string, ip: string, username: string, port: number) => {
  const result = await generateSshSetup(name, ip, username, port);
  
  if (result.success) {
    const { setupData } = result;
    
    // Display to user:
    // - setupData.fingerprint (for verification)
    // - setupData.oneLiner (quick copy-paste)
    // - setupData.scriptCommand (full script)
    // - setupData.publicKey (optional manual entry)
    
    console.log("Monitor created with ID:", setupData.monitorId);
    console.log("Fingerprint:", setupData.fingerprint);
    console.log("Setup command:", setupData.oneLiner);
  }
};
```

### Return Value from `generateSshSetup()`
```typescript
{
  success: true,
  monitor: {
    id: "cuid123",
    name: "Production Server",
    type: "ssh",
    config: "{...}",
    interval: 60,
    ...
  },
  setupData: {
    fingerprint: "aa:bb:cc:dd:...",
    scriptCommand: "#!/bin/bash\n...",
    oneLiner: "ssh user@1.2.3.4 '...'",
    publicKey: "ssh-rsa AAAA...",
    monitorId: "cuid123"
  }
}
```

## Security Considerations

1. **Private Key Encryption**: Private keys are encrypted with AES-256-GCM using a key derived from SESSION_SECRET via HKDF. This ensures:
   - Keys survive SESSION_SECRET rotation
   - Each purpose (SSH keys) has its own derived encryption key
   
2. **Key Storage**: Encrypted keys are stored in the database. Never stored in plaintext.

3. **Fingerprint Verification**: Users can verify the key fingerprint when setting up to ensure it matches Overseer's.

4. **Public Key Only on Server**: The server only contains the public key, not the private key.

## Database Migrations

A migration has been created: `20260216200047_add_ssh_keys`

To apply existing migrations:
```bash
npx prisma migrate deploy
```

## Testing

Try the setup with these steps:

1. Call `generateSshSetup()` with test params
2. Verify the setup commands are generated
3. The generated one-liner should be directly copyable
4. The key fingerprint should match OpenSSH format: `aa:bb:cc:dd:...`

