import { ObjectId } from 'mongodb';

export interface TokenInfo {
  chainId: string;
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface FileItem {
  _id?: ObjectId;
  id: string;
  name: string;
  title?: string; // Legacy field for backwards compatibility
  description: string;
  category: number;
  tags: string[];
  price: string;
  token: TokenInfo;
  filename: string;
  originalName: string;
  size: number;
  itemImages: ItemImage[];
  uploadedAt: string;
  uploaderAddress: string;
  downloadCount?: number; // Track number of downloads
  likes?: string[]; // Array of wallet addresses that liked this item
  isListed?: boolean; // Whether the item is visible to public (default: true)
}

export interface ItemImage {
  filename: string;
  originalName: string;
  size: number;
  isThumbnail: boolean;
}

export interface Purchase {
  _id?: ObjectId;
  itemId: string;
  buyerAddress: string;
  transactionHash?: string;
  amount: string;
  purchasedAt: string;
}

export const COLLECTIONS = {
  ITEMS: 'items',
  PURCHASES: 'purchases',
} as const;
