<script>
	import { goto } from '$app/navigation';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	let supabase;
	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	let isLogin = true;
	let username = '';
	let email = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleAuth() {
		if (!supabase) return;

		loading = true;
		error = '';

		try {
			if (isLogin) {
				const { data, error: authError } = await supabase.auth.signInWithPassword({
					email,
					password
				});

				if (authError) throw authError;
				goto('/');
			} else {
				const { data, error: authError } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: username
						}
					}
				});

				if (authError) throw authError;

				if (data.user && !data.session) {
					error = 'Please check your email to verify your account before signing in.';
				} else {
					goto('/');
				}
			}
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		isLogin = !isLogin;
		error = '';
		username = '';
		email = '';
		password = '';
	}
</script>

<svelte:head>
	<title>{isLogin ? 'Login' : 'Sign Up'} - CampusCare</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
	<script>
		tailwind.config = {
			theme: {
				extend: {
					colors: {
						'primary': '#007AFF',
						'primary-gradient-from': '#007AFF',
						'primary-gradient-to': '#00C2FF',
						'dark-bg': '#000',
						'card-bg': 'rgba(30, 30, 30, 0.7)',
					},
					fontFamily: {
						'apple': ['SF Pro Display', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
					},
					animation: {
						'pulse-slow': 'pulse 8s infinite ease-in-out',
						'pulse-medium': 'pulse 10s infinite ease-in-out',
						'pulse-slower': 'pulse 12s infinite ease-in-out',
					},
				}
			}
		}
	</script>
</svelte:head>

<div class="bg-dark-bg text-white font-apple min-h-screen overflow-x-hidden">
	<!-- Radiating circular glow background -->
	<div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden">
		<div class="absolute rounded-full w-[300px] h-[300px] top-1/5 left-1/10 bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
		<div class="absolute rounded-full w-[500px] h-[500px] top-7/10 left-85/100 bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)] -translate-x-1/2 -translate-y-1/2 animate-pulse-slower"></div>
		<div class="absolute rounded-full w-[400px] h-[400px] top-2/5 left-3/4 bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)] -translate-x-1/2 -translate-y-1/2 animate-pulse-medium"></div>
		<div class="absolute rounded-full w-[250px] h-[250px] top-4/5 left-1/5 bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)] -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
	</div>

	<div class="container max-w-6xl mx-auto px-5">
		<!-- Header -->
		<header class="flex justify-between items-center py-8">
			<a href="/" class="text-2xl font-bold flex items-center">
				<span class="text-3xl mr-3">📢</span>
				<span>CampusCare</span>
			</a>
		</header>

		<!-- Login Form -->
		<section class="flex flex-col items-center justify-center py-20 min-h-[60vh]">
			<div class="bg-card-bg rounded-2xl p-8 backdrop-blur-md border border-white/10 w-full max-w-md">
				<h1 class="text-3xl font-bold text-center mb-8">{isLogin ? 'Welcome Back' : 'Join CampusCare'}</h1>

				{#if error}
					<div class="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
						{error}
					</div>
				{/if}

				<form on:submit|preventDefault={handleAuth} class="space-y-6">
					{#if !isLogin}
						<div>
							<label for="username" class="block text-sm font-medium text-gray-300 mb-2">Username</label>
							<input
								type="text"
								id="username"
								bind:value={username}
								required={!isLogin}
								class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="Enter your username"
							/>
						</div>
					{/if}

					<div>
						<label for="email" class="block text-sm font-medium text-gray-300 mb-2">Email</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							placeholder="Enter your email"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-300 mb-2">Password</label>
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							placeholder="Enter your password"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="w-full bg-white text-black py-3.5 rounded-lg font-medium transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if loading}
							<div class="flex items-center justify-center">
								<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
								{isLogin ? 'Signing In...' : 'Creating Account...'}
							</div>
						{:else}
							{isLogin ? 'Sign In' : 'Create Account'}
						{/if}
					</button>
				</form>

				<div class="mt-6 text-center">
					<button
						type="button"
						on:click={toggleMode}
						class="text-primary hover:underline"
					>
						{isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
					</button>
				</div>
			</div>
		</section>
	</div>

	<!-- Footer -->
	<footer class="text-center py-10 border-t border-white/10 mt-10 text-gray-400">
		<div class="container max-w-6xl mx-auto px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>
</div>
