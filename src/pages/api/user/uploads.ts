import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, COLLECTIONS } from '@/lib/models';
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

        // Find all items uploaded by this user
        const items = await db.collection<FileItem>(COLLECTIONS.ITEMS)
            .find({
                uploaderAddress: { $regex: new RegExp(`^${address}$`, 'i') }
            })
            .sort({ uploadedAt: -1 })
            .toArray();

        // Convert ObjectId to string for serialization
        const serializedItems = items.map(item => ({
            ...item,
            _id: item._id?.toString(),
        }));

        res.status(200).json({
            items: serializedItems,
            count: serializedItems.length
        });
    } catch (error) {
        console.error('Error fetching uploads:', error);
        res.status(500).json({ error: 'Failed to fetch uploads' });
    }
}

export default function uploadsHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return requireAuth(req, res, handler);
}
