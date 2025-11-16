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
    const db = await getDb();
    const items = await db.collection<FileItem>(COLLECTIONS.ITEMS)
      .find({})
      .sort({ uploadedAt: -1 })
      .toArray();

    // Convert ObjectId to string for serialization
    const serializedItems = items.map(item => ({
      ...item,
      _id: item._id?.toString(),
    }));

    res.status(200).json({ items: serializedItems });
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
}
