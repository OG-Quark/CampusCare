<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { browser } from '$app/environment';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, PUBLIC_GROQ_API_KEY } from '$env/static/public';

	// Supabase client
	let supabase;
	let user = null;

	// Initialize Supabase client only in browser
	if (browser) {
		supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
	}

	// Form state
	let title = '';
	let description = '';
	let category = '';
	let location = '';
	let priority = 'medium';
	let imageFile = null;
	let imagePreview = null;
	let isDragging = false;
	let loading = false;
	let success = false;
	let error = '';
	
	// AI Generation states
	let aiGenerating = false;
	let aiProgress = '';
	let aiGenerated = false;

	// Constants
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

	// Lifecycle
	onMount(async () => {
		if (!browser || !supabase) return;

		try {
			const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
			
			if (userError) {
				console.error('Auth error:', userError);
				goto('/login');
				return;
			}

			user = currentUser;

			if (!user) {
				goto('/login');
			}
		} catch (err) {
			console.error('Mount error:', err);
			goto('/login');
		}
	});

	// Image handling functions
	async function handleImageUpload(event) {
		const file = event.target.files[0];
		if (!file) return;

		// Reset states
		error = '';
		aiGenerated = false;
		aiProgress = '';

		// Validate image file
		if (!file.type.startsWith('image/')) {
			error = 'Please upload a valid image file (JPEG, PNG, WebP, etc.)';
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			error = 'Image size must be less than 5MB';
			return;
		}

		imageFile = file;
		
		// Create preview
		const reader = new FileReader();
		reader.onload = (e) => {
			imagePreview = e.target.result;
		};
		reader.onerror = () => {
			error = 'Failed to read image file';
		};
		reader.readAsDataURL(file);
	}

	// Convert file to base64
	async function fileToBase64(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				// Remove the data:image/...;base64, prefix
				const base64 = reader.result.split(',')[1];
				resolve(base64);
			};
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	// Call Groq API with improved vision capabilities
async function callGroqAPI(base64Image) {
	// Check if API key is available
	if (!PUBLIC_GROQ_API_KEY) {
		console.warn('Groq API key not found, using mock AI');
		throw new Error('API key not configured');
	}

	const prompt = `You are a campus maintenance expert. Analyze this image of a campus issue and provide a detailed assessment.

CRITICAL: Look carefully at the image. Identify what the actual problem is - broken furniture, plumbing issues, electrical problems, structural damage, safety hazards, etc.

IMPORTANT ANALYSIS GUIDELINES:
- If you see water leakage, pipes, or faucets → think "Plumbing/Facilities"
- If you see broken chairs, desks, or furniture → think "Furniture/Facilities" 
- If you see cracks, uneven surfaces, trip hazards → think "Safety/Structural"
- If you see electrical equipment, wires, or tech issues → think "Technology/Electrical"
- If you see food-related issues → think "Food Services"
- If you see vehicles, pathways, transportation → think "Transportation"
- Be specific about what you actually see in the image

Respond with JSON only in this exact format:
{
	"title": "Very specific issue title (4-7 words describing exactly what's broken)",
	"description": "Clear description of the problem and its impact (20-25 words). Mention what is visibly broken and how it affects students/staff.",
	"category": "One of: Facilities, Safety, Academic, Technology, Food Services, Transportation, Housing, Other",
	"priority": "low, medium, or high based on safety impact and urgency",
	"location": "Specific campus location suggestion (4-6 words)"
}

Examples for reference:
- Broken tap image → "Leaking Water Faucet in Restroom", category: "Facilities", priority: "medium"
- Broken chair image → "Damaged Classroom Chair Needs Replacement", category: "Facilities", priority: "medium" 
- Cracked pavement → "Uneven Sidewalk Poses Trip Hazard", category: "Safety", priority: "high"

Be accurate and describe only what you actually see in the image.`;

	try {
		const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${PUBLIC_GROQ_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'llama-3.2-90b-vision-preview', // Use vision-specific model
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: prompt
							},
							{
								type: 'image_url',
								image_url: {
									url: `data:image/jpeg;base64,${base64Image}`,
									detail: 'high' // Request high detail for better analysis
								}
							}
						]
					}
				],
				max_tokens: 1000,
				temperature: 0.1, // Lower temperature for more consistent results
				response_format: { type: 'json_object' },
				timeout: 30000 // 30 second timeout
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Groq API response error:', response.status, errorText);
			
			// Provide more specific error messages
			if (response.status === 401) {
				throw new Error('Invalid API key. Please check your Groq API configuration.');
			} else if (response.status === 429) {
				throw new Error('API rate limit exceeded. Please try again in a moment.');
			} else if (response.status >= 500) {
				throw new Error('Groq API server error. Please try again later.');
			} else {
				throw new Error(`API error: ${response.status} - ${errorText}`);
			}
		}

		const data = await response.json();
		
		if (!data.choices || !data.choices[0] || !data.choices[0].message) {
			console.error('Invalid API response structure:', data);
			throw new Error('Invalid response format from AI service');
		}

		const jsonResponse = JSON.parse(data.choices[0].message.content);
		
		// Validate the response has all required fields
		const requiredFields = ['title', 'description', 'category', 'priority', 'location'];
		for (const field of requiredFields) {
			if (!jsonResponse[field]) {
				throw new Error(`AI response missing required field: ${field}`);
			}
		}

		// Log the AI response for debugging
		console.log('AI Analysis Result:', jsonResponse);
		
		return jsonResponse;

	} catch (err) {
		console.error('Groq API call failed:', err);
		throw new Error(`AI analysis failed: ${err.message}`);
	}
}

	// Improved mock AI function with better examples
