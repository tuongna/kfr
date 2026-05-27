<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  onMount(() => goto(`${base}/quiz`));
</script>

<div class="auth-wall">
  <div class="loading-spinner"></div>
</div>
