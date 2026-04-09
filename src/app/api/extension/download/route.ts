import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';

export async function GET() {
  try {
    // Path to the chrome-extension folder
    const extensionPath = path.join(process.cwd(), 'chrome-extension');
    
    // Check if directory exists
    try {
      await fs.access(extensionPath);
    } catch {
      return NextResponse.json(
        { error: 'Extension files not found' },
        { status: 404 }
      );
    }

    // Create a zip archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Collect chunks
    const chunks: Buffer[] = [];
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    // Add the chrome-extension directory contents
    archive.directory(extensionPath, 'threadmind-extension');
    
    // Finalize and wait for completion
    await archive.finalize();
    
    // Wait a bit for all data to be collected
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const buffer = Buffer.concat(chunks);
    
    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="threadmind-extension.zip"',
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Extension download error:', error);
    return NextResponse.json(
      { error: 'Failed to create extension download' },
      { status: 500 }
    );
  }
}