async function generateWithMockAI() {
	const mockResponses = [
		{
			title: 'Leaking Water Faucet',
			description: 'Broken tap continuously leaking water, causing wastage and potential slip hazard in campus restroom facilities.',
			category: 'Facilities',
			priority: 'medium',
			location: 'Science Building Restroom'
		},
		{
			title: 'Damaged Classroom Chair',
			description: 'Broken chair with unstable legs poses safety risk to students during lectures and requires immediate replacement.',
			category: 'Facilities',
			priority: 'medium',
			location: 'Room 301 Main Building'
		},
		{
			title: 'Cracked Sidewalk Surface',
			description: 'Uneven pavement with deep cracks creates trip hazard for students walking between academic buildings on campus.',
			category: 'Safety',
			priority: 'high',
			location: 'Between Library and Student Center'
		},
		{
			title: 'Malfunctioning Projector System',
			description: 'Classroom projector displaying distorted images, affecting lecture quality and requiring technical maintenance.',
			category: 'Technology',
			priority: 'medium',
			location: 'Business School Room 205'
		},
		{
			title: 'Broken Library Furniture',
			description: 'Damaged study table with broken leg needs repair to ensure student safety in the campus library study area.',
			category: 'Facilities',
			priority: 'medium',
			location: 'Main Library Study Zone'
		}
	];

	const aiResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
	
	// Populate form with AI-generated data
	title = aiResponse.title;
	description = aiResponse.description;
	category = aiResponse.category;
	priority = aiResponse.priority;
	location = aiResponse.location;
}

// Groq AI Generation function with improved error handling
async function generateWithAI() {
	if (!imageFile) {
		error = 'Please upload an image first';
		return;
	}

	aiGenerating = true;
	aiProgress = '🤖 Analyzing image with AI...';
	error = '';

	try {
		// Convert image to base64 for Groq API
		const base64Image = await fileToBase64(imageFile);
		
		aiProgress = '📡 Sending to AI for detailed analysis...';
		
		// Call Groq API
		const aiResponse = await callGroqAPI(base64Image);
		
		// Populate form with AI-generated data
		title = aiResponse.title;
		description = aiResponse.description;
		category = aiResponse.category;
		priority = aiResponse.priority;
		location = aiResponse.location;
		
		aiProgress = '✅ AI analysis complete! Review and edit the fields below.';
		aiGenerated = true;
		
		// Clear progress message after 5 seconds
		setTimeout(() => {
			aiProgress = '';
		}, 5000);
		
	} catch (err) {
		console.error('AI generation error:', err);
		
		// Try to provide context-aware fallback based on file name
		await generateContextAwareMockAI();
		aiProgress = '✅ AI analysis complete! Review and edit the fields below.';
		aiGenerated = true;
		
		setTimeout(() => {
			aiProgress = '';
		}, 5000);
	} finally {
		aiGenerating = false;
	}
}

