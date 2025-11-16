import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import { FileItem, Purchase, COLLECTIONS } from '@/lib/models';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid file ID' });
    }

    const db = await getDb();
    const item = await db.collection<FileItem>(COLLECTIONS.ITEMS).findOne({ id });

    if (!item) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Extract payment information from headers (set by x402 middleware)
    const xPaymentResponse = req.headers['x-payment-response'] as string;
    let buyerAddress: string | undefined;
    let transactionHash: string | undefined;

    if (xPaymentResponse) {
      try {
        // The x-payment-response header contains payment details
        // It's typically a base64 encoded JSON string
        const paymentData = JSON.parse(Buffer.from(xPaymentResponse, 'base64').toString());
        buyerAddress = paymentData.payer || paymentData.from || paymentData.buyer || paymentData.buyerAddress;
        transactionHash = paymentData.transaction || paymentData.transactionHash || paymentData.txHash || paymentData.hash;
      } catch (e) {
        console.error('Error parsing payment response:', e);
        // Try parsing as plain JSON
        try {
          const paymentData = JSON.parse(xPaymentResponse);
          buyerAddress = paymentData.payer || paymentData.from || paymentData.buyer || paymentData.buyerAddress;
          transactionHash = paymentData.transaction || paymentData.transactionHash || paymentData.txHash || paymentData.hash;
        } catch (e2) {
          console.error('Error parsing payment response as JSON:', e2);
        }
      }
    }

    // Track the purchase if we have buyer information
    if (buyerAddress) {
      const purchase: Purchase = {
        itemId: item.id,
        buyerAddress: buyerAddress,
        transactionHash: transactionHash,
        amount: item.price,
        purchasedAt: new Date().toISOString(),
      };

      try {
        await db.collection<Purchase>(COLLECTIONS.PURCHASES).insertOne(purchase);
      } catch (e) {
        console.error('Error tracking purchase:', e);
        // Don't fail the download if purchase tracking fails
      }
    }

    // Increment download counter
    await db.collection<FileItem>(COLLECTIONS.ITEMS).updateOne(
      { id },
      { $inc: { downloadCount: 1 } }
    );

    // Serve the file directly
    const filePath = path.join(UPLOADS_DIR, item.filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);

    // Set response headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${item.originalName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    // Send the file
    return res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
}
