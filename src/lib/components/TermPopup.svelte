<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Term, TermSense } from '$lib/types';
  import { db } from '$lib/db';
  import { recordLookup } from '$lib/stores/session';
  import { saveProgress } from '$lib/stores/mastery';
  import { progressMap, getProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, getBadge } from '$lib/srs';

  export let termId: string | null = null;
  /** When true, show a "Chọn cụm khác…" link that lets the parent open the slider. */
  export let canPickPhrase = false;
  /**
   * Learning context. When 'scrum', Scrum-specific senses are surfaced first and the
   * Scrum badge is highlighted as the primary reading.
   */
  export let context: 'general' | 'scrum' = 'scrum';

  const dispatch = createEventDispatcher<{ close: void; pickPhrase: void }>();

  let term: Term | null = null;
  let senses: TermSense[] = [];
  let loading = false;

  $: if (termId) loadTerm(termId);

  async function loadTerm(id: string) {
    loading = true;
    [term, senses] = await Promise.all([
      db.terms.get(id).then((t) => t ?? null),
      db.termSenses.where('termId').equals(id).sortBy('sortOrder'),
    ]);

    // Track lookup in session + Dexie
    recordLookup(id);
    const existing = await db.lookedUpTerms.get(id);
    await db.lookedUpTerms.put({
      termId: id,
      count: (existing?.count ?? 0) + 1,
      lastLookedAt: new Date().toISOString(),
    });

    loading = false;
  }

  function close() {
    term = null;
    senses = [];
    dispatch('close');
  }

  async function markKnown() {
    if (!term) return;
    const current = getProgress($progressMap, 'term', term.id);
    if (!canPractice(current)) return;
    const updated = improveProgress(current, 'term', term.id, false);
    await saveProgress(updated);
    close();
  }

  $: progress = term ? getProgress($progressMap, 'term', term.id) : undefined;

  /**
   * Sort senses based on current learning context:
   *   - context='scrum'  → scrum senses first, then general
   *   - context='general' → general first, then scrum
   * Within the same register, preserve sortOrder.
   */
  $: sortedSenses = (() => {
    if (!senses.length) return senses;
    const primary = context === 'scrum' ? 'scrum' : 'general';
    return [...senses].sort((a, b) => {
      const aIsPrimary = a.register === primary ? 0 : 1;
      const bIsPrimary = b.register === primary ? 0 : 1;
      if (aIsPrimary !== bIsPrimary) return aIsPrimary - bIsPrimary;
      return a.sortOrder - b.sortOrder;
    });
  })();

  /** Returns true if the term is a multi-word phrase so we can offer word-by-word lookup. */
  $: isPhrase = term ? term.text.includes(' ') : false;

  /** Individual words of a phrase — used for the layered lookup section. */
  $: phraseWords = isPhrase && term ? term.text.split(/\s+/).filter(Boolean) : [];
</script>

{#if termId && term}
  <!-- Overlay -->
  <div class="gloss-overlay" on:click={close} role="presentation"></div>

  <!-- Popup panel -->
  <div class="gloss-popup" role="dialog" aria-modal="true">
    <button class="gloss-close" on:click={close} aria-label="Đóng">✕</button>

    {#if loading}
      <div class="loading-spinner"></div>
    {:else}
      <div class="card-badge">{getBadge(progress?.level ?? -1)}</div>
      <div class="gloss-term-title">{term.text}</div>
      {#if term.ipa}
        <div class="card-ipa">[{term.ipa}]</div>
      {/if}

      <!-- Context priority hint -->
      {#if sortedSenses.length > 1}
        <p class="context-hint">
          {context === 'scrum'
            ? '📋 Đang học theo ngữ cảnh Scrum — nghĩa Scrum được ưu tiên'
            : '📖 Hiển thị nghĩa chung trước'}
        </p>
      {/if}

      <!-- All senses, ordered by context priority -->
      <div class="senses mt-2">
        {#each sortedSenses as sense, i}
          <div
            class="sense register-{sense.register}"
            class:sense-primary={i === 0}
          >
            <div class="sense-register-badge register-badge-{sense.register}">
              {sense.register === 'scrum' ? '📋 Scrum' : '📖 General'}
              {#if i === 0 && sortedSenses.length > 1}
                <span class="sense-primary-label">· ưu tiên</span>
              {/if}
            </div>
            <div class="sense-en">{sense.en}</div>
            <div class="sense-vi">{sense.vi}</div>
            {#if sense.note}
              <div class="sense-note">{sense.note}</div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Layered lookup: phrase → individual words -->
      {#if isPhrase && phraseWords.length > 1}
        <div class="phrase-words-section mt-2">
          <p class="phrase-words-label">🔍 Từng từ trong cụm:</p>
          <div class="phrase-words-list">
            {#each phraseWords as word}
              <!-- Dispatch pickPhrase so parent can open NgramPopup for this word -->
              <button
                class="phrase-word-chip"
                on:click={() => dispatch('pickPhrase')}
                title={`Tra từ "${word}" (mở thanh chọn cụm)`}
              >
                {word}
              </button>
            {/each}
          </div>
          <p class="phrase-words-hint">Nhấn một từ để mở thanh kéo và tra riêng từng từ</p>
        </div>
      {/if}

      <!-- Tags -->
      {#if term.tags.length}
        <div class="tags">
          {#each term.tags as tag}
            <span class="tag {tag === 'ai-dịch' ? 'tag-ai' : ''}">{tag}</span>
          {/each}
        </div>
      {/if}

      <!-- SRS action -->
      {#if canPractice(progress)}
        <button class="btn btn-primary mt-2" on:click={markKnown} style="width:100%">
          ✓ Tôi đã biết từ này (+XP)
        </button>
      {:else if progress?.nextReview}
        <p class="text-secondary mt-2" style="font-size:0.85rem;text-align:center">
          Ôn lại vào {new Date(progress.nextReview).toLocaleDateString('vi-VN')}
        </p>
      {/if}

      {#if canPickPhrase}
        <button
          class="btn btn-ghost btn-sm mt-2"
          on:click={() => dispatch('pickPhrase')}
          style="width:100%"
        >
          ✂ Chọn cụm khác trong câu…
        </button>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .context-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 0.35rem;
    font-style: italic;
  }

  /* Override global .sense styles with more prominent register badge */
  .sense-register-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.55rem;
    border-radius: 20px;
    margin-bottom: 0.35rem;
  }

  .register-badge-scrum {
    background: var(--primary-light);
    color: var(--primary-dark);
    border: 1px solid var(--primary);
  }

  .register-badge-general {
    background: #fff8e1;
    color: #6d4c41;
    border: 1px solid #ffe082;
  }

  .sense-primary-label {
    font-size: 0.65rem;
    opacity: 0.75;
    font-weight: 500;
    font-style: italic;
    text-transform: none;
    letter-spacing: 0;
  }

  /* First sense gets a slightly stronger left border */
  .sense.sense-primary {
    border-left-width: 4px;
  }

  /* Phrase word section */
  .phrase-words-section {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
  }

  .phrase-words-label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.4rem;
  }

  .phrase-words-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.35rem;
  }

  .phrase-word-chip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.25rem 0.6rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--primary);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }

  .phrase-word-chip:hover {
    background: var(--primary-light);
    border-color: var(--primary);
  }

  .phrase-words-hint {
    font-size: 0.72rem;
    color: var(--text-secondary);
    font-style: italic;
  }
</style>
