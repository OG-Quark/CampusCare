<script>
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	let supabase;
	let user = null;

	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	onMount(async () => {
		if (!supabase) return;

		// Get current user
		const { data: { user: currentUser } } = await supabase.auth.getUser();
		user = currentUser;

		// Listen for auth changes
		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			user = session?.user || null;
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>CampusCare - Student Issue Reporting</title>
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
			<div class="text-2xl font-bold flex items-center">
				<span class="text-3xl mr-3">📢</span>
				<span>CampusCare</span>
			</div>

			<div class="flex space-x-4">
				{#if user}
					<span class="text-white">
						Welcome, {user.user_metadata?.username || user.email?.split('@')[0] || 'User'}!
					</span>
				{:else}
					<a href="/login" class="bg-white text-black border border-black px-5 py-2.5 rounded-lg font-medium">Get Started</a>
				{/if}
			</div>
		</header>

		<!-- Hero Section -->
		<section class="flex flex-col items-center text-center py-20">
			<h1 class="text-4xl md:text-5xl font-bold my-5 max-w-3xl leading-tight">Report and resolve campus issues together</h1>
			<p class="text-xl text-gray-300 mt-3 mb-10 max-w-2xl leading-relaxed">Your platform to voice concerns, upvote pressing problems, and drive change across our campus community.</p>

			<div class="flex flex-col sm:flex-row gap-5 mb-16">
				<a href="/report" class="bg-white text-black border border-black px-6 py-3.5 rounded-lg font-medium text-center">Report an Issue</a>
				<a href="/issues" class="bg-transparent text-white border border-white px-6 py-3.5 rounded-lg font-medium text-center">View All Issues</a>
			</div>
		</section>

		<!-- Recent Issues Section -->
		<h2 class="text-3xl font-semibold text-center my-16">Recently Reported Issues</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
			<!-- Issue Card 1 -->
			<div class="bg-card-bg rounded-2xl p-6 backdrop-blur-md border border-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
				<div class="flex justify-between items-center mb-4">
					<span class="text-sm px-4 py-1 rounded-full bg-[rgba(0,122,255,0.2)] text-primary">Facilities</span>
					<span class="text-sm text-gray-400">2 days ago</span>
				</div>
				<h3 class="text-xl font-semibold mb-3">Broken AC in Library Study Rooms</h3>
				<p class="text-gray-300 mb-5 leading-relaxed">The air conditioning in the west wing study rooms has been broken for a week, making it extremely uncomfortable to study there.</p>
				<div class="flex justify-between items-center">
					<button class="upvote-btn flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full hover:bg-[rgba(0,122,255,0.2)] transition-colors">
						<span>▲</span>
						<span class="upvote-count font-semibold">42</span>
					</button>
					<div class="flex items-center gap-1 text-gray-400">
						<span>💬</span>
						<span>12</span>
					</div>
				</div>
			</div>

			<!-- Issue Card 2 -->
			<div class="bg-card-bg rounded-2xl p-6 backdrop-blur-md border border-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
				<div class="flex justify-between items-center mb-4">
					<span class="text-sm px-4 py-1 rounded-full bg-[rgba(0,122,255,0.2)] text-primary">Safety</span>
					<span class="text-sm text-gray-400">5 days ago</span>
				</div>
				<h3 class="text-xl font-semibold mb-3">Flickering Lights in Parking Garage</h3>
				<p class="text-gray-300 mb-5 leading-relaxed">Lights on level B2 of the north parking garage flicker or don't work, creating dark areas that feel unsafe in the evenings.</p>
				<div class="flex justify-between items-center">
					<button class="upvote-btn flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full hover:bg-[rgba(0,122,255,0.2)] transition-colors">
						<span>▲</span>
						<span class="upvote-count font-semibold">38</span>
					</button>
					<div class="flex items-center gap-1 text-gray-400">
						<span>💬</span>
						<span>8</span>
					</div>
				</div>
			</div>

			<!-- Issue Card 3 -->
			<div class="bg-card-bg rounded-2xl p-6 backdrop-blur-md border border-white/10 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/20">
				<div class="flex justify-between items-center mb-4">
					<span class="text-sm px-4 py-1 rounded-full bg-[rgba(0,122,255,0.2)] text-primary">Academic</span>
					<span class="text-sm text-gray-400">1 week ago</span>
				</div>
				<h3 class="text-xl font-semibold mb-3">Overcrowded Computer Lab</h3>
				<p class="text-gray-300 mb-5 leading-relaxed">The main computer lab is consistently overcrowded during peak hours, with students waiting 30+ minutes for available computers.</p>
				<div class="flex justify-between items-center">
					<button class="upvote-btn flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full hover:bg-[rgba(0,122,255,0.2)] transition-colors">
						<span>▲</span>
						<span class="upvote-count font-semibold">57</span>
					</button>
					<div class="flex items-center gap-1 text-gray-400">
						<span>💬</span>
						<span>15</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<footer class="text-center py-10 border-t border-white/10 mt-10 text-gray-400">
		<div class="container max-w-6xl mx-auto px-5">
			<p>© 2025 CampusCare - Empowering Student Communities</p>
		</div>
	</footer>

    <script>
        // Simple upvote functionality for demo purposes
        document.querySelectorAll('.upvote-btn').forEach(button => {
            button.addEventListener('click', function() {
                const countElement = this.querySelector('.upvote-count');
                let count = parseInt(countElement.textContent);
                if (this.classList.contains('upvoted')) {
                    count--;
                    this.classList.remove('upvoted');
                    this.classList.remove('bg-[rgba(0,122,255,0.3)]');
                    this.classList.add('bg-white/10');
                } else {
                    count++;
                    this.classList.add('upvoted');
                    this.classList.remove('bg-white/10');
                    this.classList.add('bg-[rgba(0,122,255,0.3)]');
                }
                countElement.textContent = count;
            });
        });
    </script>
</div>
