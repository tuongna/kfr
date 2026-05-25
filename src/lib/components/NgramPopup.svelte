<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import {
    suggestNgrams,
    tokenizeWords,
    lookupOrTranslate,
    type NgramSuggestion,
    type WordSpan,
  } from '$lib/translate';
  import { db } from '$lib/db';
  import type { TermSense } from '$lib/types';
  import { MODELS, MODEL_DISPLAY, type ModelAttempt } from '$lib/ai';

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
  /** Real-time log of model fallback attempts, shown to the user while translating. */
  let attempts: ModelAttempt[] = [];

  /** Mini meaning previews fetched for known glossary items. Keyed by termId. */
  let previews: Map<string, string> = new Map();

  // ── Translation timing ──────────────────────────────────────────────────────
  /** Seconds elapsed since the current translate call started. */
  let elapsedSeconds = 0;
  /** Final elapsed time preserved after translation finishes, for the "done" badge. */
  let finalElapsed = 0;
  let elapsedInterval: ReturnType<typeof setInterval> | null = null;

  /** Next model in MODELS that will be tried if the current one fails. */
  $: nextModelToTry = (() => {
    if (!loadingTranslate) return null;
    const last = attempts[attempts.length - 1];
    if (!last || last.status !== 'trying') return null;
    return attempts.length < MODELS.length ? MODELS[attempts.length] : null;
  })();

  /** True while a paid-tier model is actively being called. */
  $: usingPaidModel =
    loadingTranslate && attempts.some((a) => a.status === 'trying' && !a.model.endsWith(':free'));

  function isFreeModel(id: string): boolean {
    return id.endsWith(':free');
  }

  /** Human-friendly model name for display. */
  function friendlyModel(id: string): string {
    return MODEL_DISPLAY[id] ?? id.replace(/:free$/, '').split('/').pop() ?? id;
  }

  function startElapsedTimer(): void {
    elapsedSeconds = 0;
    elapsedInterval = setInterval(() => {
      elapsedSeconds += 1;
    }, 1000);
  }

  function stopElapsedTimer(): void {
    if (elapsedInterval !== null) {
      clearInterval(elapsedInterval);
      elapsedInterval = null;
    }
  }

  onDestroy(() => stopElapsedTimer());

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
    attempts = [];
    startElapsedTimer();
    try {
      const termId = await lookupOrTranslate(text, ownerId, (a) => {
        // Merge updates: when a model transitions trying → failed/succeeded, replace its row.
        const last = attempts[attempts.length - 1];
        if (last && last.model === a.model && last.status === 'trying') {
          attempts = [...attempts.slice(0, -1), a];
        } else {
          attempts = [...attempts, a];
        }
      });
      dispatch('select', termId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      translateError = `Dịch thất bại: ${msg.slice(0, 120)}`;
    } finally {
      finalElapsed = elapsedSeconds;
      loadingTranslate = false;
      stopElapsedTimer();
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
      {#if loadingTranslate || attempts.length}
        <div class="translate-progress" class:translate-progress--done={!loadingTranslate && attempts.length > 0}>

          <!-- ── Header: status + elapsed ────────────────────────────────── -->
          <div class="tp-header">
            <span class="tp-status">
              {#if loadingTranslate}
                <span class="tp-spinner" aria-hidden="true"></span>
                Đang dịch AI…
              {:else}
                <span class="tp-ok-icon" aria-hidden="true">✓</span>
                Đã dịch xong
              {/if}
            </span>
            {#if loadingTranslate && elapsedSeconds >= 1}
              <span class="tp-elapsed" class:tp-elapsed--slow={elapsedSeconds >= 8}>
                ⏱ {elapsedSeconds}s
              </span>
            {:else if !loadingTranslate && finalElapsed >= 1}
              <span class="tp-elapsed tp-elapsed--done">⏱ {finalElapsed}s</span>
            {/if}
          </div>

          <!-- ── Progress track: one dot per model ──────────────────────── -->
          <div
            class="tp-track"
            aria-label="Tiến trình: {attempts.length} trong {MODELS.length} model"
          >
            {#each MODELS as m, i}
              {@const st = i < attempts.length ? attempts[i].status : 'pending'}
              <div
                class="tp-dot tp-dot--{st}"
                class:tp-dot--free={isFreeModel(m)}
                title="{friendlyModel(m)} · {isFreeModel(m) ? 'free' : 'paid'}"
              ></div>
            {/each}
            <span class="tp-fraction">{attempts.length}/{MODELS.length}</span>
          </div>

          <!-- ── Per-model attempt rows ──────────────────────────────────── -->
          <ul class="translate-attempt-list">
            {#each attempts as a (a.model + a.status)}
              <li class="translate-attempt status-{a.status}">
                <span class="translate-attempt-icon" aria-hidden="true">
                  {#if a.status === 'trying'}
                    <span class="icon-spin">↻</span>
                  {:else if a.status === 'failed'}✗
                  {:else}✓{/if}
                </span>
                <span
                  class="tp-tier-badge"
                  class:tp-tier-badge--paid={!isFreeModel(a.model)}
                  title={isFreeModel(a.model) ? 'Free tier' : 'Paid tier'}
                >
                  {isFreeModel(a.model) ? 'F' : '$'}
                </span>
                <code class="translate-attempt-model">{friendlyModel(a.model)}</code>
                {#if a.status === 'trying'}
                  <span class="tp-running">xử lý…</span>
                {:else if a.error}
                  <span class="translate-attempt-error">— {a.error.slice(0, 50)}</span>
                {/if}
              </li>
            {/each}

            <!-- Next-in-queue preview -->
            {#if nextModelToTry}
              <li class="translate-attempt translate-attempt--next">
                <span class="translate-attempt-icon" aria-hidden="true">→</span>
                <span
                  class="tp-tier-badge"
                  class:tp-tier-badge--paid={!isFreeModel(nextModelToTry)}
                  title={isFreeModel(nextModelToTry) ? 'Free tier' : 'Paid tier'}
                >
                  {isFreeModel(nextModelToTry) ? 'F' : '$'}
                </span>
                <code class="translate-attempt-model translate-attempt-model--next">
                  {friendlyModel(nextModelToTry)}
                </code>
                <span class="tp-queued">sẽ thử tiếp</span>
              </li>
            {/if}
          </ul>

          <!-- ── Tier-switch notice ──────────────────────────────────────── -->
          {#if usingPaidModel}
            <p class="tp-tier-note">💰 Chuyển sang paid model — đáng tin cậy hơn</p>
          {/if}

          <!-- ── Slow-warning (after 8s) ────────────────────────────────── -->
          {#if loadingTranslate && elapsedSeconds >= 8}
            <p class="tp-slow-warn">
              ⏳ Hơi lâu rồi — vẫn đang xử lý, xin chờ thêm chút…
            </p>
          {/if}

        </div>
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

  /* ─── Translation progress panel ────────────────────────────────────────── */

  .translate-progress {
    margin-top: 0.6rem;
    padding: 0.6rem 0.75rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .translate-progress--done {
    border-color: var(--success);
  }

  /* Header row ─────────────────────────────────────────────────────────────── */
  .tp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .tp-status {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* CSS-only arc spinner */
  .tp-spinner {
    display: inline-block;
    width: 11px;
    height: 11px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    flex-shrink: 0;
  }

  .tp-ok-icon {
    color: var(--success);
    font-size: 0.9rem;
  }

  .tp-elapsed {
    font-size: 0.74rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    opacity: 0.75;
  }

  .tp-elapsed--slow {
    color: #d97706;
    font-weight: 700;
    opacity: 1;
  }

  .tp-elapsed--done {
    opacity: 0.5;
  }

  /* Progress dot track ─────────────────────────────────────────────────────── */
  .tp-track {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .tp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    background: transparent;
    transition:
      background 0.2s,
      border-color 0.2s,
      transform 0.15s;
    flex-shrink: 0;
  }

  /* pending free = faint outline */
  .tp-dot--pending.tp-dot--free {
    opacity: 0.3;
  }

  /* pending paid = slightly stronger outline */
  .tp-dot--pending:not(.tp-dot--free) {
    border-color: var(--primary);
    opacity: 0.2;
  }

  /* trying = pulsing primary fill */
  .tp-dot--trying {
    background: var(--primary);
    border-color: var(--primary);
    animation: tp-pulse 0.9s ease-in-out infinite;
  }

  /* failed = muted grey fill */
  .tp-dot--failed {
    background: var(--text-secondary);
    border-color: var(--text-secondary);
    opacity: 0.45;
  }

  /* succeeded = green fill */
  .tp-dot--succeeded {
    background: var(--success);
    border-color: var(--success);
  }

  @keyframes tp-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.45);
      opacity: 0.65;
    }
  }

  .tp-fraction {
    font-size: 0.68rem;
    color: var(--text-secondary);
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
  }

  /* Attempt list ───────────────────────────────────────────────────────────── */
  .translate-attempt-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
  }

  .translate-attempt {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    font-size: 0.78rem;
    line-height: 1.5;
  }

  .translate-attempt-icon {
    flex-shrink: 0;
    width: 1rem;
    text-align: center;
    font-size: 0.8rem;
  }

  .icon-spin {
    display: inline-block;
    animation: spin 0.9s linear infinite;
  }

  /* Tier badge (F = free, $ = paid) */
  .tp-tier-badge {
    flex-shrink: 0;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.03rem 0.26rem;
    border-radius: 3px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    letter-spacing: 0.02em;
    line-height: 1.5;
  }

  .tp-tier-badge--paid {
    color: var(--primary);
    border-color: var(--primary);
    opacity: 0.75;
  }

  .translate-attempt-model {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 0.75rem;
    background: var(--surface);
    padding: 0.04rem 0.32rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .translate-attempt-model--next {
    opacity: 0.45;
    font-style: italic;
  }

  /* "xử lý…" / "sẽ thử tiếp" labels */
  .tp-running {
    font-size: 0.72rem;
    color: var(--primary);
    font-style: italic;
  }

  .tp-queued {
    font-size: 0.72rem;
    color: var(--text-secondary);
    opacity: 0.6;
  }

  .translate-attempt-error {
    font-size: 0.72rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  /* Per-status row overrides */
  .translate-attempt.status-trying .translate-attempt-model {
    border-color: var(--primary);
    color: var(--primary);
  }

  .translate-attempt.status-failed {
    color: var(--text-secondary);
  }

  .translate-attempt.status-failed .translate-attempt-model {
    text-decoration: line-through;
    opacity: 0.6;
  }

  .translate-attempt.status-succeeded {
    color: var(--success);
    font-weight: 600;
  }

  .translate-attempt.status-succeeded .translate-attempt-model {
    border-color: var(--success);
    background: var(--success-light);
    color: var(--success);
  }

  .translate-attempt--next {
    opacity: 0.55;
  }

  /* Tier-switch notice */
  .tp-tier-note {
    font-size: 0.74rem;
    color: var(--primary);
    margin: 0;
    padding: 0.22rem 0.4rem;
    border-radius: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
  }

  /* Slow warning (appears after 8 s) */
  .tp-slow-warn {
    font-size: 0.76rem;
    color: #d97706;
    margin: 0;
    padding: 0.28rem 0.45rem;
    border-left: 2.5px solid #d97706;
    border-radius: 0 4px 4px 0;
    background: rgba(217, 119, 6, 0.08);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }
</style>
