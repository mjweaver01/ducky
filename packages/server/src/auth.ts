import * as crypto from 'crypto';

export class AuthService {
  private validTokens: Set<string>;

  constructor() {
    const tokensEnv = process.env.VALID_TOKENS || '';
    this.validTokens = new Set(tokensEnv.split(',').filter(t => t.trim()));
    
    if (this.validTokens.size === 0) {
      const defaultToken = this.generateToken();
      this.validTokens.add(defaultToken);
      console.log('⚠️  No VALID_TOKENS configured. Generated default token:', defaultToken);
      console.log('   Set VALID_TOKENS environment variable for production use.');
    }
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateToken(token: string): boolean {
    return this.validTokens.has(token);
  }

  addToken(token: string): void {
    this.validTokens.add(token);
  }

  getValidTokens(): string[] {
    return Array.from(this.validTokens);
  }
}
