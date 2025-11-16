import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, COLLECTIONS } from '@/lib/models';
import { requireAuth } from '@/lib/auth';

async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    address: string
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid item ID' });
    }

    try {
        const db = await getDb();
        const collection = db.collection<FileItem>(COLLECTIONS.ITEMS);

        // Find the item
        const item = await collection.findOne({ id });

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Initialize likes array if it doesn't exist
        const currentLikes = item.likes || [];
        const normalizedAddress = address.toLowerCase();
        const hasLiked = currentLikes.some(
            (likedAddress) => likedAddress.toLowerCase() === normalizedAddress
        );

        if (req.method === 'POST') {
            // Add like
            if (hasLiked) {
                return res.status(200).json({
                    message: 'Already liked',
                    liked: true,
                    likesCount: currentLikes.length
                });
            }

            const result = await collection.updateOne(
                { id },
                { $addToSet: { likes: address } }
            );

            if (result.modifiedCount === 0) {
                return res.status(500).json({ error: 'Failed to add like' });
            }

            return res.status(200).json({
                message: 'Item liked successfully',
                liked: true,
                likesCount: currentLikes.length + 1
            });
        } else if (req.method === 'DELETE') {
            // Remove like
            if (!hasLiked) {
                return res.status(200).json({
                    message: 'Not liked',
                    liked: false,
                    likesCount: currentLikes.length
                });
            }

            const result = await collection.updateOne(
                { id },
                { $pull: { likes: { $regex: new RegExp(`^${address}$`, 'i') } } }
            );

            if (result.modifiedCount === 0) {
                return res.status(500).json({ error: 'Failed to remove like' });
            }

            return res.status(200).json({
                message: 'Like removed successfully',
                liked: false,
                likesCount: Math.max(0, currentLikes.length - 1)
            });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error handling like:', error);
        return res.status(500).json({ error: 'Failed to process like action' });
    }
}

export default function likeHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return requireAuth(req, res, handler);
}
