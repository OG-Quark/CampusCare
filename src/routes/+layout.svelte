<script>
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import '$lib/admin-console';
	import { createClient } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import '../app.css';

	export const user = writable(null);

	let supabase;

	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

		onMount(async () => {
			// Get initial session
			const {
				data: { session }
			} = await supabase.auth.getSession();
			user.set(session?.user || null);

			// Listen for auth changes
			const {
				data: { subscription }
			} = supabase.auth.onAuthStateChange((_event, session) => {
				user.set(session?.user || null);
			});

			return () => subscription.unsubscribe();
		});
	}

	onMount(() => {
		// Optional: Auto-show help when console opens
		if (typeof window !== 'undefined') {
			// Add a welcome message
			console.log(`
🎓 Campus Ticket System Admin Commands:
Type 'showAdminHelp()' for promotion instructions
      `);
		}
	});
</script>

<svelte:head>
	<style>
		html {
			font-family:
				'SF Pro Display',
				'Inter',
				system-ui,
				-apple-system,
				BlinkMacSystemFont,
				'Segoe UI',
				'Roboto',
				sans-serif;
		}

		body {
			margin: 0;
			padding: 0;
			background-color: #000;
			color: white;
		}

		.line-clamp-3 {
			display: -webkit-box;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	</style>
</svelte:head>

<main>
	<slot />
</main>
