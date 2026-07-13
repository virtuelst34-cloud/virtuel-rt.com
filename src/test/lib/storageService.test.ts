import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadChatFile, CHAT_UPLOADS_BUCKET } from '@/lib/storageService';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      })),
    },
  },
}));

describe('storageService', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ data: { path: 'guest/123-file.png' }, error: null });
  });

  it('upload un fichier vers le bucket chat-uploads', async () => {
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const url = await uploadChatFile(file, 'GuestUser');

    expect(url).toBe('https://example.com/file.png');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringContaining('GuestUser/'),
      file,
      expect.objectContaining({ upsert: false }),
    );
  });

  it('refuse les fichiers > 5 Mo', async () => {
    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.bin', { type: 'application/octet-stream' });
    await expect(uploadChatFile(big, 'user')).rejects.toThrow(/5 Mo/);
  });

  it('expose le nom du bucket', () => {
    expect(CHAT_UPLOADS_BUCKET).toBe('chat-uploads');
  });
});
