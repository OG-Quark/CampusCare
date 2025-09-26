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

	// Add a reactive variable to track pressed buttons
	let pressedButtons = new Set();

	const categories = [
		'All',
		'Facilities',
		'Safety',
		'Academic',
		'Technology',
		'Food Services',
		'Transportation',
		'Housing',
		'Other'
	];
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

		const {
			data: { user: currentUser }
		} = await supabase.auth.getUser();
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

		// Add press animation
		pressedButtons.add(issueId);

		try {
			const hasVoted = userVotes && userVotes.includes(user.id);
			const newUpvotes = hasVoted ? currentUpvotes - 1 : currentUpvotes + 1;

			let newUserVotes = userVotes || [];
			if (hasVoted) {
				newUserVotes = newUserVotes.filter((id) => id !== user.id);
			} else {
				newUserVotes = [...newUserVotes, user.id];
			}

			// Update the local state immediately for instant feedback
			issues = issues.map((issue) => {
				if (issue.id === issueId) {
					return {
						...issue,
						upvotes: newUpvotes,
						user_votes: newUserVotes
					};
				}
				return issue;
			});

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
			// Revert the local state if there was an error
			await fetchIssues();
		} finally {
			// Remove the pressed state after animation completes
			setTimeout(() => {
				pressedButtons.delete(issueId);
			}, 300);
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
		if (diffInDays < 30)
			return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
		return `${Math.floor(diffInDays / 30)} month${Math.floor(diffInDays / 30) > 1 ? 's' : ''} ago`;
	}

	// Reactive statement to refetch when filters change
	$: if (
		browser &&
		(selectedCategory !== undefined ||
			selectedStatus !== undefined ||
			sortBy !== undefined ||
			sortOrder !== undefined)
	) {
		fetchIssues();
	}
</script>

<svelte:head>
	<title>Campus Issues - CampusCare</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
	<script>
		tailwind.config = {
			theme: {
				extend: {
					colors: {
						primary: '#007AFF',
						'primary-gradient-from': '#007AFF',
						'primary-gradient-to': '#00C2FF',
						'dark-bg': '#000',
						'card-bg': 'rgba(30, 30, 30, 0.7)'
					},
					fontFamily: {
						apple: [
							'SF Pro Display',
							'Inter',
							'system-ui',
							'-apple-system',
							'BlinkMacSystemFont',
							'Segoe UI',
							'Roboto',
							'sans-serif'
						]
					},
					animation: {
						'pulse-slow': 'pulse 8s infinite ease-in-out',
						'pulse-medium': 'pulse 10s infinite ease-in-out',
						'pulse-slower': 'pulse 12s infinite ease-in-out'
					}
				}
			}
		};
	</script>
</svelte:head>

