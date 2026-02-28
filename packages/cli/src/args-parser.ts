export interface ParsedArgs {
  command: string;
  subcommand?: string;
  address?: string;
  port?: number;
  url?: string;
  config?: string;
  authToken?: string;
  token?: string;
  serverUrl?: string;
}

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: args[0] || 'help',
  };

  if (args[0] === 'config') {
    result.subcommand = args[1];
    result.token = args[2];
    return result;
  }

  if (args[0] === 'http' || args[0] === 'tcp') {
    const addressArg = args[1];
    
    if (addressArg) {
      if (addressArg.includes(':')) {
        result.address = addressArg;
      } else {
        result.port = parseInt(addressArg, 10);
        result.address = `localhost:${addressArg}`;
      }
    }

    for (let i = 2; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--url' && args[i + 1]) {
        result.url = args[i + 1];
        i++;
      } else if (arg === '--config' && args[i + 1]) {
        result.config = args[i + 1];
        i++;
      } else if (arg === '--authtoken' && args[i + 1]) {
        result.authToken = args[i + 1];
        i++;
      } else if (arg === '--server-url' && args[i + 1]) {
        result.serverUrl = args[i + 1];
        i++;
      }
    }
  }

  return result;
}
