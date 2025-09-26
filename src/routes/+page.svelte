<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import StatusDropdown from '$lib/components/StatusDropdown.svelte';
	import { createClient } from '@supabase/supabase-js';
	import { onMount } from 'svelte';

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
	<title>Campus Issues Feed - CampusCare</title>
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
						'pulse-slower': 'pulse 12s infinite ease-in-out',
						float: 'float 6s ease-in-out infinite'
					},
					keyframes: {
						float: {
							'0%, 100%': { transform: 'translateY(0px)' },
							'50%': { transform: 'translateY(-10px)' }
						}
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

	<div class="container mx-auto px-4 sm:px-5">
		<!-- Header -->
		<header class="flex items-center justify-between py-6">
			<a href="/" class="flex items-center text-xl font-bold sm:text-2xl">
				<span class="mr-3 text-2xl sm:text-3xl">📢</span>
				<span>CampusCare </span>
			</a>

			<div class="flex items-center space-x-2 sm:space-x-4">
				<a
					href="/report"
					class="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition-transform hover:scale-105 sm:px-5 sm:text-base"
					>Report Issue</a
				>
				{#if user}
					<button
						on:click={() => supabase.auth.signOut().then(() => goto('/login'))}
						class="rounded-lg border border-white bg-transparent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-5 sm:text-base"
						>Sign Out</button
					>
				{:else}
					<button
						on:click={() => goto('/login')}
						class="rounded-lg border border-white bg-transparent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:px-5 sm:text-base"
						>Sign In</button
					>
				{/if}
			</div>
		</header>

		<!-- Horizontal Scrolling Feed -->
		<section class="py-6 sm:py-8">
			<div class="mb-6 text-center sm:mb-8">
				<h1 class="mb-3 text-3xl font-bold sm:mb-4 sm:text-4xl">Campus Issues!</h1>
			</div>

			<!-- Filters -->
			<div class="mb-8 rounded-2xl border border-white/10 p-4 backdrop-blur-md sm:mb-10 sm:p-6">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
					<div>
						<label for="category-select" class="mb-2 block text-sm font-medium text-gray-300"
							>Category</label
						>
						<select
							id="category-select"
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

					<div>
						<label for="status-select" class="mb-2 block text-sm font-medium text-gray-300"
							>Status</label
						>
						<select
							id="status-select"
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

					<div>
						<label for="sort-by-select" class="mb-2 block text-sm font-medium text-gray-300"
							>Sort By</label
						>
						<select
							id="sort-by-select"
							bind:value={sortBy}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
						>
							<option value="created_at" class="bg-gray-800">Date</option>
							<option value="upvotes" class="bg-gray-800">Upvotes</option>
							<option value="title" class="bg-gray-800">Title</option>
						</select>
					</div>

					<div>
						<label for="order-select" class="mb-2 block text-sm font-medium text-gray-300"
							>Order</label
						>
						<select
							id="order-select"
							bind:value={sortOrder}
							class="focus:ring-primary w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-transparent focus:ring-2 focus:outline-none"
						>
							<option value="desc" class="bg-gray-800">Newest First</option>
							<option value="asc" class="bg-gray-800">Oldest First</option>
						</select>
					</div>
				</div>
			</div>

			<!-- Horizontal Scroll Container -->
			<div class="relative">
				{#if loading}
					<div class="flex items-center justify-center py-16 sm:py-20">
						<div
							class="border-primary mr-3 h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
						></div>
						<span class="text-gray-300">Loading issues...</span>
					</div>
				{:else if error}
					<div
						class="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-4 text-center text-red-300 sm:px-6"
					>
						<span class="mr-2 text-xl">⚠️</span>
						<span>Error loading issues: {error}</span>
					</div>
				{:else if issues.length === 0}
					<div class="py-16 text-center sm:py-20">
						<div class="mb-4 text-5xl sm:text-6xl">🤔</div>
						<h3 class="mb-2 text-xl font-semibold sm:text-2xl">No Issues Found</h3>
						<p class="mb-6 text-gray-400">
							No issues match your current filters, or none have been reported yet.
						</p>
						<a
							href="/report"
							class="rounded-lg bg-white px-4 py-3 font-medium text-black transition-transform hover:scale-105 sm:px-6"
							>Report the First Issue</a
						>
					</div>
				{:else}
					<!-- Responsive horizontal scroll container -->
					<div class="relative">
						<div
							class="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 py-6 sm:gap-6 sm:px-8"
						>
							{#each issues as issue, index}
								<div
									class="w-72 flex-shrink-0 transform snap-center transition-all duration-500 hover:scale-105 sm:w-80 md:w-96"
								>
									<div
										class="bg-card-bg hover:shadow-primary/30 animate-float flex h-full transform flex-col rounded-2xl border border-white/10 p-4 backdrop-blur-md transition-all duration-300 hover:shadow-2xl sm:p-6"
										style="animation-delay: {index * 0.1}s;"
									>
										<!-- Header -->
										<div class="mb-3 flex items-start justify-between sm:mb-4">
											<div class="flex flex-wrap gap-1 sm:gap-2">
												<span
													class="text-primary rounded-full bg-[rgba(0,122,255,0.2)] px-2 py-1 text-xs sm:px-3"
												>
													{issue.category}
												</span>
												{#if issue.priority}
													<span
														class="rounded-full px-2 py-1 text-xs capitalize sm:px-3 {priorityColors[
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
										<div class="mb-3 flex-1">
											<div class="mb-2 flex items-center gap-2">
												<h3 class="flex-1 text-base font-semibold sm:text-lg">{issue.title}</h3>
												<!-- <span
													class="rounded-full px-2 py-1 text-xs capitalize {statusColors[
														issue.status
													]}"
												>
													{issue.status.replace('_', ' ')}
												</span> -->
												<StatusDropdown {issue} />
											</div>

											<!-- Description -->
											<p class="line-clamp-3 text-sm leading-relaxed text-gray-300">
												{issue.description}
											</p>
										</div>

										<!-- Location -->
										{#if issue.location}
											<div class="mb-3 flex items-center gap-1 text-sm text-gray-400 sm:mb-4">
												<span>📍</span>
												<span>{issue.location}</span>
											</div>
										{/if}

										<!-- Footer -->
										<div class="mt-auto flex items-center justify-between">
											<button
												on:click={() => toggleUpvote(issue.id, issue.upvotes, issue.user_votes)}
												class="upvote-btn flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-300 ease-out sm:px-4 sm:py-2
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

											<div class="flex items-center gap-1 text-xs text-gray-400 sm:text-sm">
												<span>👤</span>
												<span>{issue.username || 'Anonymous'}</span>
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<!-- Scroll indicators -->
						<div class="mt-4 flex justify-center space-x-2">
							{#each issues as _, index}
								<div
									class="h-2 w-2 rounded-full bg-white/20 transition-all duration-300 {index === 0
										? 'bg-primary w-4'
										: ''}"
								></div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</section>
	</div>

	<!-- Footer -->
	<footer class="mt-12 border-t border-white/10 py-8 text-center text-gray-400 sm:mt-16 sm:py-10">
		<div class="container mx-auto max-w-6xl px-4 sm:px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	.snap-x {
		scroll-snap-type: x mandatory;
	}

	.snap-center {
		scroll-snap-align: center;
	}

	/* Custom scrollbar for webkit */
	::-webkit-scrollbar {
		height: 8px;
	}

	::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb {
		background: rgba(0, 122, 255, 0.5);
		border-radius: 4px;
	}

	::-webkit-scrollbar-thumb:hover {
		background: rgba(0, 122, 255, 0.7);
	}

	/* Responsive line clamp for description */
	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
