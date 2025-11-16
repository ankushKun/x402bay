import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, COLLECTIONS } from '@/lib/models';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { q, category } = req.query;

        if (!q || typeof q !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchQuery = q.trim();

        if (searchQuery.length === 0) {
            return res.status(400).json({ error: 'Search query cannot be empty' });
        }

        const db = await getDb();

        // Create a case-insensitive regex search pattern
        const searchRegex = new RegExp(searchQuery, 'i');

        // Build the query with optional category filter
        const query: any = {
            $and: [
                {
                    $or: [
                        { name: { $regex: searchRegex } },
                        { title: { $regex: searchRegex } },
                        { description: { $regex: searchRegex } },
                        { tags: { $regex: searchRegex } }
                    ]
                },
                {
                    $or: [
                        { isListed: { $exists: false } },
                        { isListed: true }
                    ]
                }
            ]
        };

        // Add category filter if provided
        if (category && typeof category === 'string') {
            const categoryId = parseInt(category, 10);
            if (!isNaN(categoryId)) {
                query.$and.push({ category: categoryId });
            }
        }

        // Search across title (name), description, and tags
        const items = await db.collection<FileItem>(COLLECTIONS.ITEMS)
            .find(query)
            .sort({ uploadedAt: -1 })
            .toArray();

        // Convert ObjectId to string for serialization
        const serializedItems = items.map(item => ({
            ...item,
            _id: item._id?.toString(),
        }));

        res.status(200).json({
            items: serializedItems,
            count: serializedItems.length,
            query: searchQuery
        });
    } catch (error) {
        console.error('Error searching items:', error);
        res.status(500).json({ error: 'Failed to search items' });
    }
}
