import { paymentMiddleware, RouteConfig, RoutesConfig } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { FileItem, Purchase, COLLECTIONS } from '@/lib/models';
import CONSTANTS from '@/lib/constants';
import { getToken } from 'next-auth/jwt';

const { CHAINS } = CONSTANTS;

async function getFileItem(id: string): Promise<FileItem | null> {
  try {
    const db = await getDb();
    const item = await db.collection<FileItem>(COLLECTIONS.ITEMS).findOne({ id });
    return item;
  } catch (error) {
    console.error('Error fetching item for payment middleware:', error);
    return null;
  }
}

// Helper function to get network name from chain ID
function getNetworkName(chainId: string): string {
  const chain = CHAINS[chainId];
  if (!chain) return ''; // fallback

  // Map chain names to x402 network names
  const chainName = chain.name.toLowerCase().replace(/\s+/g, '-');
  return chainName;
}

// Create a wrapper middleware that dynamically builds the routes config
async function dynamicPaymentMiddleware(request: NextRequest): Promise<NextResponse> {
  // Extract the file ID from the URL path
  const matches = request.nextUrl.pathname.match(/\/api\/download\/([^/?]+)/);
  const fileId = matches?.[1];

  if (!fileId) {
    return NextResponse.json(
      { error: 'File ID is required' },
      { status: 400 }
    );
  }

  const fileItem = await getFileItem(fileId);

  if (!fileItem) {
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }

  // Check if user is authenticated and has already purchased this item
  try {
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (token && token.sub) {
      const userAddress = token.sub;
      const db = await getDb();

      // Check if user has purchased this item before
      const existingPurchase = await db.collection<Purchase>(COLLECTIONS.PURCHASES)
        .findOne({
          itemId: fileId,
          buyerAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') }
        });

      if (existingPurchase) {
        // User has already purchased - bypass payment middleware
        console.log(`User ${userAddress} has already purchased item ${fileId}, bypassing payment`);
        return NextResponse.next();
      }
    }
  } catch (error) {
    console.error('Error checking purchase history:', error);
    // Continue to payment middleware if check fails
  }

  // Validate required token information
  if (!fileItem.token || !fileItem.token.chainId || !fileItem.token.contractAddress) {
    return NextResponse.json(
      { error: 'Invalid payment configuration for this item' },
      { status: 500 }
    );
  }

  // Use the uploader's address as the payment recipient
  const payTo = fileItem.uploaderAddress as `0x${string}`;

  // Get network name from chain ID
  const network = getNetworkName(fileItem.token.chainId);
  if (!network) {
    return NextResponse.json(
      { error: 'Unsupported network for this item' },
      { status: 500 }
    );
  }

  const tokenAddress = fileItem.token.contractAddress;

  // Create the route config for this specific file
  const routesConfig: RoutesConfig = {
    [`/api/download/${fileId}`]: {
      price: `$${fileItem.price}`,
      network: network,
      token: tokenAddress,
      config: {
        description: `Purchase: ${fileItem.name || fileItem.title || 'Digital Item'}`
      },
    } as RouteConfig
  };

  // Create the middleware with the dynamic config and uploader's address
  const middleware = paymentMiddleware(
    payTo,
    routesConfig,
    {
      url: "https://x402.org/facilitator",
    }
  );

  return middleware(request);
}

export default dynamicPaymentMiddleware;

export const config = {
  matcher: ['/api/download/:path*']
};
