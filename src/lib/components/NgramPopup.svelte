<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import {
    suggestNgrams,
    tokenizeWords,
    lookupOrTranslate,
    type NgramSuggestion,
    type WordSpan,
  } from '$lib/translate';
  import { db } from '$lib/db';
  import type { TermSense } from '$lib/types';

  export let sentence: string;
  export let charIdx: number;
  export let ownerId: string;
  /**
   * Learning context forwarded from the parent page.
   * Used to choose which sense preview to show (scrum preferred in Scrum context).
   */
  export let context: 'general' | 'scrum' = 'scrum';

  const dispatch = createEventDispatcher<{ select: string; close: void }>();

  type Phase = 'list' | 'slider';
  let phase: Phase = 'list';
  let suggestions: NgramSuggestion[] = [];
  let loadingList = true;
  let loadingTranslate = false;
  let translateError = '';

  /** Mini meaning previews fetched for known glossary items. Keyed by termId. */
  let previews: Map<string, string> = new Map();

  // Slider state — initialized lazily when user opens the slider phase
  let words: WordSpan[] = [];
  let initialSegment = 0;
  let leftIdx = 0;
  let rightIdx = 0;
  let dragOrigin: number | null = null;
  let sliderEl: HTMLElement;

  $: selectedPhrase =
    words.length && leftIdx <= rightIdx
      ? sentence.slice(words[leftIdx].start, words[rightIdx].end)
      : '';

  onMount(async () => {
    suggestions = await suggestNgrams(sentence, charIdx, 4);
    loadingList = false;
    // Fetch meaning previews for known terms in the background.
    await loadPreviews(suggestions);
  });

  /**
   * For each suggestion that has a termId, fetch senses and pick the best one-line
   * preview (Scrum sense preferred when context === 'scrum').
   */
  async function loadPreviews(suggs: NgramSuggestion[]) {
    const known = suggs.filter((s) => s.termId);
    if (!known.length) return;
    const map = new Map<string, string>();
    await Promise.all(
      known.map(async (s) => {
        if (!s.termId) return;
        const allSenses: TermSense[] = await db.termSenses
          .where('termId')
          .equals(s.termId)
          .toArray();
        if (!allSenses.length) return;
        // Pick best sense for preview
        const primary =
          context === 'scrum'
            ? allSenses.find((x) => x.register === 'scrum') ?? allSenses[0]
            : allSenses.find((x) => x.register === 'general') ?? allSenses[0];
        const label = primary.register === 'scrum' ? '📋' : '📖';
        map.set(s.termId, `${label} ${primary.vi}`);
      })
    );
    previews = map;
  }

  async function pickSuggestion(s: NgramSuggestion) {
    if (s.termId) {
      dispatch('select', s.termId);
      return;
    }
    await translateAndSelect(s.text);
  }

  async function translateAndSelect(text: string) {
    if (!text || loadingTranslate) return;
    loadingTranslate = true;
    translateError = '';
    try {
      const termId = await lookupOrTranslate(text, ownerId);
      dispatch('select', termId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      translateError = `Dịch thất bại: ${msg.slice(0, 120)}`;
    } finally {
      loadingTranslate = false;
    }
  }

  async function openSlider() {
    words = tokenizeWords(sentence);
    const startIdx = words.findIndex((w) => w.start === charIdx);
    if (startIdx >= 0) {
      leftIdx = rightIdx = startIdx;
      initialSegment = words[startIdx].segment;
    } else {
      leftIdx = rightIdx = 0;
      initialSegment = words[0]?.segment ?? 0;
    }
    phase = 'slider';
    await tick();
  }

  function backToList() {
    phase = 'list';
  }

  function notchIndexFromX(clientX: number): number | null {
    if (!sliderEl) return null;
    const notches = sliderEl.querySelectorAll<HTMLElement>('.ngram-notch');
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < notches.length; i++) {
      const idx = parseInt(notches[i].dataset.index ?? '-1');
      if (idx < 0 || words[idx]?.segment !== initialSegment) continue;
      const r = notches[i].getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.abs(clientX - cx);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    }
    return bestIdx >= 0 ? bestIdx : null;
  }

  function onPointerDown(e: PointerEvent) {
    const idx = notchIndexFromX(e.clientX);
    if (idx === null) return;
    e.preventDefault();
    dragOrigin = idx;
    leftIdx = rightIdx = idx;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may throw on some browsers if pointer already released
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (dragOrigin === null) return;
    const idx = notchIndexFromX(e.clientX);
    if (idx === null) return;
    leftIdx = Math.min(dragOrigin, idx);
    rightIdx = Math.max(dragOrigin, idx);
  }

  function onPointerUp(e: PointerEvent) {
    if (dragOrigin === null) return;
    dragOrigin = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }

  function segmentBounds(): { first: number; last: number } | null {
    let first = -1;
    let last = -1;
    for (let i = 0; i < words.length; i++) {
      if (words[i].segment !== initialSegment) continue;
      if (first === -1) first = i;
      last = i;
    }
    return first === -1 ? null : { first, last };
  }

  function onSliderKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      translateAndSelect(selectedPhrase);
      return;
    }
    const bounds = segmentBounds();
    if (!bounds) return;

    const moveEnd = e.shiftKey ? 'left' : 'right';
    const apply = (delta: number) => {
      e.preventDefault();
      if (moveEnd === 'right') {
        rightIdx = Math.min(bounds.last, Math.max(leftIdx, rightIdx + delta));
      } else {
        leftIdx = Math.max(bounds.first, Math.min(rightIdx, leftIdx + delta));
      }
    };

    if (e.key === 'ArrowRight') apply(1);
    else if (e.key === 'ArrowLeft') apply(-1);
    else if (e.key === 'Home') {
      e.preventDefault();
      if (moveEnd === 'right') rightIdx = leftIdx;
      else leftIdx = bounds.first;
    } else if (e.key === 'End') {
      e.preventDefault();
      if (moveEnd === 'right') rightIdx = bounds.last;
      else leftIdx = rightIdx;
    }
  }
