import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, COLLECTIONS } from '@/lib/models';
import { getCategoryLabel } from '@/lib/constants';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const db = await getDb();

        // Get distinct category IDs from items collection
        const categoryIds = await db.collection<FileItem>(COLLECTIONS.ITEMS)
            .distinct('category');

        // Map category IDs to their labels and sort
        const categories = categoryIds
            .map(id => ({
                id,
                label: getCategoryLabel(id)
            }))
            .sort((a, b) => {
                // Put "Others" at the end
                if (a.id === 0) return 1;
                if (b.id === 0) return -1;
                return a.label.localeCompare(b.label);
            });

        res.status(200).json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}
