<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	let supabase;
	let user = null;

	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	let issues = [];
	let loading = true;
	let error = '';
	let selectedCategory = '';
	let selectedStatus = '';
	let sortBy = 'created_at';
	let sortOrder = 'desc';

	const categories = ['All', 'Facilities', 'Safety', 'Academic', 'Technology', 'Food Services', 'Transportation', 'Housing', 'Other'];
	const statuses = ['All', 'open', 'in_progress', 'resolved'];

	const statusColors = {
		open: 'bg-blue-500/20 text-blue-300',
		in_progress: 'bg-yellow-500/20 text-yellow-300',
		resolved: 'bg-green-500/20 text-green-300'
	};

	const priorityColors = {
		low: 'bg-green-500/20 text-green-300',
		medium: 'bg-yellow-500/20 text-yellow-300',
		high: 'bg-red-500/20 text-red-300'
	};

	onMount(async () => {
		if (!supabase) return;

		const { data: { user: currentUser } } = await supabase.auth.getUser();
		user = currentUser;

		await fetchIssues();

		// Set up real-time subscription
		const subscription = supabase
			.channel('issues')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => {
				fetchIssues();
			})
			.subscribe();

		return () => {
			subscription.unsubscribe();
		};
	});

	async function fetchIssues() {
		if (!supabase) return;

		loading = true;
		error = '';

		try {
			let query = supabase.from('issues').select('*');

			// Apply filters
			if (selectedCategory && selectedCategory !== 'All') {
				query = query.eq('category', selectedCategory);
			}
			if (selectedStatus && selectedStatus !== 'All') {
				query = query.eq('status', selectedStatus);
			}

			// Apply sorting
			query = query.order(sortBy, { ascending: sortOrder === 'asc' });

			const { data, error: fetchError } = await query;

			if (fetchError) throw fetchError;

			issues = data || [];
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function toggleUpvote(issueId, currentUpvotes, userVotes) {
		if (!supabase || !user) {
			goto('/login');
			return;
		}

		try {
			const hasVoted = userVotes && userVotes.includes(user.id);
			const newUpvotes = hasVoted ? currentUpvotes - 1 : currentUpvotes + 1;

			let newUserVotes = userVotes || [];
			if (hasVoted) {
				newUserVotes = newUserVotes.filter(id => id !== user.id);
			} else {
				newUserVotes = [...newUserVotes, user.id];
			}

			const { error: updateError } = await supabase
				.from('issues')
				.update({
					upvotes: newUpvotes,
					user_votes: newUserVotes
				})
				.eq('id', issueId);

			if (updateError) throw updateError;

		} catch (err) {
			console.error('Error updating upvote:', err);
		}
	}

	function formatDate(dateString) {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now - date;
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInDays === 0) return 'Today';
		if (diffInDays === 1) return '1 day ago';
		if (diffInDays < 7) return `${diffInDays} days ago`;
		if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
		return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
	}

	// Reactive statement to refetch when filters change
	$: if (browser && (selectedCategory !== undefined || selectedStatus !== undefined || sortBy !== undefined || sortOrder !== undefined)) {
		fetchIssues();
	}
</script>

<svelte:head>
	<title>Campus Issues - CampusCare</title>
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
				<a href="/report" class="bg-white text-black px-5 py-2.5 rounded-lg font-medium">Report Issue</a>
				{#if user}
					<button on:click={() => supabase.auth.signOut().then(() => goto('/login'))} class="bg-transparent text-white border border-white px-5 py-2.5 rounded-lg font-medium">Sign Out</button>
				{:else}
					<a href="/login" class="bg-transparent text-white border border-white px-5 py-2.5 rounded-lg font-medium">Log In</a>
				{/if}
			</div>
		</header>

		<!-- Title and Stats -->
		<section class="text-center py-12">
			<h1 class="text-4xl font-bold mb-4">Campus Issues</h1>
			<p class="text-xl text-gray-300 mb-8">Stay informed and help prioritize campus improvements</p>

			{#if !loading}
				<div class="flex justify-center space-x-8 text-sm">
					<div class="text-center">
						<div class="text-2xl font-bold text-primary">{issues.length}</div>
						<div class="text-gray-400">Total Issues</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-yellow-400">{issues.filter(i => i.status === 'open').length}</div>
						<div class="text-gray-400">Open</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-400">{issues.filter(i => i.status === 'resolved').length}</div>
						<div class="text-gray-400">Resolved</div>
					</div>
				</div>
			{/if}
		</section>

		<!-- Filters and Sort -->
		<section class="mb-8">
			<div class="bg-card-bg rounded-2xl p-6 backdrop-blur-md border border-white/10">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Category Filter -->
					<div>
						<label for="category-filter" class="block text-sm font-medium text-gray-300 mb-2">Category</label>
						<select
							id="category-filter"
							bind:value={selectedCategory}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							{#each categories as category}
								<option value={category === 'All' ? '' : category} class="bg-gray-800">{category}</option>
							{/each}
						</select>
					</div>

					<!-- Status Filter -->
					<div>
						<label for="status-filter" class="block text-sm font-medium text-gray-300 mb-2">Status</label>
						<select
							id="status-filter"
							bind:value={selectedStatus}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							{#each statuses as status}
								<option value={status === 'All' ? '' : status} class="bg-gray-800 capitalize">{status === 'All' ? 'All' : status.replace('_', ' ')}</option>
							{/each}
						</select>
					</div>

					<!-- Sort By -->
					<div>
						<label for="sort-by" class="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
						<select
							id="sort-by"
							bind:value={sortBy}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							<option value="created_at" class="bg-gray-800">Date</option>
							<option value="upvotes" class="bg-gray-800">Upvotes</option>
							<option value="title" class="bg-gray-800">Title</option>
						</select>
					</div>

					<!-- Sort Order -->
					<div>
						<label for="sort-order" class="block text-sm font-medium text-gray-300 mb-2">Order</label>
						<select
							id="sort-order"
							bind:value={sortOrder}
							class="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						>
							<option value="desc" class="bg-gray-800">Newest First</option>
							<option value="asc" class="bg-gray-800">Oldest First</option>
						</select>
					</div>
				</div>
			</div>
		</section>

		<!-- Issues List -->
		<section class="mb-16">
			{#if loading}
				<div class="flex justify-center items-center py-20">
					<div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
					<span class="text-gray-300">Loading issues...</span>
				</div>
			{:else if error}
				<div class="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg text-center">
					<span class="text-xl mr-2">⚠️</span>
					<span>Error loading issues: {error}</span>
				</div>
			{:else if issues.length === 0}
				<div class="text-center py-20">
					<div class="text-6xl mb-4">🤔</div>
					<h3 class="text-2xl font-semibold mb-2">No Issues Found</h3>
					<p class="text-gray-400 mb-6">No issues match your current filters, or none have been reported yet.</p>
					<a href="/report" class="bg-white text-black px-6 py-3 rounded-lg font-medium">Report the First Issue</a>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each issues as issue}
						<div class="bg-card-bg rounded-2xl p-6 backdrop-blur-md border border-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
							<!-- Header -->
							<div class="flex justify-between items-start mb-4">
								<div class="flex flex-wrap gap-2">
									<span class="text-xs px-3 py-1 rounded-full bg-[rgba(0,122,255,0.2)] text-primary">
										{issue.category}
									</span>
									{#if issue.priority}
										<span class="text-xs px-3 py-1 rounded-full capitalize {priorityColors[issue.priority]}">
											{issue.priority}
										</span>
									{/if}
								</div>
								<span class="text-xs text-gray-400">{formatDate(issue.created_at)}</span>
							</div>

							<!-- Title and Status -->
							<div class="mb-3">
								<div class="flex items-center gap-2 mb-2">
									<h3 class="text-lg font-semibold flex-1">{issue.title}</h3>
									<span class="text-xs px-2 py-1 rounded-full capitalize {statusColors[issue.status]}">
										{issue.status.replace('_', ' ')}
									</span>
								</div>
							</div>

							<!-- Description -->
							<p class="text-gray-300 mb-4 text-sm leading-relaxed line-clamp-3">
								{issue.description}
							</p>

							<!-- Location -->
							{#if issue.location}
								<div class="flex items-center gap-1 mb-4 text-sm text-gray-400">
									<span>📍</span>
									<span>{issue.location}</span>
								</div>
							{/if}

							<!-- Footer -->
							<div class="flex justify-between items-center">
								<button
									on:click={() => toggleUpvote(issue.id, issue.upvotes, issue.user_votes)}
									class="upvote-btn flex items-center gap-2 px-4 py-2 rounded-full transition-colors {issue.user_votes && user && issue.user_votes.includes(user.id) ? 'bg-[rgba(0,122,255,0.3)] text-primary' : 'bg-white/10 text-white hover:bg-[rgba(0,122,255,0.2)]'}"
								>
									<span>▲</span>
									<span class="font-semibold">{issue.upvotes || 0}</span>
								</button>

								<div class="flex items-center gap-4 text-sm text-gray-400">
									<div class="flex items-center gap-1">
										<span>👤</span>
										<span>{issue.username || 'Anonymous'}</span>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>

	<!-- Footer -->
	<footer class="text-center py-10 border-t border-white/10 mt-16 text-gray-400">
		<div class="container max-w-6xl mx-auto px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>
</div>
