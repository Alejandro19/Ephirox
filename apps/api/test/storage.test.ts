import { describe, it, expect } from 'vitest';
import { uploadFile, deleteFile } from '../src/storage/index.js';

describe('storage', () => {
  it('uploads a file to Supabase Storage and returns a public URL', async () => {
    const url = await uploadFile('test-uploads', Buffer.from('hello world'), 'text/plain', 'sample.txt');
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('sample.txt');
    await deleteFile(url);
  });

  // Reproduce el bug real reportado: Supabase Storage responde 400 "Invalid
  // key" ante espacios o acentos en NFD dentro del object key — un audio
  // llamado "Manifestación 2026.m4a" fallaba en silencio (solo "Error
  // interno del servidor.", sin detalle) antes del fix en sanitizeFilename.
  it('uploads a file whose original name has spaces and accents, without Supabase rejecting the key', async () => {
    const url = await uploadFile('test-uploads', Buffer.from('audio-fake-bytes'), 'audio/mp4', 'Manifestación 2026.m4a');
    expect(url).toMatch(/^https:\/\//);
    expect(url).not.toMatch(/%20| /);
    await deleteFile(url);
  });
});
