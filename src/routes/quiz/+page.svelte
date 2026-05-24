<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { db } from '$lib/db';
  import { progressMap, getProgress, saveProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, shuffleByIndex, getBadge } from '$lib/srs';
  import { sessionLookups } from '$lib/stores/session';
  import { authUser } from '$lib/stores/auth';
  import { tokenizeStem, lookupOrTranslate } from '$lib/translate';
  import type { Question, QuestionOption, Term } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';

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
  let selectedOptionId: string | null = null;
  let answered = false;
  let options: QuestionOption[] = [];
  $: optionStems = options.map((o) => tokenizeStem(o.text, allTermsForTokenize));
  let termRefs: Term[] = [];
  let showExplanation = false;
  let showHint = false;
  let highlightedStem = '';
  let selectedTermId: string | null = null;
  let allTermsForTokenize: Term[] = [];
  let translatingWord: string | null = null;
  let translateError: string | null = null;
  let phraseSelection: string | null = null;

  $: currentUserId = $authUser?.id;
  $: currentQ = sessionQuestions[sessionIndex] ?? null;
  $: progress = currentQ ? getProgress($progressMap, 'question', currentQ.id) : undefined;
  $: selectedOpt = options.find((o) => o.id === selectedOptionId);
  $: isCorrect = selectedOpt?.correct ?? false;
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
    document.addEventListener('selectionchange', updatePhraseSelection);
  });

  onDestroy(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('selectionchange', updatePhraseSelection);
    }
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
    selectedOptionId = null;
    showHint = false;
    sessionLookups.set(new Map());
  }

  function changeFilter(f: ExamFilter) {
    examFilter = f;
    if (allQuestions.length > 0) initSession();
  }

  async function loadQuestion(q: Question) {
    answered = false;
    selectedOptionId = null;
    showExplanation = false;
    showHint = false;
    phraseSelection = null;

    const [opts, refs] = await Promise.all([
      db.questionOptions.where('questionId').equals(q.id).toArray(),
      q.termRefs.length
        ? db.terms.where('id').anyOf(q.termRefs).toArray()
        : Promise.resolve([]),
    ]);

    options = shuffleByIndex(opts.sort((a, b) => a.sortOrder - b.sortOrder), sessionIndex);
    termRefs = refs;
    highlightedStem = tokenizeStem(q.stem, allTermsForTokenize);
  }

  async function handleStemInteraction(e: MouseEvent | KeyboardEvent) {
    if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;

    const termEl = (e.target as HTMLElement).closest<HTMLElement>('[data-term-id]');
    if (termEl?.dataset.termId) {
      selectedTermId = termEl.dataset.termId;
      phraseSelection = null;
      return;
    }

    if (!currentUserId || translatingWord) return;
    const wordEl = (e.target as HTMLElement).closest<HTMLElement>('[data-word]');
    if (!wordEl?.dataset.word) return;

    phraseSelection = null;
    const word = wordEl.dataset.word;
    translatingWord = word;
    translateError = null;
    try {
      const termId = await lookupOrTranslate(word, currentUserId);
      allTermsForTokenize = await db.terms.toArray();
      selectedTermId = termId;
    } catch (err) {
      console.error('Translation failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      translateError = `Dịch thất bại: ${msg.slice(0, 120)}`;
      setTimeout(() => (translateError = null), 6000);
    } finally {
      translatingWord = null;
    }
  }

  function updatePhraseSelection() {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!text || !sel || sel.rangeCount === 0) {
      phraseSelection = null;
      return;
    }
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node instanceof Element ? node : node.parentElement;
    if (!el?.closest('.question-stem, .quiz-options')) {
      phraseSelection = null;
      return;
    }
    if (text.length > 2 && /\s/.test(text)) {
      phraseSelection = text.replace(/\s+/g, ' ');
    } else {
      phraseSelection = null;
    }
  }

  async function translatePhrase() {
    if (!phraseSelection || !currentUserId || translatingWord) return;
    const phrase = phraseSelection;
    phraseSelection = null;
    window.getSelection()?.removeAllRanges();
    translatingWord = phrase;
    translateError = null;
    try {
      const termId = await lookupOrTranslate(phrase, currentUserId);
      allTermsForTokenize = await db.terms.toArray();
      selectedTermId = termId;
    } catch (err) {
      console.error('Phrase translation failed:', err);
      translateError = 'Dịch thất bại — thử lại sau';
      setTimeout(() => (translateError = null), 3000);
    } finally {
      translatingWord = null;
    }
  }

  function blurAnswerFocus() {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('.quiz-options')) {
      active.blur();
    }
  }

  async function selectOption(opt: QuestionOption) {
    if (answered) return;
    answered = true;
    selectedOptionId = opt.id;
    blurAnswerFocus();
    if (opt.correct) sessionCorrect++;
    if (currentQ) {
      await saveProgress(improveProgress(progress, 'question', currentQ.id, !opt.correct));
    }
  }

  async function nextQuestion() {
    blurAnswerFocus();
    if (sessionIndex >= sessionQuestions.length - 1) {
      await finishSession();
    } else {
      sessionIndex++;
      answered = false;
      selectedOptionId = null;
      showExplanation = false;
      showHint = false;
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
    if (!answered) return '';
    const classes: string[] = [];
    if (opt.id === selectedOptionId) classes.push('selected');
    if (opt.correct) classes.push('correct');
    else if (opt.id === selectedOptionId) classes.push('incorrect');
    return classes.join(' ');
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

    <!-- Score grid -->
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

    <!-- Readiness meter -->
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

    <!-- Vocab reinforcement list -->
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
        <span>{getBadge(progress?.level ?? -1)}</span>
      </div>
    </div>
    <div class="quiz-progress-track">
      <div class="quiz-progress-fill" style="width:{progressPct}%"></div>
    </div>
  </div>

  <div class="card">
    <!-- Question stem with inline glossary highlights -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="question-stem"
      on:click={handleStemInteraction}
      on:keydown={handleStemInteraction}
      role="presentation"
    >
      {@html highlightedStem}
    </div>

    <p class="glossary-hint-label">
      💡 Click từ đơn hoặc <em>bôi chọn cụm từ</em> để tra nghĩa
      {#if translatingWord}<span class="translate-loading">· Đang dịch "{translatingWord}"…</span>{/if}
      {#if translateError}<span class="translate-error">· {translateError}</span>{/if}
    </p>
    {#if phraseSelection && currentUserId && !translatingWord}
      <div class="phrase-translate-bar">
        <span class="phrase-preview">"{phraseSelection}"</span>
        <button class="btn btn-sm btn-primary" on:click={translatePhrase}>Dịch cụm</button>
        <button class="btn btn-sm btn-ghost" on:click={() => { phraseSelection = null; window.getSelection()?.removeAllRanges(); }}>✕</button>
      </div>
    {/if}

    <!-- Hint toggle (only visible before answering) -->
    {#if currentQ.explanationVi && !answered}
      <div class="hint-section">
        <button class="btn btn-ghost btn-sm" on:click={() => (showHint = !showHint)}>
          {showHint ? '▲ Ẩn gợi ý' : '💡 Gợi ý tư duy'}
        </button>
        {#if showHint}
          <div class="hint-box">{currentQ.explanationVi}</div>
        {/if}
      </div>
    {/if}

    <!-- Answer options: chip button selects, text supports word lookup -->
    <div class="quiz-options">
      {#each options as opt, i}
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div
          class="quiz-option {optionClass(opt)}"
          on:click={handleStemInteraction}
          on:keydown={handleStemInteraction}
        >
          <button
            class="option-letter"
            on:click|stopPropagation={() => selectOption(opt)}
            disabled={answered}
            aria-label="Chọn đáp án {String.fromCharCode(65 + i)}"
          >
            {String.fromCharCode(65 + i)}
          </button>
          <span class="option-text">{@html optionStems[i] ?? opt.text}</span>
        </div>
      {/each}
    </div>

    <!-- Post-answer feedback -->
    {#if answered}
      <div class="answer-feedback answer-feedback-{isCorrect ? 'correct' : 'incorrect'}">
        <span class="answer-feedback-icon">{isCorrect ? '✓' : '✗'}</span>
        <span>{isCorrect ? 'Chính xác!' : 'Sai rồi!'}</span>
        <span class="session-live-score">{sessionCorrect}/{sessionIndex + 1}</span>
      </div>

      {#if currentQ.explanationVi || currentQ.explanationEn}
        <button
          class="btn btn-ghost btn-sm"
          on:click={() => (showExplanation = !showExplanation)}
          style="margin-top:0.75rem"
        >
          {showExplanation ? '▲ Ẩn giải thích' : '▼ Xem giải thích đầy đủ'}
        </button>
        {#if showExplanation}
          <div class="explanation-box">
            {#if currentQ.explanationVi}
              <p style="font-size:0.9rem">{currentQ.explanationVi}</p>
            {/if}
            {#if currentQ.explanationEn}
              <p class="text-secondary mt-1" style="font-size:0.85rem">{currentQ.explanationEn}</p>
            {/if}
          </div>
        {/if}
      {/if}

      {#if termRefs.length}
        <div class="mt-2">
          <p class="text-secondary" style="font-size:0.8rem;margin-bottom:0.4rem">
            📌 Thuật ngữ trong câu hỏi:
          </p>
          <div class="tags">
            {#each termRefs as term}
              <button class="tag" on:click={() => (selectedTermId = term.id)}>{term.text}</button>
            {/each}
          </div>
        </div>
      {/if}

      <button class="btn btn-primary mt-2" style="width:100%" on:click={nextQuestion}>
        {sessionIndex < sessionQuestions.length - 1 ? 'Câu tiếp theo ▶' : '🎓 Xem kết quả phiên'}
      </button>
    {/if}
  </div>
{/if}

<!-- Term detail popup -->
<TermPopup termId={selectedTermId} on:close={() => (selectedTermId = null)} />
