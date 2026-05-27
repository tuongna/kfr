<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { db } from '$lib/db';
  import { authUser } from '$lib/stores/auth';
  import { tokenizeStem } from '$lib/translate';
  import { loadPdf, type PdfPage } from '$lib/pdfReader';
  import type { Term } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';
  import NgramPopup from '$lib/components/NgramPopup.svelte';

  // ── Book catalog & selection ──────────────────────────────────────────────
  interface BookEntry {
    id: string;
    title: string;
    author: string;
    year: number;
    file: string;
    tags: string[];
    description: string;
  }

  let catalog: BookEntry[] = [];
  let selectedBook: BookEntry | null = null;

  // ── PDF state ─────────────────────────────────────────────────────────────
  let pages: PdfPage[] = [];
  let totalPages = 0;
  let currentPageIdx = 0;  // 0-based index into `pages`
  let loadError = '';
  let loadPhase: 'idle' | 'loading' | 'done' = 'idle';

  // ── Translate (same as quiz) ──────────────────────────────────────────────
  let allTerms: Term[] = [];
  let selectedTermId: string | null = null;
  let ngramSentence: string | null = null;
  let ngramCharIdx = 0;
  let lastClickedSentence = '';
  let lastClickedCharIdx = 0;

  $: currentUserId = $authUser?.id;
  $: currentPage = pages[currentPageIdx] ?? null;

  // Tokenize every paragraph in the current page
  $: tokenizedParagraphs = currentPage
    ? currentPage.paragraphs.map((p) => tokenizeStem(p, allTerms))
    : [];

  // ── Init ──────────────────────────────────────────────────────────────────
  onMount(async () => {
    // Load glossary terms for tokenization
    allTerms = await db.terms.toArray();

    // Load catalog
    try {
      const res = await fetch(`${base}/books/catalog.json`);
      if (res.ok) catalog = await res.json();
    } catch {
      // Catalog optional — page still works if user drops a PDF manually
    }
  });

  // ── PDF loading ───────────────────────────────────────────────────────────
  async function openBook(book: BookEntry) {
    selectedBook = book;
    pages = [];
    totalPages = 0;
    currentPageIdx = 0;
    loadError = '';
    loadPhase = 'loading';

    try {
      const pdfUrl = `${base}/books/${book.file}`;
      const meta = await loadPdf(pdfUrl, (page) => {
        pages = [...pages, page];
      });
      totalPages = meta.totalPages;
      loadPhase = 'done';
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
      loadPhase = 'idle';
    }
    // Refresh terms after potential new lookups during session
    allTerms = await db.terms.toArray();
  }

  function prevPage() {
    if (currentPageIdx > 0) currentPageIdx--;
  }

  function nextPage() {
    if (currentPageIdx < pages.length - 1) currentPageIdx++;
  }

  function goToPage(n: number) {
    const idx = Math.max(0, Math.min(n - 1, pages.length - 1));
    currentPageIdx = idx;
  }

  // ── Tap-to-gloss (mirrors quiz/+page.svelte) ──────────────────────────────
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

