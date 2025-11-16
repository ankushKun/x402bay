import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';

/**
 * Verify NextAuth session and extract wallet address
 * Uses SIWE authentication through NextAuth
 */
export async function verifySession(
  req: NextApiRequest
): Promise<{ authenticated: boolean; address: string | null }> {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token || !token.sub) {
      return { authenticated: false, address: null };
    }

    // token.sub contains the wallet address from SIWE authentication
    return { authenticated: true, address: token.sub };
  } catch (error) {
    console.error('Session verification error:', error);
    return { authenticated: false, address: null };
  }
}

/**
 * @deprecated Use verifySession instead
 * Legacy function kept for backward compatibility
 */
export function verifyWalletAuth(
  req: NextApiRequest,
  res: NextApiResponse
): { authenticated: boolean; address: string | null } {
  const address = req.headers['x-wallet-address'] as string;

  if (!address) {
    return { authenticated: false, address: null };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { authenticated: false, address: null };
  }

  return { authenticated: true, address };
}

/**
 * Helper to require authentication for an API route using NextAuth session
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  handler: (req: NextApiRequest, res: NextApiResponse, address: string) => Promise<void> | void
) {
  const { authenticated, address } = await verifySession(req);

  if (!authenticated || !address) {
    res.status(401).json({ error: 'Unauthorized: Please sign in with your wallet' });
    return;
  }

  return handler(req, res, address);
}

/**
 * Verify that the uploader address in the request matches the authenticated wallet
 */
export function verifyUploaderOwnership(
  uploaderAddress: string,
  authenticatedAddress: string
): boolean {
  return uploaderAddress.toLowerCase() === authenticatedAddress.toLowerCase();
}
