import { TokenRepository, getDatabase } from '@ngrok-clone/database';
import * as crypto from 'crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class AuthService {
  private tokenRepo: TokenRepository;
  private validTokens: Set<string>;
  private secretsClient?: SecretsManagerClient;
  private secretName?: string;
  private useDatabaseAuth: boolean;

  constructor() {
    this.validTokens = new Set();
    this.tokenRepo = new TokenRepository();
    
    // Determine if we should use database or environment-based auth
    this.useDatabaseAuth = !!process.env.DATABASE_HOST;
    
    if (!this.useDatabaseAuth) {
      // Legacy mode: use environment variables or Secrets Manager
      if (process.env.AWS_SECRET_NAME) {
        this.secretName = process.env.AWS_SECRET_NAME;
        this.secretsClient = new SecretsManagerClient({ 
          region: process.env.AWS_REGION || 'us-east-1' 
        });
        this.loadTokensFromSecretsManager();
        setInterval(() => this.loadTokensFromSecretsManager(), 5 * 60 * 1000);
      } else {
        const tokensEnv = process.env.VALID_TOKENS || '';
        this.validTokens = new Set(tokensEnv.split(',').filter(t => t.trim()));
        
        if (this.validTokens.size === 0) {
          const defaultToken = this.generateToken();
          this.validTokens.add(defaultToken);
          console.log('⚠️  No VALID_TOKENS configured. Generated default token:', defaultToken);
          console.log('   Set VALID_TOKENS environment variable or AWS_SECRET_NAME for production use.');
        }
      }
    } else {
      console.log('✓ Using database authentication');
    }
  }

  private async loadTokensFromSecretsManager(): Promise<void> {
    if (!this.secretsClient || !this.secretName) return;

    try {
      const command = new GetSecretValueCommand({
        SecretId: this.secretName,
      });

      const response = await this.secretsClient.send(command);
      
      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        
        const tokens = secret.tokens || [];
        this.validTokens = new Set(tokens.filter((t: string) => t.trim()));
        
        console.log(`✓ Loaded ${this.validTokens.size} tokens from Secrets Manager`);
      }
    } catch (error) {
      console.error('Failed to load tokens from Secrets Manager:', error);
    }
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; tokenId?: string }> {
    if (this.useDatabaseAuth) {
      try {
        const tokenRecord = await this.tokenRepo.findByToken(token);
        if (tokenRecord) {
          return { 
            valid: true, 
            userId: tokenRecord.user_id,
            tokenId: tokenRecord.id 
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
