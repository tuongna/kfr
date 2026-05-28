/**
 * Lazy PDF loader using pdfjs-dist.
 *
 * Exported as a module so the 300KB+ bundle is only loaded when the user
 * actually visits /books — never on quiz or vocab pages.
 */

export interface PdfPage {
  pageNum: number;
  paragraphs: string[];
}

export interface PdfMeta {
  totalPages: number;
  title?: string;
}

/**
 * Joins raw PDF text items from a single page into readable paragraphs.
 *
 * PDF text items are positioned absolutely — there is no semantic notion of
 * "line" or "paragraph". This heuristic merges items that share the same
 * approximate Y coordinate (same line) and inserts paragraph breaks when
 * the Y gap is larger than a line-height threshold.
 *
 * Known limitations (acceptable for PoC):
 *   - Multi-column layouts produce interleaved text.
 *   - Hyphenated line-breaks are not re-joined.
 *   - Headers / footers appear inline unless filtered by caller.
 */
export function itemsToParagraphs(
  items: { str: string; transform: number[] }[]
): string[] {
  if (!items.length) return [];

  // Sort by Y desc (PDF Y grows upward), then X asc
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 2) return yDiff;
    return a.transform[4] - b.transform[4];
  });

  const SAME_LINE_THRESHOLD = 4;    // px difference → same line
  const PARA_GAP_THRESHOLD  = 14;   // px gap → paragraph break

  const linesRaw: { y: number; text: string }[] = [];
  let currentY = sorted[0].transform[5];
  let currentText = sorted[0].str;

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const y = item.transform[5];
    if (Math.abs(y - currentY) <= SAME_LINE_THRESHOLD) {
      // Same line — append with space if there's a gap
      const needsSpace = currentText.length > 0 && !currentText.endsWith(' ') && item.str.length > 0 && !item.str.startsWith(' ');
      currentText += (needsSpace ? ' ' : '') + item.str;
    } else {
      linesRaw.push({ y: currentY, text: currentText.trim() });
      currentY = y;
      currentText = item.str;
    }
  }
  linesRaw.push({ y: currentY, text: currentText.trim() });

  // Merge lines into paragraphs based on Y gap
  const paragraphs: string[] = [];
  let para = '';

  for (let i = 0; i < linesRaw.length; i++) {
    const line = linesRaw[i];
    if (!line.text) {
      if (para) { paragraphs.push(para); para = ''; }
      continue;
    }
    if (i === 0) { para = line.text; continue; }

    const prevY = linesRaw[i - 1].y;
    const gap = prevY - line.y;

    if (gap > PARA_GAP_THRESHOLD) {
      if (para) paragraphs.push(para);
      para = line.text;
    } else {
      // Heuristic: if previous line ends with sentence-boundary, start new para
      const endsWithBreak = /[.!?]$/.test(para.trimEnd());
      const nextStartsCapital = /^[A-Z]/.test(line.text);
      if (gap > PARA_GAP_THRESHOLD * 0.8 && endsWithBreak && nextStartsCapital) {
        if (para) paragraphs.push(para);
        para = line.text;
      } else {
        // Continuation of same paragraph — join with space
        para += (para.endsWith('-') ? '' : ' ') + line.text;
      }
    }
  }
  if (para) paragraphs.push(para);

  return paragraphs.filter((p) => p.trim().length > 1);
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

    // pdfjs 4+ item shape: { str, transform, ... }
    const items = textContent.items
      .filter((item): item is typeof item & { str: string; transform: number[] } =>
        'str' in item && Array.isArray((item as { transform?: unknown }).transform)
      );

    const paragraphs = itemsToParagraphs(items);
    onPage({ pageNum, paragraphs });
  }

  return { totalPages: pdf.numPages, title };
}
