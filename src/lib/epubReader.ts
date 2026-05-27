/**
 * Lightweight EPUB reader — JSZip + manual OPF/HTML parsing.
 *
 * Avoids the heavyweight epubjs library; we only need plain text per chapter,
 * not full CSS-rendered pagination.
 *
 * EPUB structure recap:
 *   META-INF/container.xml  → rootfile path (the OPF)
 *   *.opf                   → manifest (all files) + spine (reading order)
 *   *.ncx / nav.xhtml       → Table of Contents
 *   *.xhtml / *.html        → chapter content
 */

import JSZip from 'jszip';

export interface EpubChapter {
  id: string;
  title: string;
  /** Ordered paragraphs of plain text, ready for tokenizeStem. */
  paragraphs: string[];
}

export interface EpubMeta {
  title: string;
  author: string;
  totalChapters: number;
}

// ── Internal helpers ────────────────────────────────────────────────────────

function xmlText(doc: Document, selector: string): string {
  return doc.querySelector(selector)?.textContent?.trim() ?? '';
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function parseHtml(text: string): Document {
  return new DOMParser().parseFromString(text, 'text/html');
}

/**
 * Resolves a relative href from within an OPF file that lives at `opfDir`.
 * e.g. opfDir = "OEBPS", href = "Text/chapter1.xhtml" → "OEBPS/Text/chapter1.xhtml"
 */
function resolve(opfDir: string, href: string): string {
  if (!opfDir) return href;
  return `${opfDir}/${href}`.replace(/\/\//g, '/');
}

/**
 * Extracts readable paragraphs from a chapter HTML/XHTML document.
 * Strips nav, aside, scripts, and style blocks; joins inline elements.
 */
function extractParagraphs(doc: Document): string[] {
  // Remove non-content elements
  for (const sel of ['script', 'style', 'nav', 'aside', 'figure', 'figcaption']) {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const body = doc.body ?? doc.documentElement;
  const paras: string[] = [];

  // Walk block-level elements that directly contain text
  const blockSels = ['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'pre', 'td', 'th'];
  const seen = new Set<Element>();

  for (const sel of blockSels) {
    for (const el of Array.from(body.querySelectorAll(sel))) {
      if (seen.has(el)) continue;
      seen.add(el);

      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text.length > 1) paras.push(text);
    }
  }

  // If no block elements found (rare), fall back to full body text split by newline
  if (paras.length === 0) {
    const raw = (body.textContent ?? '').replace(/\t/g, ' ').replace(/[ \t]+/g, ' ');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (t.length > 1) paras.push(t);
    }
  }

  return paras;
}

/**
 * Tries to find a human-readable chapter title from the HTML document or
 * falls back to the spine id.
 */
function chapterTitle(doc: Document, fallback: string): string {
  const h = doc.querySelector('h1, h2, h3, title');
  const t = h?.textContent?.trim() ?? '';
  // Skip generic titles like "Chapter 1" placeholders that are very short
  return t.length > 0 ? t : fallback;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches and parses an EPUB file, emitting chapters progressively.
 *
 * @param url       URL to the .epub file (same-origin or CORS-enabled).
 * @param onChapter Called for each chapter as it is parsed.
 * @returns         Book metadata.
 */
export async function loadEpub(
  url: string,
  onChapter: (chapter: EpubChapter) => void
): Promise<EpubMeta> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.url}`);

  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. container.xml → OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Not a valid EPUB: META-INF/container.xml missing');

  const containerDoc = parseXml(containerXml);
  const opfPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path') ?? '';
  if (!opfPath) throw new Error('Cannot find OPF rootfile path');

  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';

  // 2. OPF → metadata + manifest + spine
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) throw new Error(`OPF file not found: ${opfPath}`);

  const opfDoc = parseXml(opfXml);

  const bookTitle = xmlText(opfDoc, 'title') || 'Unknown Title';
  const bookAuthor = xmlText(opfDoc, 'creator') || '';

  // Build manifest: id → { href, mediaType }
  const manifest = new Map<string, { href: string; mediaType: string }>();
  for (const item of Array.from(opfDoc.querySelectorAll('manifest > item'))) {
    const id = item.getAttribute('id') ?? '';
    const href = item.getAttribute('href') ?? '';
    const mediaType = item.getAttribute('media-type') ?? '';
    if (id) manifest.set(id, { href, mediaType });
  }

  // Spine: ordered list of idref → manifest id
  const spineItems = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((el) => el.getAttribute('idref') ?? '')
    .filter((id) => id && manifest.has(id))
    .filter((id) => {
      const mt = manifest.get(id)!.mediaType;
      return mt.includes('html') || mt.includes('xhtml') || mt === '';
    });

  // 3. Parse each spine item
  let chapterIdx = 0;
  for (const idref of spineItems) {
    const entry = manifest.get(idref)!;
    const filePath = resolve(opfDir, entry.href);
    const html = await zip.file(filePath)?.async('string');
    if (!html) continue;

    const doc = parseHtml(html);
    const paragraphs = extractParagraphs(doc);

    // Skip near-empty chapters (cover page, copyright boilerplate < 3 lines)
    if (paragraphs.length < 3) continue;

    const title = chapterTitle(doc, `Chapter ${++chapterIdx}`);
    onChapter({ id: idref, title, paragraphs });

    // Yield to event loop so UI can update
    await new Promise((r) => setTimeout(r, 0));
  }

  return { title: bookTitle, author: bookAuthor, totalChapters: chapterIdx };
}
