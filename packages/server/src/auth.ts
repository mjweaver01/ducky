import { TokenRepository } from '@ducky/database';
import * as crypto from 'crypto';

export class AuthService {
  private tokenRepo: TokenRepository;
  private validTokens: Set<string>;
  private useDatabaseAuth: boolean;

  constructor() {
    this.validTokens = new Set();
    this.tokenRepo = new TokenRepository();

    this.useDatabaseAuth = !!(process.env.DATABASE_HOST || process.env.DATABASE_URL);

    if (!this.useDatabaseAuth) {
      const tokensEnv = process.env.VALID_TOKENS || '';
      this.validTokens = new Set(tokensEnv.split(',').filter((t) => t.trim()));

      if (this.validTokens.size === 0) {
        const defaultToken = this.generateToken();
        this.validTokens.add(defaultToken);
        console.log('⚠️  No VALID_TOKENS configured. Generated default token:', defaultToken);
        console.log('   Set VALID_TOKENS environment variable for production use.');
      }
    } else {
      console.log('✓ Using database authentication');
    }
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async validateToken(
    token: string
  ): Promise<{ valid: boolean; userId?: string; tokenId?: string; subdomain?: string }> {
    if (this.useDatabaseAuth) {
      try {
        const tokenRecord = await this.tokenRepo.findByToken(token);
        if (tokenRecord) {
          return {
            valid: true,
            userId: tokenRecord.user_id,
            tokenId: tokenRecord.id,
            subdomain: tokenRecord.subdomain,
          };
        }
        return { valid: false };
      } catch (error) {
        console.error('Database token validation error:', error);
        return { valid: false };
      }
    } else {
      // Legacy mode
      return { valid: this.validTokens.has(token) };
    }
  }

  addToken(token: string): void {
    this.validTokens.add(token);
  }

  getValidTokens(): string[] {
    return Array.from(this.validTokens);
  }
}
