import * as https from 'https';
import { execSync } from 'child_process';

interface PackageInfo {
  'dist-tags': {
    latest: string;
  };
}

/**
 * Fetches the latest version from npm registry
 */
export async function getLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = 'https://registry.npmjs.org/@ducky.wtf/cli';

    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const packageInfo: PackageInfo = JSON.parse(data);
              resolve(packageInfo['dist-tags'].latest);
            } else {
              reject(new Error(`Failed to fetch version info: HTTP ${res.statusCode}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Compares two semver versions
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }

  return 0;
}

/**
 * Updates the CLI to the latest version
 */
export function updateCli(): void {
  console.log('📦 Updating ducky CLI...\n');

  try {
    // Run npm install globally
    execSync('npm install -g @ducky.wtf/cli@latest', {
      stdio: 'inherit',
    });

    console.log('\n✅ Update complete! Run "ducky version" to verify.');
  } catch (error) {
    console.error('\n❌ Update failed:', error instanceof Error ? error.message : error);
    console.log('\n💡 You can try updating manually with:');
    console.log('   npm install -g @ducky.wtf/cli@latest');
    process.exit(1);
  }
}

/**
 * Checks if an update is available and notifies the user
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  try {
    const latestVersion = await getLatestVersion();
    
    if (compareVersions(latestVersion, currentVersion) > 0) {
      console.log(`\n📢 Update available: ${currentVersion} → ${latestVersion}`);
      console.log(`   Run "ducky update" to upgrade\n`);
    }
  } catch (error) {
    // Silently fail - don't interrupt the user's workflow
  }
}
