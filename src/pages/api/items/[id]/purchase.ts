import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, Purchase, COLLECTIONS } from '@/lib/models';
import { requireAuth } from '@/lib/auth';

async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    address: string
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        const { transactionHash } = req.body;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Invalid item ID' });
        }

        const db = await getDb();
        const item = await db.collection<FileItem>(COLLECTIONS.ITEMS).findOne({ id });

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Check if this purchase already exists (to avoid duplicates)
        const existingPurchase = await db.collection<Purchase>(COLLECTIONS.PURCHASES).findOne({
            itemId: id,
            buyerAddress: { $regex: new RegExp(`^${address}$`, 'i') }
        });

        if (existingPurchase) {
            return res.status(200).json({
                success: true,
                message: 'Purchase already recorded',
                purchase: existingPurchase
            });
        }

        // Record the purchase
        const purchase: Purchase = {
            itemId: id,
            buyerAddress: address,
            transactionHash: transactionHash,
            amount: item.price,
            purchasedAt: new Date().toISOString(),
        };

        await db.collection<Purchase>(COLLECTIONS.PURCHASES).insertOne(purchase);

        res.status(200).json({
            success: true,
            message: 'Purchase recorded successfully',
            purchase
        });
    } catch (error) {
        console.error('Error recording purchase:', error);
        res.status(500).json({ error: 'Failed to record purchase' });
    }
}

export default function purchaseHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return requireAuth(req, res, handler);
}
