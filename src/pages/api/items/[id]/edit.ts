import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import { FileItem, ItemImage, COLLECTIONS } from '@/lib/models';
import { verifySession, verifyUploaderOwnership } from '@/lib/auth';

export const config = {
    api: {
        bodyParser: false,
    },
};

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const ITEM_IMAGES_DIR = path.join(process.cwd(), 'uploads', 'item-images');

async function ensureDirectories() {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(ITEM_IMAGES_DIR, { recursive: true });
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid item ID' });
    }

    // Verify SIWE authentication via NextAuth session
    const { authenticated, address } = await verifySession(req);
    if (!authenticated || !address) {
        return res.status(401).json({ error: 'Unauthorized: Please sign in with your wallet' });
    }

    const db = await getDb();
    const collection = db.collection<FileItem>(COLLECTIONS.ITEMS);

    if (req.method === 'GET') {
        // Get item details for editing
        try {
            const item = await collection.findOne({ id });

            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }

            // Verify ownership
            if (!verifyUploaderOwnership(item.uploaderAddress, address)) {
                return res.status(403).json({ error: 'You can only edit your own items' });
            }

            return res.status(200).json({
                item: {
                    ...item,
                    _id: item._id?.toString(),
                }
            });
        } catch (error) {
            console.error('Error fetching item:', error);
            return res.status(500).json({ error: 'Failed to fetch item' });
        }
    } else if (req.method === 'PUT') {
        // Update item details with optional file uploads
        try {
            await ensureDirectories();

            const item = await collection.findOne({ id });

            if (!item) {
                return res.status(404).json({ error: 'Item not found' });
            }

            // Verify ownership
            if (!verifyUploaderOwnership(item.uploaderAddress, address)) {
                return res.status(403).json({ error: 'You can only edit your own items' });
            }

            const form = new IncomingForm({
                uploadDir: UPLOADS_DIR,
                keepExtensions: true,
                maxFileSize: 100 * 1024 * 1024, // 100MB
            });

            const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve([fields, files]);
                });
            });

            // Extract fields
            const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
            const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
            const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
            const tagsString = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags;
            const price = Array.isArray(fields.price) ? fields.price[0] : fields.price;
            const itemImagesCount = parseInt(Array.isArray(fields.itemImagesCount) ? fields.itemImagesCount[0] : fields.itemImagesCount || '0');
            const removedImagesString = Array.isArray(fields.removedImages) ? fields.removedImages[0] : fields.removedImages;

            // Validate required fields
            if (!name || !description || !price || !category) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            // Parse tags
            let tags: string[] = [];
            try {
                tags = JSON.parse(tagsString || '[]');
            } catch {
                tags = [];
            }

            // Parse removed images
            let removedImages: string[] = [];
            try {
                removedImages = JSON.parse(removedImagesString || '[]');
            } catch {
                removedImages = [];
            }

            // Prepare update data
            const updateData: Partial<FileItem> = {
                name,
                description,
                price,
                category: Number(category),
                tags,
            };

            // Handle new digital file if uploaded
            const newDigitalFile = Array.isArray(files.digitalFile) ? files.digitalFile[0] : files.digitalFile;
            if (newDigitalFile) {
                // Delete old file
                try {
                    const oldFilePath = path.join(UPLOADS_DIR, item.filename);
                    await fs.unlink(oldFilePath);
                } catch (e) {
                    console.error('Error deleting old file:', e);
                }

                // Save new file
                const fileExt = path.extname(newDigitalFile.originalFilename || '');
                const newFileName = `${id}${fileExt}`;
                const newFilePath = path.join(UPLOADS_DIR, newFileName);
                await fs.rename(newDigitalFile.filepath, newFilePath);

                updateData.filename = newFileName;
                updateData.originalName = newDigitalFile.originalFilename || newFileName;
                updateData.size = newDigitalFile.size;
            }

            // Handle new item images if uploaded
            if (itemImagesCount > 0 || removedImages.length > 0) {
                // Start with existing images
                let updatedImages: ItemImage[] = item.itemImages || [];

                // Remove selected existing images
                if (removedImages.length > 0) {
                    for (const removedImg of removedImages) {
                        // Delete file from disk
                        try {
                            const oldImagePath = path.join(ITEM_IMAGES_DIR, removedImg);
                            await fs.unlink(oldImagePath);
                        } catch (e) {
                            console.error('Error deleting removed image:', e);
                        }
                    }
                    // Filter out removed images
                    updatedImages = updatedImages.filter(img => !removedImages.includes(img.filename));
                }

                // Add new images
                if (itemImagesCount > 0) {
                    const newItemImages: ItemImage[] = [];

                    // Process new images
                    for (let i = 0; i < itemImagesCount; i++) {
                        const imageFile = Array.isArray(files[`itemImage${i}`]) ? files[`itemImage${i}`][0] : files[`itemImage${i}`];
                        if (imageFile) {
                            const imageExt = path.extname(imageFile.originalFilename || '');
                            const imageFileName = `${id}-image-${Date.now()}-${i}${imageExt}`;
                            const imagePath = path.join(ITEM_IMAGES_DIR, imageFileName);
                            await fs.rename(imageFile.filepath, imagePath);

                            newItemImages.push({
                                filename: imageFileName,
                                originalName: imageFile.originalFilename || imageFileName,
                                size: imageFile.size,
                                isThumbnail: updatedImages.length === 0 && i === 0,
                            });
                        }
                    }

                    updatedImages = [...updatedImages, ...newItemImages];
                }

                // Update thumbnail flags - first image is always thumbnail
                if (updatedImages.length > 0) {
                    updatedImages = updatedImages.map((img, idx) => ({
                        ...img,
                        isThumbnail: idx === 0
                    }));
                }

                updateData.itemImages = updatedImages;
            }

            // Update the item
            const result = await collection.updateOne(
                { id },
                { $set: updateData }
            );

            if (result.modifiedCount === 0 && result.matchedCount === 0) {
                return res.status(500).json({ error: 'Failed to update item' });
            }

            return res.status(200).json({
                message: 'Item updated successfully',
                item: { ...item, ...updateData, _id: item._id?.toString() }
            });
        } catch (error) {
            console.error('Error updating item:', error);
            return res.status(500).json({ error: 'Failed to update item' });
        }
    } else {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}

export default handler;