</script>

<div class="gloss-overlay" on:click={() => dispatch('close')} role="presentation"></div>
<div class="gloss-popup ngram-popup" role="dialog" aria-modal="true" aria-label="Chọn cụm từ">
  <button class="gloss-close" on:click={() => dispatch('close')} aria-label="Đóng">✕</button>

  {#if phase === 'list'}
    <h3 style="margin:0 0 0.5rem;font-size:1rem">Chọn từ / cụm cần tra</h3>
    {#if loadingList}
      <div class="loading-spinner"></div>
    {:else}
      <ul class="ngram-list">
        {#each suggestions as s}
          <li>
            <button
              class="ngram-item"
              class:has-term={!!s.termId}
              on:click={() => pickSuggestion(s)}
              disabled={loadingTranslate}
            >
              <span class="ngram-item-main">
                <span class="ngram-text">{s.text}</span>
                {#if s.termId}
                  <span class="ngram-tag-glossary">📋 glossary</span>
                {:else if s.length === 1}
                  <span class="ngram-tag-ai">🤖 dịch AI</span>
                {/if}
              </span>
              <!-- Inline meaning preview for known terms -->
              {#if s.termId && previews.has(s.termId)}
                <span class="ngram-preview-line">{previews.get(s.termId)}</span>
              {/if}
            </button>
          </li>
        {/each}
        <li>
          <button
            class="ngram-item ngram-item-other"
            on:click={openSlider}
            disabled={loadingTranslate}
          >
            ✂ Chọn cụm khác…
          </button>
        </li>
      </ul>
      {#if loadingTranslate}
        <p class="text-secondary" style="font-size:0.85rem;margin-top:0.5rem">Đang dịch…</p>
      {/if}
      {#if translateError}
        <p style="font-size:0.85rem;color:var(--error);margin-top:0.5rem">{translateError}</p>
      {/if}
    {/if}
  {:else}
    <h3 style="margin:0 0 0.25rem;font-size:1rem">Kéo để chọn cụm</h3>
    <p class="text-secondary" style="font-size:0.78rem;margin-bottom:0.6rem">
      Mỗi từ là một điểm; không vượt qua dấu câu. Bàn phím: ←/→ chỉnh đầu phải, Shift+←/→ chỉnh đầu
      trái, Enter để dịch.
    </p>

    <div
      class="ngram-slider"
      bind:this={sliderEl}
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
      on:keydown={onSliderKey}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.max(words.length - 1, 0)}
      aria-valuenow={leftIdx}
      aria-valuetext={selectedPhrase}
      tabindex="0"
    >
      {#each words as w, i (w.start)}
        {@const inRange = i >= leftIdx && i <= rightIdx && w.segment === initialSegment}
        {@const inSegment = w.segment === initialSegment}
        {@const isEndpoint = (i === leftIdx || i === rightIdx) && inSegment}
        <div
          class="ngram-notch"
          class:in-range={inRange}
          class:is-endpoint={isEndpoint}
          class:out-of-segment={!inSegment}
          data-index={i}
        >
          <span class="ngram-dot"></span>
          <span class="ngram-label">{w.text}</span>
        </div>
        {#if i < words.length - 1 && words[i + 1].segment !== w.segment}
          <span class="ngram-divider" aria-hidden="true"></span>
        {/if}
      {/each}
    </div>

    <p class="ngram-preview">
      Cụm: <strong>"{selectedPhrase}"</strong>
    </p>

    <div class="ngram-actions">
      <button class="btn btn-ghost btn-sm" on:click={backToList} disabled={loadingTranslate}>
        ← Quay lại
      </button>
      <button
        class="btn btn-primary btn-sm"
        on:click={() => translateAndSelect(selectedPhrase)}
        disabled={loadingTranslate || !selectedPhrase}
      >
        {loadingTranslate ? 'Đang dịch…' : '🤖 Hỏi AI'}
      </button>
    </div>

    {#if translateError}
      <p style="font-size:0.85rem;color:var(--error);margin-top:0.5rem">{translateError}</p>
    {/if}
  {/if}
</div>

<style>
  /* Vertical layout for ngram-item: main row on top, preview below */
  .ngram-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .ngram-item-main {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
  }

  .ngram-preview-line {
    font-size: 0.78rem;
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.3;
    /* Prevent very long preview from breaking the layout */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* For has-term items the preview uses a slightly different color */
  .ngram-item.has-term .ngram-preview-line {
    color: var(--success);
    opacity: 0.85;
  }
</style>
