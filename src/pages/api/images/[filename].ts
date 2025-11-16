import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { getItemImagesBucket, downloadFromGridFS, fileExistsInGridFS } from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Security: Prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Get the image from GridFS
    const itemImagesBucket = await getItemImagesBucket();

    // Check if file exists
    const fileExists = await fileExistsInGridFS(itemImagesBucket, filename);
    if (!fileExists) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Download the image from GridFS
    const imageBuffer = await downloadFromGridFS(itemImagesBucket, filename);

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set caching headers for better performance
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', imageBuffer.length);

    // Send the image
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to load image' });
  }
}
