import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import { FileItem, ItemImage, TokenInfo, COLLECTIONS } from '@/lib/models';
import { verifySession, verifyUploaderOwnership } from '@/lib/auth';
import CONSTANTS from '@/lib/constants';

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify SIWE authentication via NextAuth session
  const { authenticated, address: authenticatedAddress } = await verifySession(req);
  if (!authenticated || !authenticatedAddress) {
    return res.status(401).json({ error: 'Unauthorized: Please sign in with your wallet' });
  }

  try {
    await ensureDirectories();

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
    const token = Array.isArray(fields.token) ? fields.token[0] : fields.token;
    const uploaderAddress = Array.isArray(fields.uploaderAddress) ? fields.uploaderAddress[0] : fields.uploaderAddress;
    const itemImagesCount = parseInt(Array.isArray(fields.itemImagesCount) ? fields.itemImagesCount[0] : fields.itemImagesCount || '0');

    // Parse tags
    let tags: string[] = [];
    try {
      tags = JSON.parse(tagsString || '[]');
    } catch {
      tags = [];
    }

    // Parse token information (format: "chainId:tokenSymbol")
    let tokenInfo: TokenInfo | null = null;
    if (token) {
      const [chainId, tokenSymbol] = token.split(':');
      const tokenData = CONSTANTS.TOKENS[chainId]?.[tokenSymbol];

      if (tokenData && chainId) {
        tokenInfo = {
          chainId,
          contractAddress: tokenData.address,
          symbol: tokenData.symbol,
          name: tokenData.name,
          decimals: tokenData.decimals,
        };
      }
    }

    // Get digital file
    const digitalFile = Array.isArray(files.digitalFile) ? files.digitalFile[0] : files.digitalFile;

    if (!digitalFile || !name || !description || !category || !price || !tokenInfo || !uploaderAddress) {
      return res.status(400).json({ error: 'Missing required fields or invalid token' });
    }

    // Verify that the uploader address matches the authenticated wallet
    if (!verifyUploaderOwnership(uploaderAddress, authenticatedAddress)) {
      return res.status(403).json({ error: 'Forbidden: Uploader address does not match authenticated wallet' });
    }

    if (itemImagesCount === 0) {
      return res.status(400).json({ error: 'At least one item image is required' });
    }

    const fileId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const fileExt = path.extname(digitalFile.originalFilename || '');
    const filename = `${fileId}${fileExt}`;
    const newPath = path.join(UPLOADS_DIR, filename);

    // Move digital file to final location
    await fs.rename(digitalFile.filepath, newPath);

    // Process item images
    const itemImages: ItemImage[] = [];
    for (let i = 0; i < itemImagesCount; i++) {
      const imageFile = Array.isArray(files[`itemImage${i}`])
        ? files[`itemImage${i}`][0]
        : files[`itemImage${i}`];

      if (imageFile) {
        const imageExt = path.extname(imageFile.originalFilename || '');
        const imageFilename = `${fileId}_image${i}${imageExt}`;
        const imagePath = path.join(ITEM_IMAGES_DIR, imageFilename);

        // Move image to final location
        await fs.rename(imageFile.filepath, imagePath);

        itemImages.push({
          filename: imageFilename,
          originalName: imageFile.originalFilename || 'image',
          size: imageFile.size,
          isThumbnail: i === 0, // First image is thumbnail
        });
      }
    }

    const fileItem: Omit<FileItem, '_id'> = {
      id: fileId,
      name,
      title: name, // Keep for backwards compatibility
      description,
      category,
      tags,
      price,
      token: tokenInfo,
      filename,
      originalName: digitalFile.originalFilename || 'unknown',
      size: digitalFile.size,
      itemImages,
      uploadedAt: new Date().toISOString(),
      uploaderAddress,
      downloadCount: 0, // Initialize download counter
    };

    // Save to MongoDB
    const db = await getDb();
    const result = await db.collection(COLLECTIONS.ITEMS).insertOne(fileItem);

    res.status(200).json({
      success: true,
      item: { ...fileItem, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
