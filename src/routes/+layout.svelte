<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import '../app.css';
  import { supabase } from '$lib/supabase';
  import { authUser, authLoading } from '$lib/stores/auth';
  import { loadMastery, clearMastery, stats } from '$lib/stores/mastery';
  import { syncContent } from '$lib/content';
  import { syncProgressDown, syncProgressUp, claimLegacyProgress } from '$lib/sync';
  import { BADGES } from '$lib/srs';

  async function initSession() {
    // Use getSession() for the initial page-load check, then listen for
    // explicit sign-in / sign-out events.  We deliberately ignore:
    //   • INITIAL_SESSION — Supabase fires this right after onAuthStateChange
    //     is registered with the same session getSession() already returned,
    //     which would trigger a second onUserReady() call on every page load.
    //   • TOKEN_REFRESHED — the access token is silently refreshed every hour;
    //     there is no need to re-sync progress or content on each refresh.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      authUser.set({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.full_name,
        avatarUrl: session.user.user_metadata?.avatar_url,
      });
      await onUserReady(session.user.id);
    }

    authLoading.set(false);

    supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === 'SIGNED_IN') {
        // A fresh OAuth login — run the full sync sequence.
        if (sess?.user) {
          authUser.set({
            id: sess.user.id,
            email: sess.user.email!,
            name: sess.user.user_metadata?.full_name,
            avatarUrl: sess.user.user_metadata?.avatar_url,
          });
          await onUserReady(sess.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        authUser.set(null);
        clearMastery();
      }
      // INITIAL_SESSION and TOKEN_REFRESHED are intentionally ignored here.
    });
  }

  async function onUserReady(userId: string) {
    // Order matters:
    //  1. claim any pre-v2 rows under this user so they survive
    //  2. push anything saved locally but not yet uploaded
    //  3. pull the merged server state down
    //  4. populate the in-memory map (scoped by userId)
    await claimLegacyProgress(userId);
    await syncProgressUp(userId);
    await Promise.all([syncContent(false, userId), syncProgressDown(userId)]);
    await loadMastery(userId);
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    authUser.set(null);
    clearMastery();
  }

  onMount(initSession);

  $: currentPath = $page.url.pathname;

  const navLinks = [
    { href: `${base}/vocab`, label: '📚 Từ đã tra' },
    { href: `${base}/quiz`, label: 'Kiểm tra' },
  ];
</script>

<div class="app-container">
  <!-- Nav -->
  <nav class="navbar">
    <a href="{base}/" class="navbar-brand">KfR 📚</a>
    <div class="navbar-links">
      {#each navLinks as link}
        <a href={link.href} class:active={currentPath === link.href || currentPath.startsWith(link.href + '/')}>{link.label}</a>
      {/each}
    </div>
    <div class="navbar-user">
      {#if $authLoading}
        <div class="loading-spinner" style="width:20px;height:20px;border-width:2px"></div>
      {:else if $authUser}
        {#if $authUser.avatarUrl}
          <img class="navbar-avatar" src={$authUser.avatarUrl} alt="" referrerpolicy="no-referrer" />
        {:else}
          <span class="navbar-avatar navbar-avatar-fallback" aria-hidden="true">
            {($authUser.name ?? $authUser.email).trim().charAt(0).toUpperCase()}
          </span>
        {/if}
        <button class="btn btn-ghost btn-sm" style="color:white;border-color:rgba(255,255,255,0.4)" on:click={signOut}>Đăng xuất</button>
      {:else}
        <button class="btn btn-ghost btn-sm" style="color:white;border-color:rgba(255,255,255,0.4)" on:click={signIn}>Đăng nhập</button>
      {/if}
    </div>
  </nav>

  <!-- Stats bar -->
  {#if $authUser && !$authLoading}
    <div class="stats-bar">
      <span class="xp">{$stats.totalXP} XP</span>
      {#each BADGES as badge, i}
        <span>{$stats.levelCounts[i]}{badge}</span>
      {/each}
    </div>
  {/if}

  <!-- Page content -->
  <main class="page-content">
    {#if $authLoading}
      <div class="auth-wall">
        <div class="loading-spinner"></div>
        <p class="text-secondary">Đang tải...</p>
      </div>
    {:else if !$authUser}
      <div class="auth-wall">
        <h2>KfR — Scrum Learning</h2>
        <p class="text-secondary">Học tiếng Anh chuyên ngành Scrum · Luyện thi PSM I &amp; PSPO I</p>
        <button class="btn btn-primary" on:click={signIn}>🔑 Đăng nhập với Google</button>
        <p class="text-secondary" style="font-size:0.8rem">Chỉ tài khoản được uỷ quyền mới truy cập được nội dung.</p>
      </div>
    {:else}
      <slot />
    {/if}
  </main>
</div>
