import { paymentMiddleware } from 'x402-next';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface FileItem {
  id: string;
  title: string;
  description: string;
  price: string;
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  uploaderAddress: string;
}

async function getFileItem(id: string): Promise<FileItem | null> {
  try {
    const DB_FILE = path.join(process.cwd(), 'data', 'items.json');
    const data = await fs.readFile(DB_FILE, 'utf-8');
    const items: FileItem[] = JSON.parse(data);
    return items.find((item) => item.id === id) || null;
  } catch {
    return null;
  }
}

// Create a wrapper middleware that dynamically builds the routes config
async function dynamicPaymentMiddleware(request: NextRequest): Promise<NextResponse> {
  // Extract the file ID from the URL path
  const matches = request.nextUrl.pathname.match(/\/api\/download\/([^/?]+)/);
  const fileId = matches?.[1];

  // Default values if file not found
  let payTo: `0x${string}` = "0xCf673b87aFBed6091617331cC895376209d3b923"; // Fallback address
  let routesConfig: any = {
    '/api/download/*': {
      price: '$0.01',
      network: 'base-sepolia',
      config: {
        description: 'Access to protected API endpoint'
      }
    }
  };

  if (fileId) {
    const fileItem = await getFileItem(fileId);

    if (fileItem) {
      // Use the uploader's address as the payment recipient
      payTo = fileItem.uploaderAddress as `0x${string}`;

      // Create a dynamic route for this specific file
      routesConfig = {
        [`/api/download/${fileId}`]: {
          price: `$${fileItem.price}`,
          network: 'base-sepolia',
          config: {
            description: `Purchase: ${fileItem.title}`
          },
        }
      };
    }
  }

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
