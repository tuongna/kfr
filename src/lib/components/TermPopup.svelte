<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Term, TermSense } from '$lib/types';
  import { db } from '$lib/db';
  import { supabase } from '$lib/supabase';
  import { recordLookup } from '$lib/stores/session';
  import { saveProgress } from '$lib/stores/mastery';
  import { progressMap, getProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, getBadge } from '$lib/srs';
  import { auditTermSenses, translateTerm, MODELS, MODEL_DISPLAY, type AuditResult, type ModelAttempt } from '$lib/ai';

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
  let auditAttempts: ModelAttempt[] = [];
  let auditElapsed = 0;
  let auditFinalElapsed = 0;
  let auditElapsedInterval: ReturnType<typeof setInterval> | null = null;

  // Retranslate state (for fixing empty/broken senses)
  let retranslating: boolean = false;
  let retranslateError: string = '';
  let retranslateAttempts: ModelAttempt[] = [];
  let retranslateElapsed = 0;
  let retranslateFinalElapsed = 0;
  let retranslateElapsedInterval: ReturnType<typeof setInterval> | null = null;

  function isFreeModel(id: string): boolean {
    return id.endsWith(':free');
  }

  function friendlyModel(id: string): string {
    return MODEL_DISPLAY[id] ?? id.replace(/:free$/, '').split('/').pop() ?? id;
  }

  function startAuditTimer() {
    auditElapsed = 0;
    auditElapsedInterval = setInterval(() => { auditElapsed += 1; }, 1000);
  }

  function stopAuditTimer() {
    if (auditElapsedInterval !== null) {
      clearInterval(auditElapsedInterval);
      auditElapsedInterval = null;
    }
  }

  function startRetranslateTimer() {
    retranslateElapsed = 0;
    retranslateElapsedInterval = setInterval(() => { retranslateElapsed += 1; }, 1000);
  }

  function stopRetranslateTimer() {
    if (retranslateElapsedInterval !== null) {
      clearInterval(retranslateElapsedInterval);
      retranslateElapsedInterval = null;
    }
  }

  $: if (termId) loadTerm(termId);

  async function loadTerm(id: string) {
    loading = true;
    editMode = false;
    resetAuditState();
    resetRetranslateState();
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
    resetAuditState();
    resetRetranslateState();
    dispatch('close');
  }

  function resetAuditState() {
    stopAuditTimer();
    auditing = false;
    auditResult = null;
    auditError = '';
    auditAttempts = [];
    auditElapsed = 0;
    auditFinalElapsed = 0;
  }

  function resetRetranslateState() {
    stopRetranslateTimer();
    retranslating = false;
    retranslateError = '';
    retranslateAttempts = [];
    retranslateElapsed = 0;
    retranslateFinalElapsed = 0;
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
    const startedTermId = term.id;
    auditing = true;
    auditError = '';
    auditResult = null;
    auditAttempts = [];
    startAuditTimer();
    try {
      const result = await auditTermSenses(
        term.text,
        senses.map((s) => ({ register: s.register, en: s.en, vi: s.vi })),
        (a) => {
          if (term?.id !== startedTermId) return;
          const last = auditAttempts[auditAttempts.length - 1];
          if (last && last.model === a.model && last.status === 'trying') {
            auditAttempts = [...auditAttempts.slice(0, -1), a];
          } else {
            auditAttempts = [...auditAttempts, a];
          }
        }
      );
      if (term?.id === startedTermId) auditResult = result;
    } catch (e: unknown) {
      if (term?.id === startedTermId) {
        auditError = e instanceof Error ? e.message : String(e);
      }
    } finally {
      if (term?.id === startedTermId) {
        auditFinalElapsed = auditElapsed;
        auditing = false;
        stopAuditTimer();
      }
    }
  }

  /**
   * Re-translates the current term via AI and enters edit mode with the new values
   * pre-filled so the user can review before saving. Used when senses are empty/broken.
   */
  async function retranslateTerm() {
    if (!term) return;
    const startedTermId = term.id;
    retranslating = true;
    retranslateError = '';
    retranslateAttempts = [];
    startRetranslateTimer();
    try {
      const { result } = await translateTerm(term.text, (a) => {
        if (term?.id !== startedTermId) return;
        const last = retranslateAttempts[retranslateAttempts.length - 1];
        if (last && last.model === a.model && last.status === 'trying') {
          retranslateAttempts = [...retranslateAttempts.slice(0, -1), a];
        } else {
          retranslateAttempts = [...retranslateAttempts, a];
        }
      });

      if (term?.id !== startedTermId) return;

      // Enter edit mode and pre-fill senses with the fresh translation
      enterEditMode();

      const generalIdx = editSenses.findIndex((s) => s.register === 'general');
      if (generalIdx !== -1) {
        editSenses[generalIdx] = {
          ...editSenses[generalIdx],
          en: result.en,
          vi: result.vi,
          note: result.note,
        };
      } else {
        editSenses = [
          {
            id: 'new-' + Date.now(),
            termId: term.id,
            register: 'general',
            en: result.en,
            vi: result.vi,
            note: result.note,
            sortOrder: 0,
          },
          ...editSenses,
        ];
      }

      // Fill or add Scrum sense if AI identified this as a Scrum term
      if (result.isScrumTerm && result.scrumEn && result.scrumVi) {
        const scrumIdx = editSenses.findIndex((s) => s.register === 'scrum');
        if (scrumIdx !== -1 && (!editSenses[scrumIdx].en.trim() || !editSenses[scrumIdx].vi.trim())) {
          // Overwrite only if the existing scrum sense is also empty
          editSenses[scrumIdx] = {
            ...editSenses[scrumIdx],
            en: result.scrumEn,
            vi: result.scrumVi,
          };
        } else if (scrumIdx === -1) {
          editSenses = [
            ...editSenses,
            {
              id: 'new-' + (Date.now() + 1),
              termId: term.id,
              register: 'scrum',
              en: result.scrumEn,
              vi: result.scrumVi,
              note: '',
              sortOrder: editSenses.length,
            },
          ];
        }
      }
    } catch (e: unknown) {
      if (term?.id === startedTermId) {
        retranslateError = e instanceof Error ? e.message : String(e);
      }
    } finally {
      if (term?.id === startedTermId) {
        retranslateFinalElapsed = retranslateElapsed;
        retranslating = false;
        stopRetranslateTimer();
      }
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

  /** True when at least one sense has an empty en or vi — triggers the ❌ banner */
  $: hasEmptySenses = senses.some((s) => !s.en.trim() || !s.vi.trim());
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
          <!-- ❌ Empty-sense major warning — shown when any sense has blank en or vi -->
          {#if hasEmptySenses && !editMode}
            <div class="empty-sense-banner">
              <span class="empty-sense-icon">❌</span>
              <div class="empty-sense-text">
                <strong>Nghĩa trống — từ chưa dùng được (major)</strong>
                <span>AI sẽ dịch lại và điền vào form để bạn xem trước khi lưu</span>
              </div>
              <button
                class="btn btn-primary btn-sm"
                on:click={retranslateTerm}
                disabled={retranslating}
                type="button"
              >
                {retranslating ? 'Đang dịch...' : '🔄 Dịch lại'}
              </button>
            </div>
          {/if}

          {#if retranslateError}
            <p style="color:var(--error);font-size:0.82rem;margin-top:0.4rem">{retranslateError}</p>
          {/if}

          <!-- Retranslate model-progress panel -->
          {#if retranslating || (retranslateAttempts.length && !editMode)}
            <div class="audit-progress" class:audit-progress--done={!retranslating && retranslateAttempts.length > 0}>
              <div class="ap-header">
                <span class="ap-status">
                  {#if retranslating}
                    <span class="ap-spinner" aria-hidden="true"></span>
                    Đang dịch lại…
                  {:else}
                    <span style="color:var(--success)">✓</span>
                    Dịch xong — xem lại và lưu
                  {/if}
                </span>
                {#if retranslating && retranslateElapsed >= 1}
                  <span class="ap-elapsed" class:ap-elapsed--slow={retranslateElapsed >= 8}>⏱ {retranslateElapsed}s</span>
                {:else if !retranslating && retranslateFinalElapsed >= 1}
                  <span class="ap-elapsed" style="opacity:0.5">⏱ {retranslateFinalElapsed}s</span>
                {/if}
              </div>
              <div class="ap-track">
                {#each MODELS as m, i}
                  {@const st = i < retranslateAttempts.length ? retranslateAttempts[i].status : 'pending'}
                  <div class="ap-dot ap-dot--{st}" class:ap-dot--free={isFreeModel(m)} title="{friendlyModel(m)}"></div>
                {/each}
                <span class="ap-fraction">{retranslateAttempts.length}/{MODELS.length}</span>
              </div>
              <ul class="ap-list">
                {#each retranslateAttempts as a (a.model + a.status)}
                  <li class="ap-row ap-row--{a.status}">
                    <span class="ap-icon">
                      {#if a.status === 'trying'}<span class="ap-spin">↻</span>
                      {:else if a.status === 'failed'}✗
                      {:else}✓{/if}
                    </span>
                    <span class="ap-badge" class:ap-badge--paid={!isFreeModel(a.model)}>
                      {isFreeModel(a.model) ? 'F' : '$'}
                    </span>
                    <code class="ap-model">{friendlyModel(a.model)}</code>
                    {#if a.status === 'trying'}
                      <span class="ap-running">xử lý…</span>
                    {:else if a.error}
                      <span class="ap-err">— {a.error.slice(0, 50)}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
              {#if retranslating && retranslateElapsed >= 8}
                <p class="ap-slow">⏳ Hơi lâu rồi — vẫn đang xử lý, xin chờ thêm chút…</p>
              {/if}
            </div>
          {/if}

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

          <!-- Audit model-progress panel (mirrors NgramPopup translate progress) -->
          {#if auditing || auditAttempts.length}
            <div class="audit-progress" class:audit-progress--done={!auditing && auditAttempts.length > 0}>
              <div class="ap-header">
                <span class="ap-status">
                  {#if auditing}
                    <span class="ap-spinner" aria-hidden="true"></span>
                    Đang audit…
                  {:else}
                    <span style="color:var(--success)">✓</span>
                    Audit xong
                  {/if}
                </span>
                {#if auditing && auditElapsed >= 1}
                  <span class="ap-elapsed" class:ap-elapsed--slow={auditElapsed >= 8}>⏱ {auditElapsed}s</span>
                {:else if !auditing && auditFinalElapsed >= 1}
                  <span class="ap-elapsed" style="opacity:0.5">⏱ {auditFinalElapsed}s</span>
                {/if}
              </div>
              <div class="ap-track">
                {#each MODELS as m, i}
                  {@const st = i < auditAttempts.length ? auditAttempts[i].status : 'pending'}
                  <div class="ap-dot ap-dot--{st}" class:ap-dot--free={isFreeModel(m)} title="{friendlyModel(m)}"></div>
                {/each}
                <span class="ap-fraction">{auditAttempts.length}/{MODELS.length}</span>
              </div>
              <ul class="ap-list">
                {#each auditAttempts as a (a.model + a.status)}
                  <li class="ap-row ap-row--{a.status}">
                    <span class="ap-icon">
                      {#if a.status === 'trying'}<span class="ap-spin">↻</span>
                      {:else if a.status === 'failed'}✗
                      {:else}✓{/if}
                    </span>
                    <span class="ap-badge" class:ap-badge--paid={!isFreeModel(a.model)}>
                      {isFreeModel(a.model) ? 'F' : '$'}
                    </span>
                    <code class="ap-model">{friendlyModel(a.model)}</code>
                    {#if a.status === 'trying'}
                      <span class="ap-running">xử lý…</span>
                    {:else if a.error}
                      <span class="ap-err">— {a.error.slice(0, 50)}</span>
                    {/if}
                  </li>
                {/each}
              </ul>
              {#if auditing && auditElapsed >= 8}
                <p class="ap-slow">⏳ Hơi lâu rồi — vẫn đang xử lý, xin chờ thêm chút…</p>
              {/if}
            </div>
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

  /* ─── Empty-sense major warning banner ──────────────────────────────────── */

  .empty-sense-banner {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: rgba(220, 38, 38, 0.07);
    border: 1.5px solid var(--error);
    border-radius: 8px;
    padding: 0.55rem 0.75rem;
    margin-top: 0.75rem;
  }

  .empty-sense-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }

  .empty-sense-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .empty-sense-text strong {
    font-size: 0.82rem;
    color: var(--error);
  }

  .empty-sense-text span {
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  /* ─── Audit model-progress panel ─────────────────────────────────────────── */

  .audit-progress {
    margin-top: 0.5rem;
    padding: 0.5rem 0.65rem;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.78rem;
  }

  .audit-progress--done {
    border-color: var(--success);
  }

  .ap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .ap-status {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .ap-spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: ap-spin 0.75s linear infinite;
    flex-shrink: 0;
  }

  @keyframes ap-spin {
    to { transform: rotate(360deg); }
  }

  .ap-elapsed {
    font-size: 0.72rem;
    color: var(--text-secondary);
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }

  .ap-elapsed--slow {
    color: #d97706;
    font-weight: 700;
    opacity: 1;
  }

  .ap-track {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .ap-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    background: transparent;
    transition: background 0.2s;
  }

  .ap-dot--pending { opacity: 0.3; }

  .ap-dot--trying {
    background: var(--primary);
    border-color: var(--primary);
    animation: ap-dot-pulse 0.9s ease-in-out infinite;
  }

  @keyframes ap-dot-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.4); opacity: 0.65; }
  }

  .ap-dot--failed {
    background: var(--text-secondary);
    border-color: var(--text-secondary);
    opacity: 0.4;
  }

  .ap-dot--succeeded {
    background: var(--success);
    border-color: var(--success);
  }

  .ap-fraction {
    font-size: 0.65rem;
    color: var(--text-secondary);
    margin-left: 4px;
    opacity: 0.65;
  }

  .ap-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .ap-row {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    font-size: 0.76rem;
    line-height: 1.5;
  }

  .ap-icon { width: 0.9rem; text-align: center; flex-shrink: 0; }

  .ap-spin { display: inline-block; animation: ap-spin 0.9s linear infinite; }

  .ap-badge {
    font-size: 0.58rem;
    font-weight: 700;
    padding: 0.02rem 0.22rem;
    border-radius: 3px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .ap-badge--paid {
    color: var(--primary);
    border-color: var(--primary);
    opacity: 0.8;
  }

  .ap-model {
    font-family: ui-monospace, 'SF Mono', Menlo, monospace;
    font-size: 0.72rem;
    background: var(--surface);
    padding: 0.03rem 0.28rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    white-space: nowrap;
  }

  .ap-running { font-size: 0.7rem; color: var(--primary); font-style: italic; }
  .ap-err     { font-size: 0.7rem; color: var(--text-secondary); font-style: italic; }

  .ap-row--trying .ap-model { border-color: var(--primary); color: var(--primary); }
  .ap-row--failed { color: var(--text-secondary); }
  .ap-row--failed .ap-model { text-decoration: line-through; opacity: 0.6; }
  .ap-row--succeeded { color: var(--success); font-weight: 600; }
  .ap-row--succeeded .ap-model { border-color: var(--success); background: var(--success-light); color: var(--success); }

  .ap-slow {
    font-size: 0.74rem;
    color: #d97706;
    margin: 0;
    padding: 0.25rem 0.4rem;
    border-left: 2.5px solid #d97706;
    border-radius: 0 4px 4px 0;
    background: rgba(217, 119, 6, 0.08);
  }
</style>
