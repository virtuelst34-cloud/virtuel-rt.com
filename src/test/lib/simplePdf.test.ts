import { describe, it, expect } from 'vitest';
import { buildTextPdf } from '@/lib/simplePdf';

describe('buildTextPdf', () => {
  it('génère un blob PDF valide', async () => {
    const blob = buildTextPdf('Conversation test', [
      'Conversation - Salon libre',
      'Exporte le: 17/07/2026',
      '',
      '[17/07/2026] Alice:',
      'Bonjour café été',
    ]);

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const header = String.fromCharCode(...bytes.slice(0, 8));
    expect(header).toBe('%PDF-1.4');

    const asText = String.fromCharCode(...bytes);
    expect(asText).toContain('%%EOF');
    expect(asText).toContain('/Type /Catalog');
  });
});
