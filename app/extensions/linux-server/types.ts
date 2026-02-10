export interface LinuxServerConfig {
  host: string;
  port: number;
  enableCpu: boolean;
  enableRam: boolean;
  enableNet: boolean;
  encryptedPrivateKey: string;
  publicKey: string;
  keyVersion: number;
}
