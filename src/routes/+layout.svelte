<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import '../app.css';
  import { supabase } from '$lib/supabase';
  import { authUser, authLoading } from '$lib/stores/auth';
  import { loadMastery, stats } from '$lib/stores/mastery';
  import { syncContent } from '$lib/content';
  import { syncProgressDown } from '$lib/sync';
  import { BADGES } from '$lib/srs';

  async function initSession() {
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
      if (sess?.user) {
        authUser.set({
          id: sess.user.id,
          email: sess.user.email!,
          name: sess.user.user_metadata?.full_name,
          avatarUrl: sess.user.user_metadata?.avatar_url,
        });
        await onUserReady(sess.user.id);
      } else {
        authUser.set(null);
      }
    });
  }

  async function onUserReady(userId: string) {
    await Promise.all([syncContent(), syncProgressDown(userId), loadMastery()]);
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
  }

  onMount(initSession);

  $: currentPath = $page.url.pathname;

  const navLinks = [
    { href: `${base}/learn`, label: 'Học từ vựng' },
    { href: `${base}/quiz`, label: 'Kiểm tra' },
    { href: `${base}/glossary`, label: 'Tra cứu' },
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
        <span style="color:rgba(255,255,255,0.9);font-size:0.8rem">{$authUser.name ?? $authUser.email}</span>
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
