import { promises as dns } from 'dns';

export interface DnsVerificationResult {
  verified: boolean;
  records: string[];
  error?: string;
}

export async function verifyDnsTxtRecord(
  domain: string,
  expectedToken: string
): Promise<DnsVerificationResult> {
  try {
    // Query TXT records for the domain
    const records = await dns.resolveTxt(domain);

    // Flatten the TXT records (they come as string[][])
    const flatRecords = records.map((record) => record.join(''));

    // Check if any record matches our expected token
    // Format: ducky-verification=TOKEN
    const verificationPrefix = 'ducky-verification=';
    const verified = flatRecords.some(
      (record) => record === `${verificationPrefix}${expectedToken}`
    );

    return {
      verified,
      records: flatRecords,
    };
  } catch (error: any) {
    // DNS lookup errors
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return {
        verified: false,
        records: [],
        error: 'No TXT records found for this domain',
      };
    }

    return {
      verified: false,
      records: [],
      error: error.message || 'DNS lookup failed',
    };
  }
}
