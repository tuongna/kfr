<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { db } from '$lib/db';
  import { authUser } from '$lib/stores/auth';
  import { tokenizeStem } from '$lib/translate';
  import { loadPdf, type PdfPage } from '$lib/pdfReader';
  import { loadEpub, type EpubChapter } from '$lib/epubReader';
  import type { Term } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';
  import NgramPopup from '$lib/components/NgramPopup.svelte';

  // ── Book catalog ──────────────────────────────────────────────────────────
  // Either `file` (in-app reader) or `externalUrl` (link to publisher) — at least one required.
  interface BookEntry {
    id: string;
    title: string;
    author: string;
    year: number;
    file?: string;
    externalUrl?: string;
    license?: string;
    sourceUrl?: string;
    tags: string[];
    description: string;
  }

  let catalog: BookEntry[] = [];
  let selectedBook: BookEntry | null = null;

  // ── Reader state (unified PDF + EPUB) ────────────────────────────────────
  // A "section" is either a PDF page or an EPUB chapter — same shape for UI.
  interface Section {
    label: string;     // "Page 3" or chapter title
    paragraphs: string[];
  }

  type FileType = 'pdf' | 'epub';
  let fileType: FileType = 'pdf';
  let sections: Section[] = [];
  let totalSections = 0;       // known total (PDF: numPages; EPUB: grows as loaded)
  let currentIdx = 0;
  let loadError = '';
  let loadPhase: 'idle' | 'loading' | 'done' = 'idle';
  let showToc = false;         // EPUB: sidebar chapter list

  // ── Reading position persistence ─────────────────────────────────────────
  const STORAGE_KEY = 'kfr:book-reader';

  function saveReadingState() {
    if (!selectedBook) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookId: selectedBook.id, sectionIdx: currentIdx }));
    } catch {}
  }

  function loadReadingState(): { bookId: string; sectionIdx: number } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  // ── Translate (identical to quiz) ────────────────────────────────────────
  let allTerms: Term[] = [];
  let selectedTermId: string | null = null;
  let ngramSentence: string | null = null;
  let ngramCharIdx = 0;
  let lastClickedSentence = '';
  let lastClickedCharIdx = 0;

  $: currentUserId = $authUser?.id;
  $: current = sections[currentIdx] ?? null;
  $: tokenizedParagraphs = current
    ? current.paragraphs.map((p) => tokenizeStem(p, allTerms))
    : [];
  $: isEpub = fileType === 'epub';

  // ── Init ─────────────────────────────────────────────────────────────────
  onMount(async () => {
    allTerms = await db.terms.toArray();
    try {
      const res = await fetch(`${base}/books/catalog.json`);
      if (res.ok) catalog = await res.json();
    } catch { /* catalog optional */ }

    // Restore last reading state
    const saved = loadReadingState();
    if (saved && catalog.length > 0) {
      const lastBook = catalog.find((b) => b.id === saved.bookId && b.file);
      if (lastBook) await openBook(lastBook);
    }
  });

  // ── Open book ─────────────────────────────────────────────────────────────
  async function openBook(book: BookEntry) {
    if (!book.file) {
      if (book.externalUrl) window.open(book.externalUrl, '_blank', 'noopener');
      return;
    }
    // Restore saved position for this book, if any
    const saved = loadReadingState();
    const restoreIdx = saved?.bookId === book.id ? saved.sectionIdx : 0;

    selectedBook = book;
    sections = [];
    totalSections = 0;
    currentIdx = 0;
    loadError = '';
    loadPhase = 'loading';
    showToc = false;

    const ext = book.file.split('.').pop()?.toLowerCase();
    fileType = ext === 'epub' ? 'epub' : 'pdf';
    const url = `${base}/books/${book.file}`;

    try {
      if (fileType === 'epub') {
        await loadEpub(url, (chapter: EpubChapter) => {
          sections = [...sections, { label: chapter.title, paragraphs: chapter.paragraphs }];
          totalSections = sections.length;
        });
      } else {
        const meta = await loadPdf(url, (page: PdfPage) => {
          sections = [...sections, { label: `Trang ${page.pageNum}`, paragraphs: page.paragraphs }];
        });
        totalSections = meta.totalPages;
      }
      loadPhase = 'done';
      currentIdx = Math.max(0, Math.min(restoreIdx, sections.length - 1));
      saveReadingState();
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
      loadPhase = 'idle';
    }

    allTerms = await db.terms.toArray();
  }

  function prev() { if (currentIdx > 0) { currentIdx--; showToc = false; saveReadingState(); } }
  function next() { if (currentIdx < sections.length - 1) { currentIdx++; showToc = false; saveReadingState(); } }
  function goTo(i: number) { currentIdx = Math.max(0, Math.min(i, sections.length - 1)); showToc = false; saveReadingState(); }

  // ── Tap-to-gloss (mirrors quiz) ───────────────────────────────────────────
  function handleTextInteraction(e: MouseEvent | KeyboardEvent) {
    if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target as HTMLElement;
    const termEl = target.closest<HTMLElement>('[data-term-id]');
    const wordEl = target.closest<HTMLElement>('[data-word]');
    if (!termEl && !wordEl) return;
    e.preventDefault();
    e.stopPropagation();

    if (termEl?.dataset.termId) {
      const sEl = termEl.closest<HTMLElement>('[data-sentence]');
      lastClickedSentence = sEl?.dataset.sentence ?? '';
      lastClickedCharIdx = parseInt(termEl.dataset.charIdx ?? '0', 10);
      selectedTermId = termEl.dataset.termId;
      return;
    }
    if (!currentUserId || !wordEl) return;
    const sentenceEl = wordEl.closest<HTMLElement>('[data-sentence]');
    const sentence = sentenceEl?.dataset.sentence ?? wordEl.dataset.word ?? '';
    const charIdx = parseInt(wordEl.dataset.charIdx ?? '0', 10);
    lastClickedSentence = sentence;
    lastClickedCharIdx = charIdx;
    ngramSentence = sentence;
    ngramCharIdx = charIdx;
  }

  async function onNgramSelect(termId: string) {
    ngramSentence = null;
    allTerms = await db.terms.toArray();
    selectedTermId = termId;
  }

  function openSliderFromTerm() {
    if (!lastClickedSentence) return;
    selectedTermId = null;
    ngramSentence = lastClickedSentence;
    ngramCharIdx = lastClickedCharIdx;
  }
