/**
 * Lazy PDF loader using pdfjs-dist.
 *
 * Exported as a module so the 300KB+ bundle is only loaded when the user
 * actually visits /books — never on quiz or vocab pages.
 */

export interface PdfBlock {
  text: string;
  heading: boolean;
}

export interface PdfPage {
  pageNum: number;
  blocks: PdfBlock[];
}

export interface PdfMeta {
  totalPages: number;
  title?: string;
}

/**
 * Joins raw PDF text items from a single page into readable blocks, tagging
 * lines whose font is noticeably larger than the body text as headings.
 *
 * PDF text items are positioned absolutely — there is no semantic notion of
 * "line", "paragraph", or "heading". Line/paragraph grouping is inferred from
 * Y/X coordinates; heading detection compares each line's font height against
 * the page's dominant (body) font height.
 *
 * Known limitations (acceptable for PoC):
 *   - Multi-column layouts produce interleaved text.
 *   - Hyphenated line-breaks are not re-joined.
 *   - Headers / footers appear inline unless filtered by caller.
 *   - Heading detection is font-size based only (bold-only headings are missed).
 */
export function itemsToBlocks(
  items: { str: string; transform: number[]; width?: number }[]
): PdfBlock[] {
  if (!items.length) return [];

  // Glyph height from the text-item transform [a, b, c, d, e, f]; hypot of the
  // skew/scale-Y terms stays correct for rotated/skewed text.
  const fontHeight = (t: number[]) => Math.hypot(t[2], t[3]) || Math.abs(t[3]);

  // Sort by Y desc (PDF Y grows upward), then X asc
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  const SAME_LINE_THRESHOLD = 4;    // px difference → same line
  const PARA_GAP_THRESHOLD  = 14;   // px gap → paragraph break
  const HEADING_RATIO       = 1.18; // line font ≥ body × ratio → heading
  // Gap ≥ 20% of font height is a real word boundary; smaller gaps are word
  // fragments split across multiple PDF text items (e.g. "functio" + "ns").
  const WORD_GAP_RATIO      = 0.2;

  // Build lines, tracking the largest font height on each.
  const linesRaw: { y: number; text: string; size: number }[] = [];
  let currentY    = sorted[0].transform[5];
  let currentText = sorted[0].str;
  let currentSize = fontHeight(sorted[0].transform);
  let currentEndX = sorted[0].transform[4] + (sorted[0].width ?? 0);

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const y = item.transform[5];
    if (Math.abs(y - currentY) <= SAME_LINE_THRESHOLD) {
      // Same line — decide whether to insert a space based on the pixel gap
      // between the end of the previous item and the start of this one.
      const gap = item.transform[4] - currentEndX;
      const isWordBoundary = gap >= currentSize * WORD_GAP_RATIO
        || item.str.startsWith(' ')
        || currentText.endsWith(' ');
      const needsSpace = isWordBoundary && currentText.length > 0 && item.str.length > 0;
      currentText += (needsSpace ? ' ' : '') + item.str;
      currentSize  = Math.max(currentSize, fontHeight(item.transform));
      currentEndX  = item.transform[4] + (item.width ?? 0);
    } else {
      linesRaw.push({ y: currentY, text: currentText.trim(), size: currentSize });
      currentY    = y;
      currentText = item.str;
      currentSize = fontHeight(item.transform);
      currentEndX = item.transform[4] + (item.width ?? 0);
    }
  }
  linesRaw.push({ y: currentY, text: currentText.trim(), size: currentSize });

  // Dominant (body) font height: bucket sizes to 0.5px and weight each by the
  // text length on it, so plentiful body text outweighs the rare large heading.
  const weight = new Map<number, number>();
  for (const line of linesRaw) {
    if (!line.text) continue;
    const bucket = Math.round(line.size * 2) / 2;
    weight.set(bucket, (weight.get(bucket) ?? 0) + line.text.length);
  }
  let bodySize = 0;
  let bestWeight = -1;
  for (const [size, w] of weight) {
    if (w > bestWeight) { bestWeight = w; bodySize = size; }
  }

  // Merge lines into blocks; a line whose font clears the heading ratio is
  // emitted as its own standalone heading block.
  const blocks: PdfBlock[] = [];
  let para = '';
  const flush = () => { if (para) { blocks.push({ text: para, heading: false }); para = ''; } };

  for (let i = 0; i < linesRaw.length; i++) {
    const line = linesRaw[i];
    if (!line.text) { flush(); continue; }

    if (bodySize > 0 && line.size >= bodySize * HEADING_RATIO) {
      flush();
      blocks.push({ text: line.text, heading: true });
      continue;
    }

    if (!para) { para = line.text; continue; }

    const prevY = linesRaw[i - 1].y;
    const gap = prevY - line.y;

    if (gap > PARA_GAP_THRESHOLD) {
      flush();
      para = line.text;
    } else {
      // Heuristic: if previous line ends with sentence-boundary, start new para
      const endsWithBreak = /[.!?]$/.test(para.trimEnd());
      const nextStartsCapital = /^[A-Z]/.test(line.text);
      if (gap > PARA_GAP_THRESHOLD * 0.8 && endsWithBreak && nextStartsCapital) {
        flush();
        para = line.text;
      } else {
        // Continuation of same paragraph — join with space
        para += (para.endsWith('-') ? '' : ' ') + line.text;
      }
    }
  }
  flush();

  return blocks.filter((b) => b.text.trim().length > 1);
}

/**
 * Loads a PDF from `url` and extracts text page by page.
 *
 * @param url     Relative or absolute URL to the PDF file.
 * @param onPage  Called for each page as it is extracted (progressive rendering).
 * @returns       Meta info (totalPages, title).
 */
export async function loadPdf(
  url: string,
  onPage: (page: PdfPage) => void
): Promise<PdfMeta> {
  // Dynamic import — keeps pdfjs-dist out of the main bundle.
  // The *legacy* build is transpiled and polyfilled (notably Promise.withResolvers)
  // for older browsers. The modern build calls Promise.withResolvers() directly,
  // which is absent on Safari < 17.4 (iOS 16/early 17) and throws
  // "undefined is not a function" during getDocument().
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // The worker has its own global scope, so it must use the matching legacy build
  // to get the same polyfills. Vite resolves this to an emitted asset URL.
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const loadingTask = pdfjsLib.getDocument({ url });
  const pdf = await loadingTask.promise;

  const meta = await pdf.getMetadata().catch(() => null);
  const title = (meta?.info as { Title?: string })?.Title;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const pdfPage = await pdf.getPage(pageNum);
    const textContent = await pdfPage.getTextContent();

    // pdfjs 4+ item shape: { str, transform, width, ... }
    const items = textContent.items
      .filter((item): item is typeof item & { str: string; transform: number[]; width?: number } =>
        'str' in item && Array.isArray((item as { transform?: unknown }).transform)
      );

    const blocks = itemsToBlocks(items);
    onPage({ pageNum, blocks });
  }

  return { totalPages: pdf.numPages, title };
}
