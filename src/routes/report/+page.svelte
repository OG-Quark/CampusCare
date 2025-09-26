<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	let supabase;
	let user = null;

	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	let title = '';
	let description = '';
	let category = '';
	let location = '';
	let priority = 'medium';
	let loading = false;
	let success = false;
	let error = '';

	const categories = [
		'Facilities',
		'Safety',
		'Academic',
		'Technology',
		'Food Services',
		'Transportation',
		'Housing',
		'Other'
	];

	const priorities = [
		{ value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-300' },
		{ value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-300' },
		{ value: 'high', label: 'High', color: 'bg-red-500/20 text-red-300' }
	];

	onMount(async () => {
		if (!supabase) return;

		const { data: { user: currentUser } } = await supabase.auth.getUser();
		user = currentUser;

		if (!user) {
			goto('/login');
		}
	});

	async function submitReport() {
		if (!supabase || !user) return;

		loading = true;
		error = '';
		success = false;

		try {
			const { data, error: submitError } = await supabase
				.from('issues')
				.insert([
					{
						title: title.trim(),
						description: description.trim(),
						category,
						location: location.trim(),
						priority,
						user_id: user.id,
						user_email: user.email,
						username: user.user_metadata?.username || user.email.split('@')[0],
						upvotes: 0,
						status: 'open'
					}
				]);

			if (submitError) throw submitError;

			success = true;
			// Reset form
			title = '';
			description = '';
			category = '';
			location = '';
			priority = 'medium';

			setTimeout(() => {
				goto('/issues');
			}, 2000);

		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Report Issue - CampusCare</title>
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

			<div class="flex space-x-4">
				<a href="/issues" class="bg-transparent text-white border border-white px-5 py-2.5 rounded-lg font-medium">View Issues</a>
				{#if user}
					<button on:click={() => supabase.auth.signOut().then(() => goto('/login'))} class="bg-white text-black px-5 py-2.5 rounded-lg font-medium">Sign Out</button>
				{:else}
					<a href="/login" class="bg-white text-black border border-black px-5 py-2.5 rounded-lg font-medium">Log In</a>
				{/if}
			</div>
		</header>

		<!-- Report Form -->
		<section class="py-12 max-w-3xl mx-auto">
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold mb-4">Report a Campus Issue</h1>
				<p class="text-xl text-gray-300 leading-relaxed">Help improve our campus by reporting issues that need attention. Your voice matters in making our community better.</p>
			</div>

			{#if success}
				<div class="bg-green-500/20 border border-green-500/50 text-green-300 px-6 py-4 rounded-lg mb-8 text-center">
					<div class="flex items-center justify-center mb-2">
						<span class="text-2xl mr-2">✅</span>
						<span class="font-semibold">Issue Reported Successfully!</span>
					</div>
					<p>Your issue has been submitted and will be reviewed by the campus administration. Redirecting to issues page...</p>
				</div>
			{/if}

			{#if error}
				<div class="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg mb-8">
					<div class="flex items-center">
						<span class="text-xl mr-2">⚠️</span>
						<span>{error}</span>
					</div>
				</div>
			{/if}

			<div class="bg-card-bg rounded-2xl p-8 backdrop-blur-md border border-white/10">
				<form on:submit|preventDefault={submitReport} class="space-y-6">
					<!-- Title -->
					<div>
						<label for="title" class="block text-sm font-medium text-gray-300 mb-2">Issue Title *</label>
						<input
							type="text"
							id="title"
							bind:value={title}
							required
							maxlength="100"
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							placeholder="Briefly describe the issue (e.g., 'Broken AC in Library')"
						/>
						<p class="text-xs text-gray-400 mt-1">{title.length}/100 characters</p>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-gray-300 mb-2">Detailed Description *</label>
						<textarea
							id="description"
							bind:value={description}
							required
							rows="4"
							maxlength="500"
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
							placeholder="Provide more details about the issue, including when you noticed it and how it affects you..."
						></textarea>
						<p class="text-xs text-gray-400 mt-1">{description.length}/500 characters</p>
					</div>

					<!-- Category and Location -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label for="category" class="block text-sm font-medium text-gray-300 mb-2">Category *</label>
							<select
								id="category"
								bind:value={category}
								required
								class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
							>
								<option value="">Select a category</option>
								{#each categories as cat}
									<option value={cat} class="bg-gray-800">{cat}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="location" class="block text-sm font-medium text-gray-300 mb-2">Location</label>
							<input
								type="text"
								id="location"
								bind:value={location}
								maxlength="100"
								class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
								placeholder="e.g., Library 2nd Floor, Building A"
							/>
						</div>
					</div>

					<!-- Priority -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-300 mb-3">Priority Level</legend>
						<div class="flex flex-wrap gap-3">
							{#each priorities as p, i}
								<label class="flex items-center cursor-pointer" for={`priority-${i}`}>
									<input
										type="radio"
										name="priority"
										id={`priority-${i}`}
										value={p.value}
										bind:group={priority}
										class="sr-only"
									/>
									<div class="px-4 py-2 rounded-full text-sm font-medium transition-all {priority === p.value ? p.color + ' ring-2 ring-white/30' : 'bg-white/10 text-gray-300 hover:bg-white/20'}">
										{p.label}
									</div>
								</label>
							{/each}
						</div>
					</fieldset>

					<!-- Submit Button -->
					<div class="pt-4">
						<button
							type="submit"
							disabled={loading || !title || !description || !category}
							class="w-full bg-white text-black py-4 rounded-lg font-medium text-lg transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if loading}
								<div class="flex items-center justify-center">
									<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
									Submitting Report...
								</div>
							{:else}
								Submit Issue Report
							{/if}
						</button>
					</div>
				</form>
			</div>
		</section>
	</div>

	<!-- Footer -->
	<footer class="text-center py-10 border-t border-white/10 mt-16 text-gray-400">
		<div class="container max-w-6xl mx-auto px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>
</div>
