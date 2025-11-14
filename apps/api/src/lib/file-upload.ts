import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

const STORAGE_DIR = process.env.STORAGE_DIR || join(process.cwd(), 'storage', 'attachments');

// Ensure storage directory exists
export async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

export interface FileUploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export async function saveFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  ticketId: string
): Promise<FileUploadResult> {
  await ensureStorageDir();

  // Generate unique filename
  const fileExt = fileName.split('.').pop() || '';
  const uniqueFileName = `${randomUUID()}.${fileExt}`;
  const ticketDir = join(STORAGE_DIR, ticketId);
  
  // Ensure ticket directory exists
  await fs.mkdir(ticketDir, { recursive: true });
  
  const filePath = join(ticketDir, uniqueFileName);
  
  // Write file to disk
  await fs.writeFile(filePath, fileBuffer);

  return {
    fileName,
    filePath,
    fileSize: fileBuffer.length,
    mimeType,
  };
}

export async function getFile(filePath: string): Promise<Buffer> {
  return await fs.readFile(filePath);
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

