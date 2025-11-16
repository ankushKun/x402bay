import type { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from '@/lib/mongodb';
import { FileItem, COLLECTIONS } from '@/lib/models';
import { requireAuth, verifyUploaderOwnership } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
    address: string
) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

        // Verify ownership
        if (!verifyUploaderOwnership(item.uploaderAddress, address)) {
            return res.status(403).json({ error: 'You can only delete your own items' });
        }

        const downloadCount = item.downloadCount || 0;

        if (downloadCount === 0) {
            // Delete the item completely
            try {
                // Delete the digital file
                const filePath = path.join(UPLOADS_DIR, item.filename);
                await fs.unlink(filePath).catch(() => {
                    console.log('File not found on disk, continuing with deletion');
                });

                // Delete item images
                if (item.itemImages && item.itemImages.length > 0) {
                    const imageDir = path.join(UPLOADS_DIR, 'item-images');
                    for (const image of item.itemImages) {
                        await fs.unlink(path.join(imageDir, image.filename)).catch(() => {
                            console.log(`Image ${image.filename} not found, continuing`);
                        });
                    }
                }

                // Delete from database
                await collection.deleteOne({ id });

                return res.status(200).json({
                    message: 'Item deleted successfully',
                    deleted: true
                });
            } catch (error) {
                console.error('Error deleting files:', error);
                return res.status(500).json({ error: 'Failed to delete item files' });
            }
        } else {
            // Unlist the item (hide from public)
            const result = await collection.updateOne(
                { id },
                { $set: { isListed: false } }
            );

            if (result.modifiedCount === 0) {
                return res.status(500).json({ error: 'Failed to unlist item' });
            }

            return res.status(200).json({
                message: 'Item unlisted successfully. Only buyers can access it now.',
                unlisted: true
            });
        }
    } catch (error) {
        console.error('Error processing delete request:', error);
        return res.status(500).json({ error: 'Failed to process request' });
    }
}

export default function deleteHandler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    return requireAuth(req, res, handler);
}
