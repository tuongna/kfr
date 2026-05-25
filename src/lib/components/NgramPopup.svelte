<script lang="ts">
  import { createEventDispatcher, onMount, tick } from 'svelte';
  import {
    suggestNgrams,
    tokenizeWords,
    lookupOrTranslate,
    type NgramSuggestion,
    type WordSpan,
  } from '$lib/translate';

  export let sentence: string;
  export let charIdx: number;
  export let ownerId: string;

  const dispatch = createEventDispatcher<{ select: string; close: void }>();

  type Phase = 'list' | 'slider';
  let phase: Phase = 'list';
  let suggestions: NgramSuggestion[] = [];
  let loadingList = true;
  let loadingTranslate = false;
  let translateError = '';

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
  });

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
              <span class="ngram-text">{s.text}</span>
              {#if s.termId}
                <span class="ngram-tag-glossary">📋 glossary</span>
              {:else if s.length === 1}
                <span class="ngram-tag-ai">🤖 dịch AI</span>
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
            + Chọn cụm khác…
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
      Mỗi từ là một điểm; không vượt qua dấu câu.
    </p>

    <div
      class="ngram-slider"
      bind:this={sliderEl}
      on:pointerdown={onPointerDown}
      on:pointermove={onPointerMove}
      on:pointerup={onPointerUp}
      on:pointercancel={onPointerUp}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={Math.max(words.length - 1, 0)}
      aria-valuenow={leftIdx}
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
