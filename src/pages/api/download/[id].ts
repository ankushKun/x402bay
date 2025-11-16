import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb, getDigitalFilesBucket, downloadFromGridFS, fileExistsInGridFS } from '@/lib/mongodb';
import { FileItem, Purchase, COLLECTIONS } from '@/lib/models';

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
    // x402-next sets payment info in these headers
    let buyerAddress: string | undefined;
    let transactionHash: string | undefined;

    // Try various header formats that x402 middleware might use
    const xPaymentResponse = req.headers['x-payment-response'] as string;
    const xPaymentFrom = req.headers['x-payment-from'] as string;
    const xPaymentTx = req.headers['x-payment-tx'] as string;
    const xPaymentPayer = req.headers['x-payment-payer'] as string;

    console.log('Payment headers:', {
      'x-payment-response': xPaymentResponse,
      'x-payment-from': xPaymentFrom,
      'x-payment-tx': xPaymentTx,
      'x-payment-payer': xPaymentPayer,
      'all-headers': req.headers
    });

    // First try the direct headers
    if (xPaymentFrom) {
      buyerAddress = xPaymentFrom;
    } else if (xPaymentPayer) {
      buyerAddress = xPaymentPayer;
    }

    if (xPaymentTx) {
      transactionHash = xPaymentTx;
    }

    // If not found, try parsing x-payment-response
    if (!buyerAddress && xPaymentResponse) {
      try {
        // Try parsing as base64 encoded JSON
        const paymentData = JSON.parse(Buffer.from(xPaymentResponse, 'base64').toString());
        buyerAddress = paymentData.payer || paymentData.from || paymentData.buyer || paymentData.buyerAddress;
        transactionHash = transactionHash || paymentData.transaction || paymentData.transactionHash || paymentData.txHash || paymentData.hash;
      } catch (e) {
        console.error('Error parsing payment response as base64:', e);
        // Try parsing as plain JSON
        try {
          const paymentData = JSON.parse(xPaymentResponse);
          buyerAddress = paymentData.payer || paymentData.from || paymentData.buyer || paymentData.buyerAddress;
          transactionHash = transactionHash || paymentData.transaction || paymentData.transactionHash || paymentData.txHash || paymentData.hash;
        } catch (e2) {
          console.error('Error parsing payment response as JSON:', e2);
        }
      }
    }

    // Track the purchase if we have buyer information
    if (buyerAddress) {
      console.log('Recording purchase:', { buyerAddress, itemId: item.id, transactionHash });

      // Check if this purchase already exists (to avoid duplicates)
      const existingPurchase = await db.collection<Purchase>(COLLECTIONS.PURCHASES).findOne({
        itemId: item.id,
        buyerAddress: { $regex: new RegExp(`^${buyerAddress}$`, 'i') }
      });

      if (!existingPurchase) {
        const purchase: Purchase = {
          itemId: item.id,
          buyerAddress: buyerAddress,
          transactionHash: transactionHash,
          amount: item.price,
          purchasedAt: new Date().toISOString(),
        };

        try {
          await db.collection<Purchase>(COLLECTIONS.PURCHASES).insertOne(purchase);
          console.log('Purchase recorded successfully');
        } catch (e) {
          console.error('Error tracking purchase:', e);
          // Don't fail the download if purchase tracking fails
        }
      } else {
        console.log('Purchase already exists, skipping duplicate');
      }
    } else {
      console.warn('No buyer address found in payment headers - purchase will not be tracked');
    }

    // Increment download counter
    await db.collection<FileItem>(COLLECTIONS.ITEMS).updateOne(
      { id },
      { $inc: { downloadCount: 1 } }
    );

    // Get the file from GridFS
    const digitalFilesBucket = await getDigitalFilesBucket();

    // Check if file exists
    const fileExists = await fileExistsInGridFS(digitalFilesBucket, item.filename);
    if (!fileExists) {
      return res.status(404).json({ error: 'File not found in storage' });
    }

    // Download the file from GridFS
    const fileBuffer = await downloadFromGridFS(digitalFilesBucket, item.filename);

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