<div class="bg-dark-bg font-apple min-h-screen overflow-x-hidden text-white">
	<!-- Radiating circular glow background -->
	<div class="fixed top-0 left-0 -z-10 h-full w-full overflow-hidden">
		<div
			class="animate-pulse-slow absolute top-1/5 left-1/10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)]"
		></div>
		<div
			class="animate-pulse-slower absolute top-7/10 left-85/100 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)]"
		></div>
		<div
			class="animate-pulse-medium absolute top-2/5 left-3/4 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)]"
		></div>
		<div
			class="animate-pulse-slow absolute top-4/5 left-1/5 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(0,102,255,0.2)_0%,_rgba(0,0,0,0)_70%)]"
		></div>
	</div>

	<div class="container mx-auto max-w-6xl px-5">
		<!-- Header -->
		<header class="flex items-center justify-between py-8">
			<a href="/" class="flex items-center text-2xl font-bold">
				<span class="mr-3 text-3xl">📢</span>
				<span>CampusCare</span>
			</a>

			<div class="flex space-x-4">
				<a href="/report" class="rounded-lg bg-white px-5 py-2.5 font-medium text-black"
					>Report Issue</a
				>
				{#if user}
					<button
						on:click={() => supabase.auth.signOut().then(() => goto('/login'))}
						class="rounded-lg border border-white bg-transparent px-5 py-2.5 font-medium text-white"
						>Sign Out</button
					>
				{:else}
					<a
						href="/login"
						class="rounded-lg border border-white bg-transparent px-5 py-2.5 font-medium text-white"
						>Log In</a
					>
				{/if}
			</div>
		</header>

		<!-- Title and Stats -->
		<section class="py-12 text-center">
			<h1 class="mb-4 text-4xl font-bold">Campus Issues</h1>
			<p class="mb-8 text-xl text-gray-300">
				Stay informed and help prioritize campus improvements
			</p>

			{#if !loading}
				<div class="flex justify-center space-x-8 text-sm">
					<div class="text-center">
						<div class="text-primary text-2xl font-bold">{issues.length}</div>
						<div class="text-gray-400">Total Issues</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-yellow-400">
							{issues.filter((i) => i.status === 'open').length}
						</div>
						<div class="text-gray-400">Open</div>
					</div>
					<div class="text-center">
						<div class="text-2xl font-bold text-green-400">
							{issues.filter((i) => i.status === 'resolved').length}
						</div>
						<div class="text-gray-400">Resolved</div>
					</div>
				</div>
			{/if}
		</section>

		<!-- Filters and Sort -->
		<section class="mb-8">
			<div class="bg-card-bg rounded-2xl border border-white/10 p-6 backdrop-blur-md">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<!-- Category Filter -->
					<div>
						<label for="category-filter" class="mb-2 block text-sm font-medium text-gray-300"
							>Category</label
						>
						<select
							id="category-filter"
							bind:value={selectedCategory}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
						>
							{#each categories as category}
								<option value={category === 'All' ? '' : category} class="bg-gray-800"
									>{category}</option
								>
							{/each}
						</select>
					</div>

					<!-- Status Filter -->
					<div>
						<label for="status-filter" class="mb-2 block text-sm font-medium text-gray-300"
							>Status</label
						>
						<select
							id="status-filter"
							bind:value={selectedStatus}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
						>
							{#each statuses as status}
								<option value={status === 'All' ? '' : status} class="bg-gray-800 capitalize"
									>{status === 'All' ? 'All' : status.replace('_', ' ')}</option
								>
							{/each}
						</select>
					</div>

					<!-- Sort By -->
					<div>
						<label for="sort-by" class="mb-2 block text-sm font-medium text-gray-300">Sort By</label
						>
						<select
							id="sort-by"
							bind:value={sortBy}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
						>
							<option value="created_at" class="bg-gray-800">Date</option>
							<option value="upvotes" class="bg-gray-800">Upvotes</option>
							<option value="title" class="bg-gray-800">Title</option>
						</select>
					</div>

					<!-- Sort Order -->
					<div>
						<label for="sort-order" class="mb-2 block text-sm font-medium text-gray-300"
							>Order</label
						>
						<select
							id="sort-order"
							bind:value={sortOrder}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
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
				<div class="flex items-center justify-center py-20">
					<div
						class="border-primary mr-3 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
					></div>
					<span class="text-gray-300">Loading issues...</span>
				</div>
			{:else if error}
				<div
					class="rounded-lg border border-red-500/50 bg-red-500/20 px-6 py-4 text-center text-red-300"
				>
					<span class="mr-2 text-xl">⚠️</span>
					<span>Error loading issues: {error}</span>
				</div>
			{:else if issues.length === 0}
				<div class="py-20 text-center">
					<div class="mb-4 text-6xl">🤔</div>
					<h3 class="mb-2 text-2xl font-semibold">No Issues Found</h3>
					<p class="mb-6 text-gray-400">
						No issues match your current filters, or none have been reported yet.
					</p>
					<a href="/report" class="rounded-lg bg-white px-6 py-3 font-medium text-black"
						>Report the First Issue</a
					>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each issues as issue}
						<div
							class="bg-card-bg hover:shadow-primary/20 rounded-2xl border border-white/10 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-xl"
						>
							<!-- Header -->
							<div class="mb-4 flex items-start justify-between">
								<div class="flex flex-wrap gap-2">
									<span
										class="text-primary rounded-full bg-[rgba(0,122,255,0.2)] px-3 py-1 text-xs"
									>
										{issue.category}
									</span>
									{#if issue.priority}
										<span
											class="rounded-full px-3 py-1 text-xs capitalize {priorityColors[
												issue.priority
											]}"
										>
											{issue.priority}
										</span>
									{/if}
								</div>
								<span class="text-xs text-gray-400">{formatDate(issue.created_at)}</span>
							</div>

							<!-- Title and Status -->
							<div class="mb-3">
								<div class="mb-2 flex items-center gap-2">
									<h3 class="flex-1 text-lg font-semibold">{issue.title}</h3>
									<span
										class="rounded-full px-2 py-1 text-xs capitalize {statusColors[issue.status]}"
									>
										{issue.status.replace('_', ' ')}
									</span>
								</div>
							</div>

							<!-- Description -->
							<p class="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-300">
								{issue.description}
							</p>

							<!-- Location -->
							{#if issue.location}
								<div class="mb-4 flex items-center gap-1 text-sm text-gray-400">
									<span>📍</span>
									<span>{issue.location}</span>
								</div>
							{/if}

							<!-- Footer -->
							<div class="flex items-center justify-between">
								<button
									on:click={() => toggleUpvote(issue.id, issue.upvotes, issue.user_votes)}
									class="upvote-btn flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300 ease-out
    {issue.user_votes && user && issue.user_votes.includes(user.id)
										? 'border border-green-400/50 bg-green-500/30 text-green-300'
										: 'border border-red-400/50 bg-red-500/30 text-red-300'}
    {pressedButtons.has(issue.id) ? 'scale-95' : ''}"
								>
									<span
										>{issue.user_votes && user && issue.user_votes.includes(user.id)
											? '▲'
											: '▼'}</span
									>
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
	<footer class="mt-16 border-t border-white/10 py-10 text-center text-gray-400">
		<div class="container mx-auto max-w-6xl px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>
</div>