</script>

<svelte:head>
  <title>Đọc sách · KfR</title>
</svelte:head>

<!-- ── SHELF ──────────────────────────────────────────────────────────────── -->
{#if !selectedBook}
  <div class="books-shelf-header">
    <h2 class="books-shelf-title">Thư viện tài liệu</h2>
    <p class="text-secondary" style="font-size:0.88rem;margin:0">
      Click từ bất kỳ để tra nghĩa — giống hệt chức năng trong Quiz.
    </p>
  </div>

  {#if catalog.length === 0}
    <div class="empty-state">
      <p>Chưa có tài liệu nào. Đặt file <code>.pdf</code> hoặc <code>.epub</code> vào
        <code>static/books/</code> và cập nhật <code>catalog.json</code>.</p>
    </div>
  {:else}
    <div class="books-grid">
      {#each catalog as book}
        {@const ext = book.file?.split('.').pop()?.toUpperCase() ?? 'LINK'}
        {@const isExternal = !book.file && !!book.externalUrl}
        <button class="book-card" on:click={() => openBook(book)}>
          <div class="book-cover">
            {isExternal ? '🔗' : ext === 'EPUB' ? '📘' : '📄'}
          </div>
          <div class="book-info">
            <div class="book-title">{book.title}</div>
            <div class="book-author text-secondary">{book.author} · {book.year}</div>
            <div class="book-desc text-secondary">{book.description}</div>
            <div class="tags" style="margin-top:0.5rem">
              <span class="tag format-badge" style="cursor:default">
                {isExternal ? 'TRANG GỐC ↗' : ext}
              </span>
              {#if book.license}
                <span class="tag" style="cursor:default" title={book.sourceUrl ?? ''}>
                  {book.license}
                </span>
              {/if}
              {#each book.tags as tag}
                <span class="tag" style="cursor:default">{tag}</span>
              {/each}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

<!-- ── READER ─────────────────────────────────────────────────────────────── -->
{:else}
  <!-- Reader header -->
  <div class="reader-header">
    <button class="btn btn-ghost btn-sm" on:click={() => { selectedBook = null; sections = []; }}>
      ← Thư viện
    </button>
    <span class="reader-title">{selectedBook.title}</span>
    <div style="display:flex;align-items:center;gap:0.5rem;margin-left:auto">
      {#if loadPhase === 'loading'}
        <span class="text-secondary" style="font-size:0.8rem">
          {isEpub ? `${sections.length} chương…` : `${sections.length} trang…`}
        </span>
      {:else if loadPhase === 'done'}
        <span class="text-secondary" style="font-size:0.8rem">
          {totalSections} {isEpub ? 'chương' : 'trang'}
        </span>
      {/if}
      {#if isEpub && sections.length > 0}
        <button
          class="btn btn-ghost btn-sm"
          on:click={() => (showToc = !showToc)}
          aria-label="Mục lục"
        >☰ Mục lục</button>
      {/if}
    </div>
  </div>

  <!-- Error -->
  {#if loadError}
    <div class="card" style="border-color:var(--danger);padding:1rem;display:flex;flex-direction:column;gap:0.5rem">
      <p style="color:var(--danger);margin:0">Không tải được: {loadError}</p>
      {#if selectedBook?.sourceUrl}
        <a href={selectedBook.sourceUrl} target="_blank" rel="noopener" style="font-size:0.85rem;color:var(--primary,#a78bfa)">
          Mở trang gốc: {selectedBook.sourceUrl}
        </a>
      {/if}
    </div>
  {/if}

  <!-- TOC sidebar (EPUB only) -->
  {#if showToc}
    <div
      class="toc-overlay"
      role="presentation"
      on:click={() => (showToc = false)}
    ></div>
    <div class="toc-panel" role="dialog" aria-label="Mục lục">
      <div class="toc-header">
        <span style="font-weight:600">Mục lục</span>
        <button class="gloss-close" on:click={() => (showToc = false)} aria-label="Đóng">✕</button>
      </div>
      <ol class="toc-list">
        {#each sections as sec, i}
          <li>
            <button
              class="toc-item {i === currentIdx ? 'toc-item-active' : ''}"
              on:click={() => goTo(i)}
            >{sec.label}</button>
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <!-- Loading skeleton -->
  {#if loadPhase === 'loading' && sections.length === 0}
    <div class="reader-loading">
      <div class="loading-spinner"></div>
      <p class="text-secondary">
        {isEpub ? 'Đang giải nén EPUB…' : 'Đang giải mã PDF…'}
      </p>
    </div>
  {/if}

  <!-- Content -->
  {#if current}
    <div class="reader-page-nav">
      <button class="btn btn-ghost btn-sm" on:click={prev} disabled={currentIdx === 0}>
        ←
      </button>
      <span class="reader-page-indicator">
        {#if isEpub}
          Chương {currentIdx + 1} / {totalSections || sections.length}
        {:else}
          Trang {currentIdx + 1} / {totalSections || sections.length}
        {/if}
      </span>
      <button class="btn btn-ghost btn-sm" on:click={next} disabled={currentIdx >= sections.length - 1}>
        →
      </button>
    </div>

    <div class="card reader-content">
      <!-- Chapter / page title -->
      {#if isEpub}
        <h3 class="reader-chapter-title">{current.label}</h3>
      {/if}

      <p class="glossary-hint-label">💡 Click từ bất kỳ để tra nghĩa hoặc chọn cụm từ</p>

      {#each tokenizedParagraphs as html, i}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <p
          class="reader-para"
          data-sentence={current.paragraphs[i]}
          on:click={handleTextInteraction}
          on:keydown={handleTextInteraction}
          role="presentation"
        >
          {@html html}
        </p>
      {/each}

      {#if tokenizedParagraphs.length === 0}
        <p class="text-secondary" style="font-style:italic">
          (Mục này không có nội dung văn bản.)
        </p>
      {/if}
    </div>

    <div class="reader-page-nav reader-page-nav-bottom">
      <button class="btn btn-ghost btn-sm" on:click={prev} disabled={currentIdx === 0}>
        ← {isEpub ? 'Chương trước' : 'Trang trước'}
      </button>
      {#if !isEpub}
        <div class="reader-jump">
          <span class="text-secondary" style="font-size:0.82rem">Đến trang:</span>
          <input
            type="number"
            min="1"
            max={totalSections || sections.length}
            value={currentIdx + 1}
            class="reader-page-input"
            on:change={(e) => goTo(parseInt(e.currentTarget.value) - 1)}
          />
        </div>
      {:else}
        <span class="reader-page-indicator" style="font-size:0.8rem">{current.label}</span>
      {/if}
      <button class="btn btn-ghost btn-sm" on:click={next} disabled={currentIdx >= sections.length - 1}>
        {isEpub ? 'Chương sau' : 'Trang sau'} →
      </button>
    </div>
  {:else if loadPhase === 'done' && sections.length === 0}
    <div class="empty-state">
      <p>Tài liệu không có nội dung văn bản có thể đọc.</p>
    </div>
  {/if}
{/if}

<!-- N-gram phrase picker -->
{#if ngramSentence && currentUserId}
  <NgramPopup
    sentence={ngramSentence}
    charIdx={ngramCharIdx}
    ownerId={currentUserId}
    context="general"
    on:select={(e) => onNgramSelect(e.detail)}
    on:close={() => (ngramSentence = null)}
  />
{/if}

<!-- Term detail popup -->
<TermPopup
  termId={selectedTermId}
  context="general"
  canPickPhrase={!!lastClickedSentence && !!currentUserId}
  on:close={() => { selectedTermId = null; lastClickedSentence = ''; }}
  on:pickPhrase={openSliderFromTerm}
/>

<style>
  /* ── Shelf ── */
  .books-shelf-header {
    padding: 0.75rem 0 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .books-shelf-title { margin: 0; font-size: 1.25rem; font-weight: 700; }
  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }
  .book-card {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--surface, #1a1a2e);
    border: 1px solid var(--border, rgba(255,255,255,0.1));
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s, background 0.15s;
    color: inherit;
  }
  .book-card:hover {
    border-color: var(--primary, #7c3aed);
    background: rgba(124,58,237,0.08);
  }
  .book-cover { font-size: 2.5rem; flex-shrink: 0; }
  .book-info { display: flex; flex-direction: column; gap: 0.2rem; }
  .book-title { font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
  .book-author, .book-desc { font-size: 0.8rem; line-height: 1.4; }
  .format-badge { font-weight: 700; }

  /* ── Reader header ── */
  .reader-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0 0.75rem;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }
  .reader-title {
    font-weight: 600;
    font-size: 0.95rem;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── TOC ── */
  .toc-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 200;
  }
  .toc-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(320px, 85vw);
    background: var(--bg, #0f0f1a);
    border-right: 1px solid var(--border, rgba(255,255,255,0.15));
    z-index: 201;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .toc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.1));
    flex-shrink: 0;
  }
  .toc-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
    overflow-y: auto;
    flex: 1;
  }
  .toc-item {
    display: block;
    width: 100%;
    padding: 0.55rem 1rem;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    font-size: 0.85rem;
    line-height: 1.4;
    cursor: pointer;
    transition: background 0.1s;
  }
  .toc-item:hover { background: rgba(255,255,255,0.06); }
  .toc-item-active {
    background: rgba(124,58,237,0.18);
    color: var(--primary, #a78bfa);
    font-weight: 600;
  }

  /* ── Reader content ── */
  .reader-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }
  .reader-page-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .reader-page-nav-bottom { margin-top: 0.75rem; margin-bottom: 0; }
  .reader-page-indicator { font-size: 0.85rem; color: var(--text-secondary, #9ca3af); }
  .reader-jump { display: flex; align-items: center; gap: 0.4rem; }
  .reader-page-input {
    width: 4rem;
    padding: 0.2rem 0.4rem;
    background: var(--surface, #1a1a2e);
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 4px;
    color: inherit;
    font-size: 0.85rem;
    text-align: center;
  }
  .reader-content { line-height: 1.7; font-size: 0.95rem; }
  .reader-chapter-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0 0 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
  }
  .reader-para { margin: 0 0 0.85em; line-height: 1.75; }
  .reader-para:last-child { margin-bottom: 0; }
</style>
