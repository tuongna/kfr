<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import { progressMap, getProgress, saveProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, shuffleByIndex, getBadge } from '$lib/srs';
  import type { Question, QuestionOption, Term } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';

  type ExamFilter = 'all' | 'PSM-I' | 'PSPO-I';
  const EXAM_FILTERS: ExamFilter[] = ['all', 'PSM-I', 'PSPO-I'];

  let questions: Question[] = [];
  let examFilter: ExamFilter = 'all';
  let currentIndex = 0;
  let selectedOptionId: string | null = null;
  let answered = false;
  let wrongAnswer = false;
  let options: QuestionOption[] = [];
  let termRefs: Term[] = [];
  let selectedTermId: string | null = null;
  let showExplanation = false;

  $: filtered = questions.filter(
    (q) => examFilter === 'all' || q.exam === examFilter
  );

  $: dueQuestions = filtered.filter((q) => canPractice(getProgress($progressMap, 'question', q.id)));

  $: currentQ = dueQuestions[currentIndex] ?? null;

  $: progress = currentQ ? getProgress($progressMap, 'question', currentQ.id) : undefined;

  $: if (currentQ) loadQuestion(currentQ);

  onMount(async () => {
    questions = await db.questions.toArray();
  });

  async function loadQuestion(q: Question) {
    answered = false;
    selectedOptionId = null;
    wrongAnswer = false;
    showExplanation = false;

    const [opts, refs] = await Promise.all([
      db.questionOptions.where('questionId').equals(q.id).toArray(),
      q.termRefs.length
        ? db.terms.where('id').anyOf(q.termRefs).toArray()
        : Promise.resolve([]),
    ]);

    // Shuffle options deterministically
    options = shuffleByIndex(opts.sort((a, b) => a.sortOrder - b.sortOrder), currentIndex);
    termRefs = refs;
  }

  async function selectOption(opt: QuestionOption) {
    if (answered) return;
    answered = true;
    selectedOptionId = opt.id;

    if (!opt.correct) {
      wrongAnswer = true;
    }

    if (currentQ) {
      const updated = improveProgress(progress, 'question', currentQ.id, !opt.correct);
      await saveProgress(updated);
    }
  }

  function nextQuestion() {
    if (!dueQuestions.length) return;
    currentIndex = (currentIndex + 1) % dueQuestions.length;
    answered = false;
    selectedOptionId = null;
    wrongAnswer = false;
    showExplanation = false;
  }

  function optionClass(opt: QuestionOption): string {
    if (!answered) return '';
    if (opt.id === selectedOptionId) {
      return opt.correct ? 'correct' : 'incorrect';
    }
    if (opt.correct) return 'correct'; // show correct after wrong answer
    return '';
  }
</script>

<svelte:head>
  <title>Kiểm tra · KfR</title>
</svelte:head>

<!-- Filter bar -->
<div class="flex gap-1 mb-2">
  {#each EXAM_FILTERS as f}
    <button
      class="btn btn-sm {examFilter === f ? 'btn-primary' : 'btn-ghost'}"
      on:click={() => { examFilter = f; currentIndex = 0; }}
    >
      {f === 'all' ? 'Tất cả' : f}
    </button>
  {/each}
  <span class="counter-badge" style="margin-left:auto;align-self:center">{dueQuestions.length} câu cần ôn</span>
</div>

{#if dueQuestions.length === 0}
  <div class="empty-state">
    {#if filtered.length === 0}
      <p>Chưa có câu hỏi nào. Hãy thêm qua Supabase Studio.</p>
    {:else}
      <p>🎉 Tuyệt vời! Không còn câu nào cần ôn tập hôm nay.</p>
      <p class="mt-1 text-secondary" style="font-size:0.85rem">Tổng {filtered.length} câu trong bộ đề.</p>
    {/if}
  </div>
{:else if currentQ}
  <!-- Progress indicator -->
  <div class="flex items-center justify-between mt-1 mb-2">
    <span class="text-secondary" style="font-size:0.85rem">{currentIndex + 1} / {dueQuestions.length}</span>
    <span class="tag">{currentQ.exam}</span>
    <span>{getBadge(progress?.level ?? -1)}</span>
  </div>

  <!-- Question card -->
  <div class="card">
    <p style="font-size:1.05rem;line-height:1.6;margin-bottom:1rem">{currentQ.stem}</p>

    <div class="quiz-options">
      {#each options as opt}
        <button
          class="quiz-option {optionClass(opt)}"
          on:click={() => selectOption(opt)}
          disabled={answered}
        >
          {opt.text}
        </button>
      {/each}
    </div>

    <!-- Explanation & key terms (shown after answering) -->
    {#if answered}
      <div class="mt-2">
        {#if wrongAnswer}
          <p style="color:var(--error);font-weight:600;margin-bottom:0.5rem">✗ Sai rồi!</p>
        {:else}
          <p style="color:var(--success);font-weight:600;margin-bottom:0.5rem">✓ Chính xác!</p>
        {/if}

        <!-- Toggle explanation -->
        {#if currentQ.explanationVi || currentQ.explanationEn}
          <button
            class="btn btn-ghost btn-sm"
            on:click={() => (showExplanation = !showExplanation)}
          >
            {showExplanation ? '▲ Ẩn giải thích' : '▼ Xem giải thích'}
          </button>

          {#if showExplanation}
            <div class="card mt-1" style="background:var(--primary-light);box-shadow:none;padding:1rem">
              {#if currentQ.explanationVi}
                <p style="font-size:0.9rem">{currentQ.explanationVi}</p>
              {/if}
              {#if currentQ.explanationEn}
                <p class="text-secondary mt-1" style="font-size:0.85rem">{currentQ.explanationEn}</p>
              {/if}
            </div>
          {/if}
        {/if}

        <!-- Key terms referenced in this question (tap to gloss) -->
        {#if termRefs.length}
          <div class="mt-2">
            <p class="text-secondary" style="font-size:0.8rem;margin-bottom:0.4rem">📌 Thuật ngữ trong câu hỏi:</p>
            <div class="tags">
              {#each termRefs as term}
                <button class="tag" on:click={() => (selectedTermId = term.id)}>
                  {term.text}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <button class="btn btn-primary mt-2" style="width:100%" on:click={nextQuestion}>
          Câu tiếp theo ▶
        </button>
      </div>
    {/if}
  </div>
{/if}

<!-- Term detail popup -->
<TermPopup termId={selectedTermId} on:close={() => (selectedTermId = null)} />
