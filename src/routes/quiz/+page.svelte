<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import { progressMap, getProgress, saveProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, shuffleByIndex, getBadge } from '$lib/srs';
  import { sessionLookups } from '$lib/stores/session';
  import { authUser } from '$lib/stores/auth';
  import { tokenizeStem } from '$lib/translate';
  import type { Question, QuestionOption, Term } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';
  import NgramPopup from '$lib/components/NgramPopup.svelte';

  type ExamFilter = 'all' | 'PSM-I' | 'PSPO-I';
  const EXAM_FILTERS: ExamFilter[] = ['all', 'PSM-I', 'PSPO-I'];

  let allQuestions: Question[] = [];
  let examFilter: ExamFilter = 'all';

  // Session snapshot — linear flow, not an infinite loop
  let sessionQuestions: Question[] = [];
  let sessionIndex = 0;
  let sessionCorrect = 0;
  let sessionDone = false;
  let lookedUpTermsData: Term[] = [];

  // Per-question UI state
  let selectedIds: Set<string> = new Set();
  let answered = false;
  let options: QuestionOption[] = [];
  $: optionStems = options.map((o) => tokenizeStem(o.text, allTermsForTokenize));
  let termRefs: Term[] = [];
  let showHintPopover = false;
  let showExplanationSheet = false;
  let highlightedStem = '';
  let selectedTermId: string | null = null;
  let allTermsForTokenize: Term[] = [];
  let ngramSentence: string | null = null;
  let ngramCharIdx = 0;

  $: currentUserId = $authUser?.id;
  $: currentQ = sessionQuestions[sessionIndex] ?? null;
  $: progress = currentQ ? getProgress($progressMap, 'question', currentQ.id) : undefined;
  $: correctIds = new Set(options.filter((o) => o.correct).map((o) => o.id));
  $: correctCount = correctIds.size;
  $: isMulti = correctCount > 1;
  $: isCorrect =
    answered &&
    selectedIds.size === correctCount &&
    [...selectedIds].every((id) => correctIds.has(id));
  $: vocabCount = $sessionLookups.size;
  $: progressPct = sessionQuestions.length
    ? Math.round((sessionIndex / sessionQuestions.length) * 100)
    : 0;

  // Results derived
  $: scorePercent = sessionQuestions.length
    ? Math.round((sessionCorrect / sessionQuestions.length) * 100)
    : 0;
  $: adjustedReadiness = Math.max(0, scorePercent - (vocabCount > 4 ? 15 : 0));
  $: readinessVariant =
    adjustedReadiness >= 85 ? 'ready' : adjustedReadiness >= 60 ? 'warn' : 'danger';
  $: readinessLabel =
    adjustedReadiness >= 85
      ? 'ĐÃ SẴN SÀNG'
      : adjustedReadiness >= 60
        ? 'CẦN LUYỆN THÊM'
        : 'CHƯA SẴN SÀNG';

  $: if (currentQ) loadQuestion(currentQ);

  onMount(async () => {
    [allQuestions, allTermsForTokenize] = await Promise.all([
      db.questions.toArray(),
      db.terms.toArray(),
    ]);
    initSession();
  });

  function buildPool(filter: ExamFilter): Question[] {
    const filtered = allQuestions.filter((q) => filter === 'all' || q.exam === filter);
    const due = filtered.filter((q) => canPractice(getProgress($progressMap, 'question', q.id)));
    return due.length ? due : filtered;
  }

  function initSession() {
    sessionQuestions = buildPool(examFilter);
    sessionIndex = 0;
    sessionCorrect = 0;
    sessionDone = false;
    lookedUpTermsData = [];
    answered = false;
    selectedIds = new Set();
    showHintPopover = false;
    showExplanationSheet = false;
    sessionLookups.set(new Map());
  }

  function changeFilter(f: ExamFilter) {
    examFilter = f;
    if (allQuestions.length > 0) initSession();
  }

  async function loadQuestion(q: Question) {
    answered = false;
    selectedIds = new Set();
    showHintPopover = false;
    showExplanationSheet = false;

    const [opts, refs] = await Promise.all([
      db.questionOptions.where('questionId').equals(q.id).toArray(),
      q.termRefs.length ? db.terms.where('id').anyOf(q.termRefs).toArray() : Promise.resolve([]),
    ]);

    options = shuffleByIndex(
      opts.sort((a, b) => a.sortOrder - b.sortOrder),
      sessionIndex
    );
    termRefs = refs;
    highlightedStem = tokenizeStem(q.stem, allTermsForTokenize);
  }

  function handleStemInteraction(e: MouseEvent | KeyboardEvent) {
    if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;

    const target = e.target as HTMLElement;
    const termEl = target.closest<HTMLElement>('[data-term-id]');
    const wordEl = target.closest<HTMLElement>('[data-word]');
    if (!termEl && !wordEl) return;

    // Stop the click from reaching the surrounding <label>, which would
    // otherwise toggle the answer's radio/checkbox.
    e.preventDefault();
    e.stopPropagation();

    // Glossary term → open its detail popup directly (skip n-gram picker)
    if (termEl?.dataset.termId) {
      selectedTermId = termEl.dataset.termId;
      return;
    }

    if (!currentUserId || !wordEl) return;
    const sentenceEl = wordEl.closest<HTMLElement>('[data-sentence]');
    const sentence = sentenceEl?.dataset.sentence ?? wordEl.dataset.word ?? '';
    const charIdx = parseInt(wordEl.dataset.charIdx ?? '0', 10);
    ngramSentence = sentence;
    ngramCharIdx = charIdx;
  }

  async function onNgramSelect(termId: string) {
    ngramSentence = null;
    allTermsForTokenize = await db.terms.toArray();
    selectedTermId = termId;
  }

  async function toggleOption(opt: QuestionOption) {
    if (answered) return;

    if (isMulti) {
      // Multi: toggle, auto-submit when user has selected `correctCount` items
      const next = new Set(selectedIds);
      if (next.has(opt.id)) next.delete(opt.id);
      else next.add(opt.id);
      selectedIds = next;
      if (next.size === correctCount) await submitAnswer();
    } else {
      // Single: pick → submit immediately
      selectedIds = new Set([opt.id]);
      await submitAnswer();
    }
  }

  async function submitAnswer() {
    answered = true;
    const allCorrect =
      selectedIds.size === correctCount && [...selectedIds].every((id) => correctIds.has(id));
    if (allCorrect) sessionCorrect++;
    if (currentQ) {
      await saveProgress(improveProgress(progress, 'question', currentQ.id, !allCorrect));
    }
  }

  async function nextQuestion() {
    showHintPopover = false;
    showExplanationSheet = false;
    if (sessionIndex >= sessionQuestions.length - 1) {
      await finishSession();
    } else {
      sessionIndex++;
    }
  }

  async function finishSession() {
    sessionDone = true;
    if ($sessionLookups.size > 0) {
      const ids = [...$sessionLookups.keys()];
      lookedUpTermsData = await db.terms.where('id').anyOf(ids).toArray();
    }
  }

  function optionClass(opt: QuestionOption): string {
    if (!answered) return selectedIds.has(opt.id) ? 'picked' : '';
    const classes: string[] = [];
    const picked = selectedIds.has(opt.id);
    const correct = opt.correct;
    if (picked) classes.push('picked');
    if (correct) classes.push('correct');
    if (picked && !correct) classes.push('incorrect');
    if (!picked && correct) classes.push('missed');
    return classes.join(' ');
  }

  function qualityBadgeLabel(q: Question): string {
    if (q.quality === 'trusted') return q.source ?? 'Scrum.org';
    return q.source ? `Tham khảo · ${q.source}` : 'Tham khảo';
  }
