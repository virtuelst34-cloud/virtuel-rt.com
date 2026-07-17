/**
 * Générateur PDF minimal (texte, Helvetica / WinAnsi) — sans dépendance externe.
 */

const WINANSI: Record<string, number> = {
  '€': 128, '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135,
  'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140, 'Ž': 142,
  '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151,
  '˜': 152, '™': 153, 'š': 154, '›': 155, 'œ': 156, 'ž': 158, 'Ÿ': 159,
  '¡': 161, '¢': 162, '£': 163, '¤': 164, '¥': 165, '¦': 166, '§': 167,
  '¨': 168, '©': 169, 'ª': 170, '«': 171, '¬': 172, '®': 174, '¯': 175,
  '°': 176, '±': 177, '²': 178, '³': 179, '´': 180, 'µ': 181, '¶': 182,
  '·': 183, '¸': 184, '¹': 185, 'º': 186, '»': 187, '¼': 188, '½': 189,
  '¾': 190, '¿': 191, 'À': 192, 'Á': 193, 'Â': 194, 'Ã': 195, 'Ä': 196,
  'Å': 197, 'Æ': 198, 'Ç': 199, 'È': 200, 'É': 201, 'Ê': 202, 'Ë': 203,
  'Ì': 204, 'Í': 205, 'Î': 206, 'Ï': 207, 'Ð': 208, 'Ñ': 209, 'Ò': 210,
  'Ó': 211, 'Ô': 212, 'Õ': 213, 'Ö': 214, '×': 215, 'Ø': 216, 'Ù': 217,
  'Ú': 218, 'Û': 219, 'Ü': 220, 'Ý': 221, 'Þ': 222, 'ß': 223, 'à': 224,
  'á': 225, 'â': 226, 'ã': 227, 'ä': 228, 'å': 229, 'æ': 230, 'ç': 231,
  'è': 232, 'é': 233, 'ê': 234, 'ë': 235, 'ì': 236, 'í': 237, 'î': 238,
  'ï': 239, 'ð': 240, 'ñ': 241, 'ò': 242, 'ó': 243, 'ô': 244, 'õ': 245,
  'ö': 246, '÷': 247, 'ø': 248, 'ù': 249, 'ú': 250, 'û': 251, 'ü': 252,
  'ý': 253, 'þ': 254, 'ÿ': 255,
};

function encodeWinAnsiBytes(text: string): number[] {
  const bytes: number[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x09) {
      bytes.push(0x20, 0x20, 0x20, 0x20);
      continue;
    }
    if (code === 0x0a || code === 0x0d) {
      bytes.push(code);
      continue;
    }
    if (code >= 0x20 && code <= 0x7e) {
      bytes.push(code);
      continue;
    }
    const mapped = WINANSI[ch];
    bytes.push(mapped !== undefined ? mapped : 0x3f); // ?
  }
  return bytes;
}

function escapePdfLiteral(text: string): number[] {
  const raw = encodeWinAnsiBytes(text);
  const out: number[] = [];
  for (const b of raw) {
    if (b === 0x5c || b === 0x28 || b === 0x29) out.push(0x5c); // \ ( )
    out.push(b);
  }
  return out;
}

function ascii(s: string): number[] {
  return Array.from(s, (c) => c.charCodeAt(0));
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const parts: string[] = [];
  let remaining = line;
  while (remaining.length > maxChars) {
    let breakAt = remaining.lastIndexOf(' ', maxChars);
    if (breakAt < maxChars / 2) breakAt = maxChars;
    parts.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trimStart();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function formatPdfDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Construit un PDF multi-pages à partir de lignes de texte. */
export function buildTextPdf(title: string, lines: string[], opts?: { fontSize?: number }): Blob {
  const fontSize = opts?.fontSize ?? 10;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const lineHeight = fontSize * 1.35;
  const maxChars = Math.floor((pageWidth - margin * 2) / (fontSize * 0.5));
  const usableHeight = pageHeight - margin * 2;

  const wrapped: string[] = [];
  for (const raw of lines) {
    for (const chunk of raw.split('\n')) {
      if (!chunk) {
        wrapped.push('');
        continue;
      }
      wrapped.push(...wrapLine(chunk, maxChars));
    }
  }

  const linesPerPage = Math.max(1, Math.floor(usableHeight / lineHeight) - 2);
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const objects: number[][] = [];
  const addObject = (body: number[]) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject([]);
  const pagesId = addObject([]);
  const fontId = addObject(
    ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
  );
  const infoId = addObject([
    ...ascii('<< /Title ('),
    ...escapePdfLiteral(title),
    ...ascii(`) /Producer (Virtuel-RT) /CreationDate (D:${formatPdfDate(new Date())}) >>`),
  ]);

  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const contentParts: number[][] = [ascii(`BT\n/F1 ${fontSize} Tf\n1 0 0 1 ${margin} ${pageHeight - margin - fontSize} Tm\n`)];
    let first = true;
    for (const line of pageLines) {
      if (!first) contentParts.push(ascii(`0 ${-lineHeight} Td\n`));
      first = false;
      contentParts.push([0x28, ...escapePdfLiteral(line), 0x29, ...ascii(' Tj\n')]);
    }
    contentParts.push(ascii('ET'));
    const stream = contentParts.flat();
    const contentId = addObject([
      ...ascii(`<< /Length ${stream.length} >>\nstream\n`),
      ...stream,
      ...ascii('\nendstream'),
    ]);
    const pageId = addObject(
      ascii(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
          `/Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
      ),
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = ascii(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  );
  objects[catalogId - 1] = ascii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const chunks: number[][] = [ascii('%PDF-1.4\n')];
  const offsets: number[] = [0];
  let length = chunks[0].length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(length);
    const obj = [...ascii(`${i + 1} 0 obj\n`), ...objects[i], ...ascii('\nendobj\n')];
    chunks.push(obj);
    length += obj.length;
  }

  const xrefPos = length;
  const xref: number[] = [...ascii(`xref\n0 ${objects.length + 1}\n`), ...ascii('0000000000 65535 f \n')];
  for (let i = 1; i <= objects.length; i++) {
    xref.push(...ascii(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`));
  }
  xref.push(
    ...ascii(
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`,
    ),
  );
  chunks.push(xref);

  return new Blob([new Uint8Array(chunks.flat())], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
