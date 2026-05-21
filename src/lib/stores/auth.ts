import { writable } from 'svelte/store';
import type { AuthUser } from '$lib/types';

export const authUser = writable<AuthUser | null>(null);
export const authLoading = writable<boolean>(true);
