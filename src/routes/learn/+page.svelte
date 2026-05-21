<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import { progressMap, getProgress, saveProgress } from '$lib/stores/mastery';
  import { improveProgress, canPractice, getBadge, shuffleByIndex, BADGES } from '$lib/srs';
  import type { Term, TermSense } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';

  let terms: Term[] = [];
  let currentIndex = 0;
  let revealed = false;
  let senses: TermSense[] = [];
  let practiceMode = false; // only show items due for review
  let selectedTermId: string | null = null;

  // Persist page index across sessions
  const INDEX_KEY = 'learn_index';
  const PRACTICE_KEY = 'learn_practice';

  $: displayTerms = practiceMode
    ? terms.filter((t) => canPractice(getProgress($progressMap, 'term', t.id)))
    : terms;

  $: currentTerm = displayTerms[currentIndex] ?? null;

  $: if (currentTerm) loadSenses(currentTerm.id);

  $: progress = currentTerm ? getProgress($progressMap, 'term', currentTerm.id) : undefined;
  $: badge = getBadge(progress?.level ?? -1);

  onMount(async () => {
    terms = await db.terms.toArray();
    practiceMode = localStorage.getItem(PRACTICE_KEY) === '1';
    const saved = parseInt(localStorage.getItem(INDEX_KEY) ?? '0', 10);
    currentIndex = Math.min(saved, Math.max(0, displayTerms.length - 1));
    revealed = false;
  });

  async function loadSenses(termId: string) {
    senses = await db.termSenses.where('termId').equals(termId).sortBy('sortOrder');
    revealed = false;
  }

  function navigate(dir: 1 | -1) {
    if (!displayTerms.length) return;
    currentIndex = (currentIndex + dir + displayTerms.length) % displayTerms.length;
    localStorage.setItem(INDEX_KEY, String(currentIndex));
    revealed = false;
  }

  async function markCorrect() {
    if (!currentTerm) return;
    const updated = improveProgress(progress, 'term', currentTerm.id, false);
    await saveProgress(updated);
    navigate(1);
  }

  async function markWrong() {
    if (!currentTerm) return;
    const updated = improveProgress(progress, 'term', currentTerm.id, true);
    await saveProgress(updated);
    navigate(1);
  }

  function togglePractice() {
    practiceMode = !practiceMode;
    currentIndex = 0;
    localStorage.setItem(PRACTICE_KEY, practiceMode ? '1' : '0');
    revealed = false;
  }

  $: reviewCount = terms.filter((t) => canPractice(getProgress($progressMap, 'term', t.id))).length;

  // Level progress counts across ALL terms
  $: levelCounts = BADGES.map(
    (_, i) =>
      [...$progressMap.values()].filter((p) => p.itemType === 'term' && p.level >= i).length
  );
</script>

<svelte:head>
  <title>Học từ vựng · KfR</title>
</svelte:head>

<!-- Nav actions -->
<div class="nav-actions">
  <div class="flex gap-1 items-center">
    <button class="btn btn-secondary btn-sm" on:click={() => navigate(-1)} disabled={displayTerms.length < 2}>◀ Trước</button>
    <span class="counter-badge">{currentIndex + 1} / {displayTerms.length}</span>
    <button class="btn btn-secondary btn-sm" on:click={() => navigate(1)} disabled={displayTerms.length < 2}>Tiếp ▶</button>
  </div>

  <button class="btn btn-sm {practiceMode ? 'btn-primary' : 'btn-ghost'}" on:click={togglePractice}>
    🎯 Ôn tập
    {#if reviewCount > 0}<span class="counter-badge" style="background:white;color:var(--primary)">{reviewCount}</span>{/if}
  </button>
</div>

<!-- Progress bars -->
<div class="card" style="padding:1rem">
  <div class="progress-list">
    {#each BADGES as badge, i}
      <div class="progress-row">
        <progress value={levelCounts[i]} max={terms.length || 1}></progress>
        <span style="width:2rem;text-align:right">{badge}</span>
        <span class="text-secondary" style="width:3rem">{levelCounts[i]}/{terms.length}</span>
      </div>
    {/each}
  </div>
</div>

<!-- Flashcard -->
{#if displayTerms.length === 0}
  <div class="empty-state">
    {#if practiceMode}
      <p>🎉 Không có từ nào cần ôn hôm nay!</p>
      <button class="btn btn-ghost btn-sm mt-2" on:click={togglePractice}>Xem tất cả từ</button>
    {:else}
      <p>Chưa có từ vựng nào. Hãy thêm nội dung qua Supabase Studio.</p>
    {/if}
  </div>
{:else if currentTerm}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-interactive-supports-focus -->
  <div class="card" role="button" on:click={() => (revealed = !revealed)}
       style="cursor:pointer;user-select:none;min-height:200px">
    <div class="card-badge">{badge}</div>
    <div class="card-term">{currentTerm.text}</div>

    {#if currentTerm.ipa && revealed}
      <div class="card-ipa">[{currentTerm.ipa}]</div>
    {/if}

    {#if !revealed}
      <p class="text-secondary mt-2" style="font-size:0.9rem">👆 Nhấn để xem nghĩa</p>
    {:else}
      <!-- Multiple meanings shown together -->
      <div class="senses mt-2">
        {#each senses as sense}
          <div class="sense register-{sense.register}">
            <div class="sense-register">{sense.register === 'scrum' ? '📋 Scrum' : '📖 General'}</div>
            <div class="sense-en">{sense.en}</div>
            <div class="sense-vi">{sense.vi}</div>
          </div>
        {/each}
      </div>

      {#if currentTerm.tags.length}
        <div class="tags">
          {#each currentTerm.tags as tag}
            <button class="tag" on:click|stopPropagation={() => {}}>{tag}</button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>

  <!-- SRS controls (visible after reveal) -->
  {#if revealed && canPractice(progress)}
    <div class="flex gap-2 mt-1">
      <button class="btn btn-secondary" style="flex:1;color:var(--error);border-color:var(--error)" on:click={markWrong}>
        ✗ Chưa nhớ
      </button>
      <button class="btn btn-primary" style="flex:1" on:click={markCorrect}>
        ✓ Đã nhớ
      </button>
    </div>
  {:else if revealed && progress?.nextReview}
    <p class="text-secondary mt-1" style="text-align:center;font-size:0.85rem">
      Ôn lại vào {new Date(progress.nextReview).toLocaleDateString('vi-VN')}
    </p>
  {/if}
{/if}

<!-- Term detail popup (triggered from tags / external) -->
<TermPopup termId={selectedTermId} on:close={() => (selectedTermId = null)} />
