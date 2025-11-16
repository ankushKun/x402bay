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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const db = await getDb();
    const item = await db.collection<FileItem>(COLLECTIONS.ITEMS).findOne({ id });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Convert ObjectId to string for serialization
    const serializedItem = {
      ...item,
      _id: item._id?.toString(),
    };

    res.status(200).json({ item: serializedItem });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
}
