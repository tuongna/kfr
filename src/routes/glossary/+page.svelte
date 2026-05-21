<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import { progressMap, getProgress } from '$lib/stores/mastery';
  import { getBadge, canPractice } from '$lib/srs';
  import type { Term, TermSense } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';

  let terms: Term[] = [];
  let search = '';
  let activeTag = '';
  let allTags: string[] = [];
  let expanded = new Set<string>();
  let sensesCache = new Map<string, TermSense[]>();
  let selectedTermId: string | null = null;

  onMount(async () => {
    terms = await db.terms.toArray();
    const tagSet = new Set<string>();
    terms.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    allTags = [...tagSet].sort();
  });

  $: filtered = terms.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.text.toLowerCase().includes(q);
    const matchTag = !activeTag || t.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  async function toggleExpand(termId: string) {
    if (expanded.has(termId)) {
      expanded.delete(termId);
      expanded = new Set(expanded);
    } else {
      if (!sensesCache.has(termId)) {
        const s = await db.termSenses.where('termId').equals(termId).sortBy('sortOrder');
        sensesCache.set(termId, s);
        sensesCache = new Map(sensesCache); // trigger reactivity
      }
      expanded.add(termId);
      expanded = new Set(expanded);
    }
  }
</script>

<svelte:head>
  <title>Tra cứu thuật ngữ · KfR</title>
</svelte:head>

<!-- Search bar -->
<div class="search-bar">
  <input
    class="search-input"
    type="search"
    placeholder="Tìm thuật ngữ..."
    bind:value={search}
  />
</div>

<!-- Tag filter -->
{#if allTags.length}
  <div class="tags" style="margin-bottom:1rem">
    <button class="tag {!activeTag ? 'btn-primary' : ''}"
            style="{!activeTag ? 'background:var(--primary);color:white' : ''}"
            on:click={() => (activeTag = '')}>Tất cả</button>
    {#each allTags as tag}
      <button class="tag {activeTag === tag ? 'btn-primary' : ''}"
              style="{activeTag === tag ? 'background:var(--primary);color:white' : ''}"
              on:click={() => (activeTag = activeTag === tag ? '' : tag)}>{tag}</button>
    {/each}
  </div>
{/if}

<!-- Results count -->
<p class="text-secondary" style="font-size:0.85rem;margin-bottom:0.75rem">
  {filtered.length} thuật ngữ
</p>

{#if filtered.length === 0}
  <div class="empty-state">
    {#if terms.length === 0}
      <p>Chưa có thuật ngữ nào. Hãy thêm nội dung qua Supabase Studio.</p>
    {:else}
      <p>Không tìm thấy kết quả.</p>
    {/if}
  </div>
{:else}
  {#each filtered as term (term.id)}
    {@const progress = getProgress($progressMap, 'term', term.id)}
    {@const isDue = canPractice(progress)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-interactive-supports-focus -->
    <div class="card" role="button" on:click={() => toggleExpand(term.id)}
         style="cursor:pointer;margin-bottom:0.6rem;padding:1rem">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <span style="font-weight:600;font-size:1rem">{term.text}</span>
          {#if term.type === 'phrase'}
            <span class="tag" style="cursor:default">phrase</span>
          {/if}
        </div>
        <div class="flex items-center gap-1">
          {#if isDue && !progress}
            <span class="tag" style="background:var(--warning);color:white;cursor:default">Mới</span>
          {:else if isDue}
            <span class="tag" style="background:var(--primary);color:white;cursor:default">Ôn tập</span>
          {/if}
          <span>{getBadge(progress?.level ?? -1)}</span>
          <span style="color:var(--text-secondary)">{expanded.has(term.id) ? '▲' : '▼'}</span>
        </div>
      </div>

      {#if expanded.has(term.id)}
        <div class="senses mt-2" on:click|stopPropagation role="presentation">
          {#if sensesCache.has(term.id)}
            {#each sensesCache.get(term.id) ?? [] as sense}
              <div class="sense register-{sense.register}">
                <div class="sense-register">{sense.register === 'scrum' ? '📋 Scrum' : '📖 General'}</div>
                <div class="sense-en">{sense.en}</div>
                <div class="sense-vi">{sense.vi}</div>
              </div>
            {/each}
          {:else}
            <div class="loading-spinner" style="width:20px;height:20px;border-width:2px"></div>
          {/if}
        </div>

        {#if term.tags.length}
          <div class="tags" on:click|stopPropagation role="presentation">
            {#each term.tags as tag}
              <button class="tag" on:click={() => (activeTag = tag)}>{tag}</button>
            {/each}
          </div>
        {/if}

        <!-- Open full detail popup -->
        <button class="btn btn-ghost btn-sm mt-1" on:click|stopPropagation={() => (selectedTermId = term.id)}>
          📖 Chi tiết & SRS
        </button>
      {/if}
    </div>
  {/each}
{/if}

<!-- Term detail popup (for SRS action) -->
<TermPopup termId={selectedTermId} on:close={() => (selectedTermId = null)} />
