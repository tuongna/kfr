<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Term, TermSense } from '$lib/types';
  import { db } from '$lib/db';
  import { supabase } from '$lib/supabase';
  import { recordLookup } from '$lib/stores/session';
  import { saveProgress } from '$lib/stores/mastery';
  import { progressMap, getProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, getBadge } from '$lib/srs';
  import { auditTermSenses, type AuditResult } from '$lib/ai';

  export let termId: string | null = null;
  /** When true, show a "Chọn cụm khác…" link that lets the parent open the slider. */
  export let canPickPhrase = false;
  /**
   * Learning context. When 'scrum', Scrum-specific senses are surfaced first and the
   * Scrum badge is highlighted as the primary reading.
   */
  export let context: 'general' | 'scrum' = 'scrum';
  /** When true, shows ✏️ Sửa and 🔬 Audit AI buttons */
  export let allowEdit: boolean = false;

  const dispatch = createEventDispatcher<{ close: void; pickPhrase: void }>();

  let term: Term | null = null;
  let senses: TermSense[] = [];
  let loading = false;

  // Edit mode state
  let editMode: boolean = false;
  let editSenses: Array<{
    id: string;
    termId: string;
    register: 'general' | 'scrum';
    en: string;
    vi: string;
    note: string;
    sortOrder: number;
  }> = [];
  let saving: boolean = false;
  let saveError: string = '';

  // Audit state
  let auditing: boolean = false;
  let auditResult: AuditResult | null = null;
  let auditError: string = '';

  $: if (termId) loadTerm(termId);

  async function loadTerm(id: string) {
    loading = true;
    editMode = false;
    auditResult = null;
    auditError = '';
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
    editMode = false;
    auditResult = null;
    auditError = '';
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

  // Edit mode functions
  function enterEditMode() {
    editSenses = senses.map((s) => ({
      id: s.id,
      termId: s.termId,
      register: s.register,
      en: s.en,
      vi: s.vi,
      note: s.note ?? '',
      sortOrder: s.sortOrder,
    }));
    saveError = '';
    editMode = true;
  }

  function cancelEdit() {
    editMode = false;
    editSenses = senses.map((s) => ({
      id: s.id,
      termId: s.termId,
      register: s.register,
      en: s.en,
      vi: s.vi,
      note: s.note ?? '',
      sortOrder: s.sortOrder,
    }));
    saveError = '';
  }

  function deleteSense(i: number) {
    editSenses = editSenses.filter((_, idx) => idx !== i);
  }

  function addScrumSense() {
    if (!term) return;
    editSenses = [
      ...editSenses,
      {
        id: 'new-' + Date.now(),
        termId: term.id,
        register: 'scrum',
        en: '',
        vi: '',
        note: '',
        sortOrder: editSenses.length,
      },
    ];
  }

  async function saveEdit() {
    if (!term) return;
    saving = true;
    saveError = '';
    try {
      const originalIds = new Set(senses.map((s) => s.id));
      const editedIds = new Set(editSenses.filter((s) => !s.id.startsWith('new-')).map((s) => s.id));

      // Update existing senses
      for (const sense of editSenses) {
        if (!sense.id.startsWith('new-')) {
          // Existing sense — update
          await supabase
            .from('term_senses')
            .update({
              en: sense.en,
              vi: sense.vi,
              note: sense.note,
              sort_order: sense.sortOrder,
            })
            .eq('id', sense.id);

          await db.termSenses.put({
            id: sense.id,
            termId: sense.termId,
            register: sense.register,
            en: sense.en,
            vi: sense.vi,
            note: sense.note,
            sortOrder: sense.sortOrder,
          });
        } else {
          // New sense — generate real UUID-like id and insert
          const newId = crypto.randomUUID();
          await supabase.from('term_senses').insert({
            id: newId,
            term_id: sense.termId,
            register: sense.register,
            en: sense.en,
            vi: sense.vi,
            note: sense.note,
            sort_order: sense.sortOrder,
          });

          await db.termSenses.put({
            id: newId,
            termId: sense.termId,
            register: sense.register,
            en: sense.en,
            vi: sense.vi,
            note: sense.note,
            sortOrder: sense.sortOrder,
          });
        }
      }

      // Delete removed senses
      for (const original of senses) {
        if (!editedIds.has(original.id)) {
          await supabase.from('term_senses').delete().eq('id', original.id);
          await db.termSenses.delete(original.id);
        }
      }

      // Tag term as 'edited-tay'
      const newTags = [...(term.tags ?? []).filter((t) => t !== 'edited-tay'), 'edited-tay'];
      await supabase.from('terms').update({ tags: newTags }).eq('id', term.id);
      await db.terms.update(term.id, { tags: newTags });

      // Reload term and senses
      await loadTerm(term.id);
      editMode = false;
    } catch (e: unknown) {
      saveError = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  // Audit functions
  async function auditTerm() {
    if (!term) return;
    auditing = true;
    auditError = '';
    auditResult = null;
    try {
      auditResult = await auditTermSenses(
        term.text,
        senses.map((s) => ({ register: s.register, en: s.en, vi: s.vi }))
      );
    } catch (e: unknown) {
      auditError = e instanceof Error ? e.message : String(e);
    } finally {
      auditing = false;
    }
  }

  function applyAuditSuggestion(register: 'general' | 'scrum', field: 'en' | 'vi', value: string) {
    enterEditMode();
    const idx = editSenses.findIndex((s) => s.register === register);
    if (idx !== -1) {
      editSenses[idx] = { ...editSenses[idx], [field]: value };
    }
  }

  function applyMissingScrumSense(suggestedEn: string, suggestedVi: string) {
    enterEditMode();
    if (!term) return;
    editSenses = [
      ...editSenses,
      {
        id: 'new-' + Date.now(),
        termId: term.id,
        register: 'scrum',
        en: suggestedEn,
        vi: suggestedVi,
        note: '',
        sortOrder: editSenses.length,
      },
    ];
  }

  $: hasScrumSense = editSenses.some((s) => s.register === 'scrum');
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

      {#if editMode}
        <!-- Edit mode UI -->
        <div class="edit-senses mt-2">
          {#each editSenses as sense, i}
            <div class="edit-sense-block">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.4rem">
                <span class="sense-register-badge register-badge-{sense.register}">
                  {sense.register === 'scrum' ? '📋 Scrum' : '📖 General'}
                </span>
                <button
                  style="background:none;border:none;color:var(--error);cursor:pointer;font-size:0.8rem;font-family:inherit;padding:0.1rem 0.3rem"
                  on:click={() => deleteSense(i)}
                  type="button"
                >✕ Xoá</button>
              </div>
              <label class="edit-field-label" for="edit-en-{i}">EN</label>
              <textarea
                id="edit-en-{i}"
                class="edit-textarea"
                rows="2"
                bind:value={sense.en}
              ></textarea>
              <label class="edit-field-label" for="edit-vi-{i}" style="margin-top:0.4rem">VI</label>
              <textarea
                id="edit-vi-{i}"
                class="edit-textarea"
                rows="2"
                bind:value={sense.vi}
              ></textarea>
              <label class="edit-field-label" for="edit-note-{i}" style="margin-top:0.4rem">Ghi chú</label>
              <input
                id="edit-note-{i}"
                class="edit-input"
                type="text"
                bind:value={sense.note}
              />
            </div>
          {/each}

          {#if !hasScrumSense}
            <button class="btn btn-ghost btn-sm" on:click={addScrumSense} type="button" style="margin-bottom:0.5rem">
              + Thêm nghĩa Scrum
            </button>
          {/if}

          {#if saveError}
            <p style="color:var(--error);font-size:0.82rem;margin-bottom:0.4rem">{saveError}</p>
          {/if}

          <div class="edit-actions">
            <button class="btn btn-ghost btn-sm" on:click={cancelEdit} type="button">Huỷ</button>
            <button
              class="btn btn-primary btn-sm"
              on:click={saveEdit}
              disabled={saving}
              type="button"
            >
              {saving ? 'Đang lưu...' : '💾 Lưu'}
            </button>
          </div>
        </div>
      {:else}
        <!-- Normal view mode -->

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

        <!-- Edit / Audit buttons -->
        {#if allowEdit}
          <div style="display:flex;gap:0.4rem;margin-top:0.75rem;flex-wrap:wrap">
            <button class="btn btn-ghost btn-sm" on:click={enterEditMode} type="button">
              ✏️ Sửa
            </button>
            <button
              class="btn btn-ghost btn-sm"
              on:click={auditTerm}
              disabled={auditing}
              type="button"
            >
              {auditing ? 'Đang audit...' : '🔬 Audit AI'}
            </button>
          </div>

          {#if auditError}
            <p style="color:var(--error);font-size:0.82rem;margin-top:0.4rem">{auditError}</p>
          {/if}

          {#if auditResult}
            <div class="audit-panel">
              <!-- Quality indicator -->
              <span class="audit-quality-badge {auditResult.quality === 'good' ? 'audit-quality-good' : auditResult.quality === 'fair' ? 'audit-quality-fair' : 'audit-quality-poor'}">
                {auditResult.quality === 'good' ? '✅ Tốt' : auditResult.quality === 'fair' ? '⚠️ Khá' : '❌ Cần sửa'}
              </span>

              <!-- Sense reviews with issues -->
              {#each auditResult.senseReviews as review}
                {#if !review.enOk || !review.viOk}
                  <div class="audit-suggestion">
                    <span class="sense-register-badge register-badge-{review.register}" style="margin-bottom:0.25rem">
                      {review.register === 'scrum' ? '📋 Scrum' : '📖 General'}
                    </span>
                    {#if review.reason}
                      <p class="audit-reason">{review.reason}</p>
                    {/if}
                    {#if !review.enOk && review.suggestedEn}
                      <div class="audit-diff-row">
                        <span class="audit-diff-current">{senses.find(s => s.register === review.register)?.en ?? ''}</span>
                        <span class="audit-diff-arrow">→</span>
                        <span class="audit-diff-suggested">{review.suggestedEn}</span>
                        <button
                          class="audit-apply-btn"
                          on:click={() => applyAuditSuggestion(review.register, 'en', review.suggestedEn)}
                          type="button"
                        >✓ Áp dụng</button>
                      </div>
                    {/if}
                    {#if !review.viOk && review.suggestedVi}
                      <div class="audit-diff-row">
                        <span class="audit-diff-current">{senses.find(s => s.register === review.register)?.vi ?? ''}</span>
                        <span class="audit-diff-arrow">→</span>
                        <span class="audit-diff-suggested">{review.suggestedVi}</span>
                        <button
                          class="audit-apply-btn"
                          on:click={() => applyAuditSuggestion(review.register, 'vi', review.suggestedVi)}
                          type="button"
                        >✓ Áp dụng</button>
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}

              <!-- Missing Scrum sense -->
              {#if auditResult.missingScrumSense && auditResult.suggestedScrumEn}
                <div class="audit-missing-scrum">
                  <p style="font-size:0.82rem;font-weight:600;margin-bottom:0.3rem">➕ Thiếu nghĩa Scrum</p>
                  <p style="font-size:0.82rem">{auditResult.suggestedScrumEn}</p>
                  <p style="font-size:0.82rem;color:var(--text-secondary);font-style:italic">{auditResult.suggestedScrumVi}</p>
                  <div class="audit-action-row">
                    <button
                      class="audit-apply-btn"
                      on:click={() => applyMissingScrumSense(auditResult?.suggestedScrumEn ?? '', auditResult?.suggestedScrumVi ?? '')}
                      type="button"
                    >➕ Thêm nghĩa này</button>
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        {/if}

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
