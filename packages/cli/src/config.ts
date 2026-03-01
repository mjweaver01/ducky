import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from '@ducky/shared';

export class ConfigManager {
  private configPath: string;
  private config: Config;

  constructor(configPath?: string) {
    if (configPath) {
      this.configPath = configPath;
    } else {
      const configDir = path.join(os.homedir(), '.ducky');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      this.configPath = path.join(configDir, 'config.json');
    }

    this.config = this.loadConfig();
  }

  private loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving config:', error);
      throw error;
    }
  }

  addAuthToken(token: string): void {
    this.config.authToken = token;
    this.saveConfig();
    console.log(`✅ Authtoken saved to ${this.configPath}`);
  }

  addServerUrl(serverUrl: string): void {
    this.config.serverUrl = serverUrl;
    this.saveConfig();
    console.log(`✅ Server URL saved to ${this.configPath}`);
  }

  getAuthToken(): string | undefined {
    return this.config.authToken;
  }

  getServerUrl(): string {
    return this.config.serverUrl || 'ws://localhost:4000';
  }

  getConfig(): Config {
    return { ...this.config };
  }
}
