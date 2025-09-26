<script>
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { writable } from 'svelte/store';

	// Create a global user store
	export const user = writable(null);

	let supabase;

	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

		// Set up auth state change listener
		onMount(() => {
			supabase.auth.getSession().then(({ data: { session } }) => {
				user.set(session?.user || null);
			});

			const {
				data: { subscription },
			} = supabase.auth.onAuthStateChange((_event, session) => {
				user.set(session?.user || null);
			});

			return () => subscription.unsubscribe();
		});
	}
</script>

<main>
	<slot />
</main>

<style>
	:global(html) {
		font-family: 'SF Pro Display', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #000;
		color: white;
	}

	:global(.line-clamp-3) {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
