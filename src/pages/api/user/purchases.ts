import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, Purchase, COLLECTIONS } from '@/lib/models';
import { requireAuth } from '@/lib/auth';

async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    address: string
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = await getDb();

        // Find all purchases by this user
        const purchases = await db.collection<Purchase>(COLLECTIONS.PURCHASES)
            .find({ buyerAddress: { $regex: new RegExp(`^${address}$`, 'i') } })
            .sort({ purchasedAt: -1 })
            .toArray();

        if (purchases.length === 0) {
            return res.status(200).json({ items: [], count: 0 });
        }

        // Get the item IDs
        const itemIds = purchases.map(p => p.itemId);

        // Fetch the actual items
        const items = await db.collection<FileItem>(COLLECTIONS.ITEMS)
            .find({ id: { $in: itemIds } })
            .toArray();

        // Create a map for quick lookup
        const itemsMap = new Map(items.map(item => [item.id, item]));

        // Combine purchase info with item details
        const purchasedItems = purchases.map(purchase => ({
            ...itemsMap.get(purchase.itemId),
            _id: itemsMap.get(purchase.itemId)?._id?.toString(),
            purchaseInfo: {
                purchasedAt: purchase.purchasedAt,
                transactionHash: purchase.transactionHash,
                amount: purchase.amount,
            }
        })).filter(item => item.id); // Filter out items that no longer exist

        res.status(200).json({
            items: purchasedItems,
            count: purchasedItems.length
        });
    } catch (error) {
        console.error('Error fetching purchases:', error);
        res.status(500).json({ error: 'Failed to fetch purchases' });
    }
}

export default function purchasesHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return requireAuth(req, res, handler);
}
