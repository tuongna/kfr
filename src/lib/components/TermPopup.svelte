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

      <!-- All senses shown at once -->
      <div class="senses mt-2">
        {#each senses as sense}
          <div class="sense register-{sense.register}">
            <div class="sense-register">
              {sense.register === 'scrum' ? '📋 Scrum' : '📖 General'}
            </div>
            <div class="sense-en">{sense.en}</div>
            <div class="sense-vi">{sense.vi}</div>
            {#if sense.note}
              <div class="sense-note">{sense.note}</div>
            {/if}
          </div>
        {/each}
      </div>

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
