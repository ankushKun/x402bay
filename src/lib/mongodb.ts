import { MongoClient, Db, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

if (!process.env.ATLAS_USERNAME || !process.env.ATLAS_PASSWORD) {
  throw new Error('Please add your MongoDB Atlas credentials to .env.local');
}

const uri: string = `mongodb+srv://${process.env.ATLAS_USERNAME}:${process.env.ATLAS_PASSWORD}@cluster0.d3iioc0.mongodb.net/?appName=Cluster0`;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'x402bay');
}

// GridFS bucket for storing files
let digitalFilesBucket: GridFSBucket;
let itemImagesBucket: GridFSBucket;

export async function getDigitalFilesBucket(): Promise<GridFSBucket> {
  if (!digitalFilesBucket) {
    const db = await getDb();
    digitalFilesBucket = new GridFSBucket(db, {
      bucketName: 'digitalFiles',
    });
  }
  return digitalFilesBucket;
}

export async function getItemImagesBucket(): Promise<GridFSBucket> {
  if (!itemImagesBucket) {
    const db = await getDb();
    itemImagesBucket = new GridFSBucket(db, {
      bucketName: 'itemImages',
    });
  }
  return itemImagesBucket;
}

// Helper function to upload a file buffer to GridFS
export async function uploadToGridFS(
  bucket: GridFSBucket,
  filename: string,
  buffer: Buffer,
  metadata?: any
): Promise<string> {
  return new Promise((resolve, reject) => {
    const readStream = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(filename, { metadata });

    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });

    readStream.pipe(uploadStream);
  });
}

// Helper function to download a file from GridFS
export async function downloadFromGridFS(
  bucket: GridFSBucket,
  filename: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const downloadStream = bucket.openDownloadStreamByName(filename);

    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', reject);
    downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// Helper function to check if a file exists in GridFS
export async function fileExistsInGridFS(
  bucket: GridFSBucket,
  filename: string
): Promise<boolean> {
  try {
    const files = await bucket.find({ filename }).limit(1).toArray();
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

// Helper function to delete a file from GridFS
export async function deleteFromGridFS(
  bucket: GridFSBucket,
  filename: string
): Promise<void> {
  const files = await bucket.find({ filename }).toArray();
  for (const file of files) {
    await bucket.delete(file._id);
  }
}

export default clientPromise;