<!-- ── BOOK SHELF (no book selected) ──────────────────────────────────────── -->
{#if !selectedBook}
  <div class="books-shelf-header">
    <h2 class="books-shelf-title">📖 Thư viện tài liệu</h2>
    <p class="text-secondary" style="font-size:0.88rem;margin:0">
      Click từ bất kỳ để tra nghĩa — giống hệt chức năng trong Quiz.
    </p>
  </div>

  {#if catalog.length === 0}
    <div class="empty-state">
      <p>Chưa có tài liệu nào. Đặt file PDF vào <code>static/books/</code> và cập nhật <code>catalog.json</code>.</p>
    </div>
  {:else}
    <div class="books-grid">
      {#each catalog as book}
        <button class="book-card" on:click={() => openBook(book)}>
          <div class="book-cover">📄</div>
          <div class="book-info">
            <div class="book-title">{book.title}</div>
            <div class="book-author text-secondary">{book.author} · {book.year}</div>
            <div class="book-desc text-secondary">{book.description}</div>
            <div class="tags" style="margin-top:0.5rem">
              {#each book.tags as tag}
                <span class="tag" style="cursor:default">{tag}</span>
              {/each}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}

<!-- ── READER ──────────────────────────────────────────────────────────────── -->
{:else}
  <!-- Reader header -->
  <div class="reader-header">
    <button class="btn btn-ghost btn-sm" on:click={() => { selectedBook = null; pages = []; }}>
      ← Thư viện
    </button>
    <span class="reader-title">{selectedBook.title}</span>
    {#if loadPhase === 'loading'}
      <span class="text-secondary" style="font-size:0.8rem">
        Đang tải… ({pages.length} trang)
      </span>
    {:else if loadPhase === 'done'}
      <span class="text-secondary" style="font-size:0.8rem">{totalPages} trang</span>
    {/if}
  </div>

  <!-- Error -->
  {#if loadError}
    <div class="card" style="border-color:var(--danger);padding:1rem">
      <p style="color:var(--danger);margin:0">⚠️ Không tải được PDF: {loadError}</p>
    </div>
  {/if}

  <!-- Loading skeleton -->
  {#if loadPhase === 'loading' && pages.length === 0}
    <div class="reader-loading">
      <div class="loading-spinner"></div>
      <p class="text-secondary">Đang giải mã PDF…</p>
    </div>
  {/if}

  <!-- Page content -->
  {#if currentPage}
    <div class="reader-page-nav">
      <button class="btn btn-ghost btn-sm" on:click={prevPage} disabled={currentPageIdx === 0}>
        ← Trang trước
      </button>
      <span class="reader-page-indicator">
        Trang {currentPage.pageNum} / {totalPages || pages.length}
      </span>
      <button
        class="btn btn-ghost btn-sm"
        on:click={nextPage}
        disabled={currentPageIdx >= pages.length - 1}
      >
        Trang sau →
      </button>
    </div>

    <div class="card reader-content">
      <p class="glossary-hint-label">💡 Click từ bất kỳ để tra nghĩa hoặc chọn cụm từ</p>

      <!-- Paragraphs -->
      {#each tokenizedParagraphs as html, i}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <p
          class="reader-para"
          data-sentence={currentPage.paragraphs[i]}
          on:click={handleTextInteraction}
          on:keydown={handleTextInteraction}
          role="presentation"
        >
          {@html html}
        </p>
      {/each}

      {#if tokenizedParagraphs.length === 0}
        <p class="text-secondary" style="font-style:italic">
          (Trang này không có văn bản — có thể là trang chứa hình ảnh.)
        </p>
      {/if}
    </div>

    <!-- Bottom navigation (repeat for convenience) -->
    <div class="reader-page-nav reader-page-nav-bottom">
      <button class="btn btn-ghost btn-sm" on:click={prevPage} disabled={currentPageIdx === 0}>
        ← Trang trước
      </button>
      <div class="reader-jump">
        <span class="text-secondary" style="font-size:0.82rem">Đến trang:</span>
        <input
          type="number"
          min="1"
          max={totalPages || pages.length}
          value={currentPage.pageNum}
          class="reader-page-input"
          on:change={(e) => goToPage(parseInt(e.currentTarget.value))}
        />
      </div>
      <button
        class="btn btn-ghost btn-sm"
        on:click={nextPage}
        disabled={currentPageIdx >= pages.length - 1}
      >
        Trang sau →
      </button>
    </div>
  {:else if loadPhase === 'done' && pages.length === 0}
    <div class="empty-state">
      <p>PDF không chứa văn bản có thể trích xuất.</p>
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
  .books-shelf-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }
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
  .book-cover {
    font-size: 2.5rem;
    flex-shrink: 0;
  }
  .book-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .book-title {
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.3;
  }
  .book-author, .book-desc {
    font-size: 0.8rem;
    line-height: 1.4;
  }

  /* ── Reader ── */
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
  .reader-page-nav-bottom {
    margin-top: 0.75rem;
    margin-bottom: 0;
  }
  .reader-page-indicator {
    font-size: 0.85rem;
    color: var(--text-secondary, #9ca3af);
  }
  .reader-jump {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
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
  .reader-content {
    line-height: 1.7;
    font-size: 0.95rem;
  }
  .reader-para {
    margin: 0 0 0.85em 0;
    line-height: 1.75;
  }
  .reader-para:last-child {
    margin-bottom: 0;
  }

  /* Reuse glossary-term and any-word styles from app.css */
  :global(.reader-para .glossary-term) {
    cursor: pointer;
  }
  :global(.reader-para .any-word) {
    cursor: pointer;
  }
</style>