</script>

<svelte:head>
  <title>Kiểm tra · KfR</title>
</svelte:head>

<!-- Filter bar -->
<div class="quiz-filter-bar">
  {#each EXAM_FILTERS as f}
    <button
      class="btn btn-sm {examFilter === f ? 'btn-primary' : 'btn-ghost'}"
      on:click={() => changeFilter(f)}
    >
      {f === 'all' ? 'Tất cả' : f}
    </button>
  {/each}
  <div class="quiz-filter-meta">
    {#if vocabCount > 0}
      <span class="vocab-counter-badge">📖 {vocabCount} từ</span>
    {/if}
    {#if !sessionDone}
      <span class="counter-badge">{sessionQuestions.length} câu</span>
    {/if}
  </div>
</div>

<!-- ── RESULTS CARD ── -->
{#if sessionDone}
  <div class="card">
    <div class="result-header">
      <div class="result-icon">🎓</div>
      <h2 style="margin:0.5rem 0 0.25rem">Kết quả phiên luyện tập</h2>
      <p class="text-secondary" style="font-size:0.9rem">
        Đánh giá mức độ sẵn sàng đọc hiểu tiếng Anh chuyên ngành Scrum
      </p>
    </div>

    <div class="result-grid">
      <div class="result-stat">
        <div class="result-stat-value">{sessionCorrect}/{sessionQuestions.length}</div>
        <div class="result-stat-label">Kết quả</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-value" style="color:var(--success)">{scorePercent}%</div>
        <div class="result-stat-label">Tỷ lệ đúng</div>
      </div>
      <div class="result-stat">
        <div class="result-stat-value" style="color:var(--warning)">{vocabCount}</div>
        <div class="result-stat-label">Từ đã tra</div>
      </div>
    </div>

    <div class="readiness-section">
      <div class="readiness-header">
        <span style="font-size:0.9rem;font-weight:600">Đánh giá Readiness:</span>
        <span class="readiness-badge readiness-badge-{readinessVariant}">{readinessLabel}</span>
      </div>
      <div class="readiness-track">
        <div
          class="readiness-fill readiness-fill-{readinessVariant}"
          style="width:{adjustedReadiness}%"
        ></div>
      </div>
      <p class="text-secondary" style="font-size:0.85rem;margin-top:0.75rem;line-height:1.5">
        {#if adjustedReadiness >= 85}
          🎉 Tuyệt vời! Khả năng đọc hiểu vững vàng, ít phụ thuộc tra từ. Bạn sẵn sàng thi thật!
        {:else if adjustedReadiness >= 60}
          📚 Nền tảng tư duy tốt, nhưng tần suất tra từ còn cao. Hãy ôn lại từ vựng dưới đây.
        {:else}
          🔄 Cần luyện thêm. Hãy ôn Scrum Guide song ngữ và thực hành thêm câu hỏi tình huống.
        {/if}
      </p>
    </div>

    {#if lookedUpTermsData.length > 0}
      <div class="vocab-reinforce-section">
        <p class="vocab-reinforce-title">
          📌 Từ vựng bạn đã tra trong phiên này (click để xem lại):
        </p>
        <div class="tags">
          {#each lookedUpTermsData as t}
            <button class="tag" on:click={() => (selectedTermId = t.id)}>
              {t.text}{#if ($sessionLookups.get(t.id) ?? 0) > 1}<span
                  style="opacity:0.6;margin-left:0.2rem">×{$sessionLookups.get(t.id)}</span
                >{/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <button class="btn btn-primary mt-2" style="width:100%" on:click={initSession}>
      🔄 Bắt đầu phiên mới
    </button>
  </div>

  <!-- ── EMPTY STATE ── -->
{:else if sessionQuestions.length === 0}
  <div class="empty-state">
    {#if allQuestions.length === 0}
      <p>Chưa có câu hỏi nào. Hãy thêm qua Supabase Studio.</p>
    {:else}
      <p>Không có câu hỏi nào cho bộ lọc này.</p>
    {/if}
  </div>

  <!-- ── QUIZ CARD ── -->
{:else if currentQ}
  <!-- Progress bar -->
  <div class="quiz-progress-section">
    <div class="quiz-progress-meta">
      <span class="text-secondary" style="font-size:0.82rem">
        Câu {sessionIndex + 1} / {sessionQuestions.length}
      </span>
      <div class="flex items-center gap-1">
        <span class="tag" style="cursor:default">{currentQ.exam}</span>
        <span class="quality-badge quality-{currentQ.quality}" title={currentQ.source ?? ''}>
          {currentQ.quality === 'trusted' ? '🟢' : '🟡'}
          {qualityBadgeLabel(currentQ)}
        </span>
        <span>{getBadge(progress?.level ?? -1)}</span>
      </div>
    </div>
    <div class="quiz-progress-track">
      <div class="quiz-progress-fill" style="width:{progressPct}%"></div>
    </div>
  </div>

  <div class="card quiz-card">
    <!-- Question stem -->
    <div
      class="question-stem"
      data-sentence={currentQ.stem}
      on:click={handleStemInteraction}
      on:keydown={handleStemInteraction}
      role="presentation"
    >
      {@html highlightedStem}
    </div>

    <p class="glossary-hint-label">💡 Click từ trong câu để tra nghĩa hoặc chọn cụm</p>

    <!-- Multi-select hint -->
    {#if isMulti}
      <div class="multi-hint">
        ☑ Chọn {correctCount} đáp án — tự động chấm khi đủ
      </div>
    {/if}

    <!-- Answer options -->
    <div class="quiz-options">
      {#each options as opt, i}
        <label class="quiz-option {optionClass(opt)}" class:disabled={answered}>
          <input
            type={isMulti ? 'checkbox' : 'radio'}
            name="quiz-answer-{currentQ.id}"
            class="option-input"
            checked={selectedIds.has(opt.id)}
            disabled={answered}
            on:change={() => toggleOption(opt)}
          />
          <span class="option-letter-label">{String.fromCharCode(65 + i)}</span>
          <span
            class="option-text"
            data-sentence={opt.text}
            on:click={handleStemInteraction}
            on:keydown={handleStemInteraction}
            role="presentation">{@html optionStems[i] ?? opt.text}</span
          >
          {#if answered}
            <span class="option-mark">
              {#if opt.correct}✓{:else if selectedIds.has(opt.id)}✗{/if}
            </span>
          {/if}
        </label>
      {/each}
    </div>

    <!-- Pad bottom so sticky bar doesn't overlap content -->
    {#if answered}
      <div class="quiz-card-pad" aria-hidden="true"></div>
    {/if}
  </div>

  <!-- Hint button + popover (pre-answer only) -->
  {#if currentQ.explanationVi && !answered}
    <div class="hint-trigger-wrap">
      <button
        class="hint-trigger-btn"
        on:click={() => (showHintPopover = !showHintPopover)}
        aria-expanded={showHintPopover}
      >
        {showHintPopover ? '▲ Ẩn gợi ý' : '💡 Gợi ý tư duy'}
      </button>
      {#if showHintPopover}
        <div class="hint-popover" role="tooltip">
          {currentQ.explanationVi}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Sticky bottom action bar (post-answer) -->
  {#if answered}
    <div class="action-bar" role="region" aria-label="Kết quả câu">
      <div class="action-bar-status action-bar-status-{isCorrect ? 'correct' : 'incorrect'}">
        <span class="answer-feedback-icon">{isCorrect ? '✓' : '✗'}</span>
        <span>{isCorrect ? 'Chính xác' : 'Chưa đúng'}</span>
        <span class="session-live-score">{sessionCorrect}/{sessionIndex + 1}</span>
      </div>
      {#if currentQ.explanationVi || currentQ.explanationEn || termRefs.length}
        <button
          class="btn btn-ghost btn-sm action-bar-info"
          on:click={() => (showExplanationSheet = true)}
          aria-label="Xem giải thích"
        >
          ℹ️ Giải thích
        </button>
      {/if}
      <button class="btn btn-primary btn-sm action-bar-next" on:click={nextQuestion}>
        {sessionIndex < sessionQuestions.length - 1 ? 'Câu tiếp ▶' : '🎓 Xem kết quả'}
      </button>
    </div>
  {/if}

  <!-- Explanation sheet (overlay, slides up) -->
  {#if showExplanationSheet}
    <div
      class="gloss-overlay"
      on:click={() => (showExplanationSheet = false)}
      role="presentation"
    ></div>
    <div class="gloss-popup" role="dialog" aria-modal="true" aria-label="Giải thích">
      <button class="gloss-close" on:click={() => (showExplanationSheet = false)} aria-label="Đóng"
        >✕</button
      >
      <h3 style="margin:0 0 0.75rem 0;font-size:1rem">📖 Giải thích</h3>
      {#if currentQ.explanationVi}
        <p style="font-size:0.9rem;line-height:1.55">{currentQ.explanationVi}</p>
      {/if}
      {#if currentQ.explanationEn}
        <p class="text-secondary mt-1" style="font-size:0.85rem;line-height:1.5">
          {currentQ.explanationEn}
        </p>
      {/if}
      {#if termRefs.length}
        <div class="mt-2">
          <p class="text-secondary" style="font-size:0.78rem;margin-bottom:0.4rem">
            📌 Thuật ngữ trong câu hỏi:
          </p>
          <div class="tags">
            {#each termRefs as term}
              <button
                class="tag"
                on:click={() => {
                  showExplanationSheet = false;
                  selectedTermId = term.id;
                }}>{term.text}</button
              >
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
{/if}

<!-- N-gram phrase picker (opens on plain-word tap) -->
{#if ngramSentence && currentUserId}
  <NgramPopup
    sentence={ngramSentence}
    charIdx={ngramCharIdx}
    ownerId={currentUserId}
    on:select={(e) => onNgramSelect(e.detail)}
    on:close={() => (ngramSentence = null)}
  />
{/if}

<!-- Term detail popup -->
<TermPopup termId={selectedTermId} on:close={() => (selectedTermId = null)} />