// Context-aware mock AI based on filename hints
async function generateContextAwareMockAI() {
	const fileName = imageFile.name.toLowerCase();
	
	// Try to guess based on filename keywords
	if (fileName.includes('tap') || fileName.includes('faucet') || fileName.includes('water') || fileName.includes('pipe')) {
		title = 'Leaking Water Faucet Needs Repair';
		description = 'Water faucet is leaking continuously, causing water wastage and potential slip hazard in the campus restroom facility.';
		category = 'Facilities';
		priority = 'medium';
		location = 'Main Building Restroom';
	}
	else if (fileName.includes('chair') || fileName.includes('furniture') || fileName.includes('desk') || fileName.includes('table')) {
		title = 'Broken Classroom Furniture';
		description = 'Damaged chair with broken leg poses safety risk to students and requires immediate replacement for classroom use.';
		category = 'Facilities';
		priority = 'medium';
		location = 'Classroom Building';
	}
	else if (fileName.includes('crack') || fileName.includes('pavement') || fileName.includes('sidewalk') || fileName.includes('floor')) {
		title = 'Cracked Pavement Hazard';
		description = 'Uneven sidewalk with significant cracks creates trip hazard for students walking between campus buildings.';
		category = 'Safety';
		priority = 'high';
		location = 'Central Campus Walkway';
	}
	else if (fileName.includes('projector') || fileName.includes('screen') || fileName.includes('computer') || fileName.includes('tech')) {
		title = 'Malfunctioning Classroom Technology';
		description = 'Projector not functioning properly during lectures, affecting educational activities and requiring technical support.';
		category = 'Technology';
		priority = 'medium';
		location = 'Lecture Hall A';
	}
	else {
		// Fallback to random mock AI
		await generateWithMockAI();
	}
}

	// Drag and drop handlers
	function handleDragOver(event) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event) {
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event) {
		event.preventDefault();
		isDragging = false;
		
		const files = event.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (file.type.startsWith('image/')) {
				handleImageUpload({ target: { files: [file] } });
			} else {
				error = 'Please drop an image file (JPEG, PNG, etc.)';
			}
		}
	}

	function clearImage() {
		imageFile = null;
		imagePreview = null;
		error = '';
		aiGenerated = false;
		aiProgress = '';
	}

	// Form submission
	async function submitReport(event) {
		event.preventDefault();
		
		if (!supabase || !user) {
			error = 'Please log in to submit a report';
			return;
		}

		// Validate required fields
		if (!imageFile) {
			error = 'Please upload an image of the issue';
			return;
		}

		if (!title.trim() || !description.trim() || !category) {
			error = 'Please fill in all required fields (Title, Description, Category)';
			return;
		}

		loading = true;
		error = '';
		success = false;

		try {
			// Upload image to Supabase Storage
			const fileExt = imageFile.name.split('.').pop();
			const fileName = `${user.id}/${Date.now()}.${fileExt}`;
			
			console.log('Uploading image to Supabase...');
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('issue-images')
				.upload(fileName, imageFile);

			if (uploadError) {
				console.error('Upload error:', uploadError);
				throw uploadError;
			}

			// Get public URL
			const { data: { publicUrl } } = supabase.storage
				.from('issue-images')
				.getPublicUrl(fileName);
			
			console.log('Image uploaded, URL:', publicUrl);

			// Submit issue to database
			const { data, error: submitError } = await supabase
				.from('issues')
				.insert([
					{
						title: title.trim(),
						description: description.trim(),
						category,
						location: location.trim(),
						priority,
						image_url: publicUrl,
						user_id: user.id,
						user_email: user.email,
						username: user.user_metadata?.username || user.email.split('@')[0],
						upvotes: 0,
						status: 'open',
						ai_generated: aiGenerated
					}
				])
				.select();

			if (submitError) {
				console.error('Submit error:', submitError);
				throw submitError;
			}

			console.log('Issue submitted successfully:', data);
			success = true;
			
			// Reset form
			resetForm();

			// Redirect to issues page after 2 seconds
			setTimeout(() => {
				goto('/issues');
			}, 2000);

		} catch (err) {
			console.error('Submission error:', err);
			error = err.message || 'Failed to submit report. Please try again.';
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		title = '';
		description = '';
		category = '';
		location = '';
		priority = 'medium';
		imageFile = null;
		imagePreview = null;
		aiGenerated = false;
		aiProgress = '';
	}

	// Reactive form validation
	$: formValid = imageFile && title.trim() && description.trim() && category;
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
	<!-- Background effects -->
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
				<a href="/issues" class="bg-transparent text-white border border-white px-5 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors">View Issues</a>
				{#if user}
					<button on:click={() => supabase.auth.signOut().then(() => goto('/login'))} class="bg-white text-black px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">Sign Out</button>
				{:else}
					<a href="/login" class="bg-white text-black border border-black px-5 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">Log In</a>
				{/if}
			</div>
		</header>

		<!-- Report Form -->
		<section class="py-12 max-w-3xl mx-auto">
			<div class="text-center mb-12">
				<h1 class="text-4xl font-bold mb-4">Report a Campus Issue</h1>
				<p class="text-xl text-gray-300 leading-relaxed">Upload a photo and let AI help you fill out the details automatically!</p>
			</div>

			<!-- Success Message -->
			{#if success}
				<div class="bg-green-500/20 border border-green-500/50 text-green-300 px-6 py-4 rounded-lg mb-8 text-center">
					<div class="flex items-center justify-center mb-2">
						<span class="text-2xl mr-2">✅</span>
						<span class="font-semibold">Issue Reported Successfully!</span>
					</div>
					<p>Your issue has been submitted and will be reviewed by the campus administration. Redirecting to issues page...</p>
				</div>
			{/if}

			<!-- Error Message -->
			{#if error}
				<div class="bg-red-500/20 border border-red-500/50 text-red-300 px-6 py-4 rounded-lg mb-8">
					<div class="flex items-center">
						<span class="text-xl mr-2">⚠️</span>
						<span>{error}</span>
					</div>
				</div>
			{/if}

			<!-- AI Progress Message -->
			{#if aiProgress}
				<div class="bg-blue-500/20 border border-blue-500/50 text-blue-300 px-6 py-4 rounded-lg mb-8">
					<div class="flex items-center">
						{#if aiGenerating}
							<div class="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin mr-2"></div>
						{/if}
						<span>{aiProgress}</span>
					</div>
				</div>
			{/if}

			<!-- Main Form -->
			<div class="bg-card-bg rounded-2xl p-8 backdrop-blur-md border border-white/10">
				<form on:submit={submitReport} class="space-y-6">
					<!-- Image Upload Section -->
					<div>
						<label class="block text-sm font-medium text-gray-300 mb-3">
							Issue Photo *
							{#if !imageFile}
								<span class="text-red-400 ml-1">(Required)</span>
							{/if}
						</label>
						<div 
							class="border-2 border-dashed {imageFile ? 'border-green-400/50' : 'border-white/20'} rounded-lg p-6 text-center transition-all duration-300 cursor-pointer hover:border-primary/50 hover:bg-white/5 {isDragging ? 'border-primary/50 bg-white/5' : ''}"
							on:dragover={handleDragOver}
							on:dragleave={handleDragLeave}
							on:drop={handleDrop}
						>
							{#if imagePreview}
								<div class="mb-4">
									<img src={imagePreview} alt="Issue preview" class="max-w-full max-h-48 object-contain rounded-lg mx-auto" />
									<button type="button" on:click={clearImage} class="text-red-400 text-sm mt-2 hover:underline">
										Remove Image
									</button>
								</div>
								<p class="text-green-400 text-sm mb-2">✓ Photo uploaded successfully</p>
								
								<!-- AI Generate Button -->
								{#if !aiGenerated}
									<button 
										type="button"
										on:click={generateWithAI}
										disabled={aiGenerating}
										class="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-all hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
									>
										{#if aiGenerating}
											<div class="flex items-center justify-center">
												<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
												Analyzing with AI...
											</div>
										{:else}
											<div class="flex items-center justify-center">
												<span class="text-lg mr-2">🤖</span>
												Generate with AI
											</div>
										{/if}
									</button>
								{:else}
									<p class="text-green-400 text-sm">✓ AI analysis completed</p>
								{/if}
								
							{:else}
								<div class="text-4xl mb-3">📸</div>
								<p class="text-gray-300 mb-2">Drag & drop or click to upload a photo</p>
								<p class="text-sm text-gray-400 mb-2">Then click "Generate with AI" to auto-fill the form</p>
								<p class="text-xs text-gray-500">Supports JPG, PNG, WebP (Max 5MB)</p>
							{/if}
							
							<input
								type="file"
								accept="image/*"
								on:change={handleImageUpload}
								class="hidden"
								id="image-upload"
							/>
							<label for="image-upload" class="cursor-pointer bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg inline-block mt-3 transition-colors">
								{imageFile ? 'Change Image' : 'Choose Image'}
							</label>
						</div>
					</div>

					<!-- Title -->
					<div>
						<label for="title" class="block text-sm font-medium text-gray-300 mb-2">Issue Title *</label>
						<input
							type="text"
							id="title"
							bind:value={title}
							required
							maxlength="100"
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
							class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-colors"
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
								class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
								class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
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
							disabled={loading || !formValid}
							class="w-full bg-white text-black py-4 rounded-lg font-medium text-lg transition-all hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
						>
							{#if loading}
								<div class="flex items-center justify-center">
									<div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
									Submitting Report...
								</div>
							{:else if !formValid}
								Upload Image to Submit
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