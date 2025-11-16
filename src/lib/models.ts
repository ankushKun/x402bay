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
}

export interface ItemImage {
  filename: string;
  originalName: string;
  size: number;
  isThumbnail: boolean;
}

export const COLLECTIONS = {
  ITEMS: 'items',
} as const;
