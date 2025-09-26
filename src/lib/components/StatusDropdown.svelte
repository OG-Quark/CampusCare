<script>
	import { isAdmin } from '$lib/auth.js';
	import { supabase } from '$lib/supabase.js';

	let { issue, compact = false } = $props(); // ✅ Using $props() instead of export let

	let currentStatus = $state(issue.status);
	let isUserAdmin = $state(false);
	let isLoading = $state(false);

	// Status colors matching your existing style
	const statusColors = {
		open: 'bg-card-bg text-blue-300',
		in_progress: 'bg-card-bg text-yellow-300',
		resolved: 'bg-card-bg text-green-300'
	};

	const statusOptions = [
		{ value: 'open', label: 'Open' },
		{ value: 'in_progress', label: 'In Progress' },
		{ value: 'resolved', label: 'Resolved' }
	];

	$effect(() => {
		checkAdminStatus();
	});

	async function checkAdminStatus() {
		isUserAdmin = await isAdmin();
	}

	async function handleStatusChange(newStatus) {
		if (!isUserAdmin) return;

		isLoading = true;

		try {
			const { error } = await supabase
				.from('issues')
				.update({
					status: newStatus,
					updated_at: new Date().toISOString()
				})
				.eq('id', issue.id);

			if (error) throw error;

			currentStatus = newStatus;
		} catch (error) {
			console.error('Error updating status:', error.message);
			currentStatus = issue.status; // Revert on error
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isUserAdmin}
	<!-- Admin View - Dropdown -->
	<div class="relative inline-block">
		<select
			value={currentStatus}
			on:change={(e) => handleStatusChange(e.target.value)}
			disabled={isLoading}
			class="appearance-none rounded-full px-2 py-1 text-xs capitalize {statusColors[
				currentStatus
			]} cursor-pointer border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50"
		>
			{#each statusOptions as option}
				<option value={option.value} class={statusColors[option.value]}>
					{option.label}
				</option>
			{/each}
		</select>

		{#if isLoading}
			<div class="absolute top-1/2 right-1 -translate-y-1/2 transform">
				<div class="h-3 w-3 animate-spin rounded-full border-b-2 border-current"></div>
			</div>
		{:else}
			<div class="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 transform"></div>
		{/if}
	</div>
{:else}
	<!-- Regular User View - Static Badge -->
	<span class="rounded-full px-2 py-1 text-xs capitalize {statusColors[issue.status]}">
		{issue.status.replace('_', ' ')}
	</span>
{/if}
