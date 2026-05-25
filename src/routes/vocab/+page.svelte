<svelte:head><title>Kho từ đã tra · KfR</title></svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { db } from '$lib/db';
  import type { Term, TermSense, LookedUpTerm } from '$lib/types';
  import TermPopup from '$lib/components/TermPopup.svelte';

  type Quality = 'edited' | 'audited' | 'has-scrum' | 'ai-auto' | 'manual' | 'unknown';

  interface VocabItem {
    lookup: LookedUpTerm;
    term: Term;
    senses: TermSense[];
  }

  let items: VocabItem[] = [];
  let loading = true;
  let searchQ = '';
  let sortBy: 'recent' | 'frequent' = 'recent';
  let filterQ: Quality | 'all' = 'all';
  let selectedTermId: string | null = null;

  async function loadItems() {
    loading = true;
    const lookups = await db.lookedUpTerms.orderBy('lastLookedAt').reverse().toArray();
    const termIds = lookups.map((l) => l.termId);
    const termsArr = await db.terms.where('id').anyOf(termIds).toArray();
    const termMap = new Map(termsArr.map((t) => [t.id, t]));

    const sensesArr = await db.termSenses.where('termId').anyOf(termIds).toArray();
    const sensesMap = new Map<string, TermSense[]>();
    for (const s of sensesArr) {
      const list = sensesMap.get(s.termId) ?? [];
      list.push(s);
      sensesMap.set(s.termId, list);
    }

    items = lookups
      .map((lookup) => {
        const term = termMap.get(lookup.termId);
        if (!term) return null;
        return {
          lookup,
          term,
          senses: sensesMap.get(lookup.termId) ?? [],
        };
      })
      .filter((x): x is VocabItem => x !== null);

    loading = false;
  }

  onMount(loadItems);

  function getQuality(term: Term, senses: TermSense[]): Quality {
    if (term.tags.includes('edited-tay')) return 'edited';
    if (term.tags.includes('audited')) return 'audited';
    if (senses.some((s) => s.register === 'scrum')) return 'has-scrum';
    if (term.tags.includes('ai-dịch')) return 'ai-auto';
    if (senses.length > 0) return 'manual';
    return 'unknown';
  }

  function qualityLabel(q: Quality): string {
    switch (q) {
      case 'edited': return '✏️ Đã sửa tay';
      case 'audited': return '🔬 Đã audit';
      case 'has-scrum': return '📋 Có Scrum';
      case 'ai-auto': return '🤖 Tự dịch';
      case 'manual': return '📖 Thủ công';
      case 'unknown': return '❓ Chưa có nghĩa';
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === todayStr) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN');
  }

  $: filtered = items
    .filter((item) => {
      if (searchQ && !item.term.text.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (filterQ !== 'all' && getQuality(item.term, item.senses) !== filterQ) return false;
      return true;
    })
    .sort((a, b) =>
      sortBy === 'recent'
        ? b.lookup.lastLookedAt.localeCompare(a.lookup.lastLookedAt)
        : b.lookup.count - a.lookup.count
    );
</script>

<div>
  <h2 class="vocab-title">📚 Kho từ đã tra</h2>
  <p class="text-secondary">{items.length} từ · {filtered.length} hiển thị</p>

  <div class="vocab-toolbar mt-1">
    <input
      class="vocab-search"
      type="search"
      placeholder="Tìm từ..."
      bind:value={searchQ}
    />
    <div style="display:flex;gap:0.3rem">
      <button
        class="btn btn-sm {sortBy === 'recent' ? 'btn-primary' : 'btn-ghost'}"
        on:click={() => (sortBy = 'recent')}
        type="button"
      >Gần nhất</button>
      <button
        class="btn btn-sm {sortBy === 'frequent' ? 'btn-primary' : 'btn-ghost'}"
        on:click={() => (sortBy = 'frequent')}
        type="button"
      >Nhiều nhất</button>
    </div>
  </div>

  <div class="vocab-filter-chips">
    {#each [
      { value: 'all', label: 'Tất cả' },
      { value: 'ai-auto', label: '🤖 Tự dịch' },
      { value: 'has-scrum', label: '📋 Có Scrum' },
      { value: 'audited', label: '🔬 Đã audit' },
      { value: 'edited', label: '✏️ Đã sửa' },
    ] as chip}
      <button
        class="vocab-filter-chip {filterQ === chip.value ? 'active' : ''}"
        on:click={() => (filterQ = chip.value as Quality | 'all')}
        type="button"
      >{chip.label}</button>
    {/each}
  </div>

  {#if loading}
    <div class="empty-state">
      <div class="loading-spinner"></div>
      <p class="text-secondary">Đang tải...</p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">
      {#if items.length === 0}
        <p>Chưa tra từ nào. Hãy mở quiz và nhấn vào từ trong câu hỏi để tra.</p>
      {:else}
        <p>Không tìm thấy từ phù hợp với bộ lọc.</p>
      {/if}
    </div>
  {:else}
    <div class="vocab-list mt-1">
      {#each filtered as item (item.term.id)}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="vocab-item"
          on:click={() => (selectedTermId = item.term.id)}
          role="button"
          tabindex="0"
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectedTermId = item.term.id; }}
        >
          <div class="vocab-item-main">
            <span class="vocab-term-text">{item.term.text}</span>
            <span class="vocab-quality-badge quality-{getQuality(item.term, item.senses)}">{qualityLabel(getQuality(item.term, item.senses))}</span>
          </div>
          <div class="vocab-item-meta">
            <span class="vocab-count">✕{item.lookup.count}</span>
            <span class="vocab-date text-secondary">{formatDate(item.lookup.lastLookedAt)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<TermPopup
  termId={selectedTermId}
  context="scrum"
  allowEdit={true}
  on:close={() => {
    selectedTermId = null;
    loadItems();
  }}
/>
