<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let errorMessage = $state('Authentication failed');

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const error = urlParams.get('error');
		const errorDescription = urlParams.get('error_description');

		if (error) {
			errorMessage = errorDescription || error;
		}

		console.log('Auth error page loaded');
		console.log('Error:', error);
		console.log('Error description:', errorDescription);
	});
</script>

<main class="flex-center">
	<div class="error-container">
		<h1>Authentication Error</h1>
		<p>{errorMessage}</p>
		<div class="actions">
			<a href="/auth" class="button">Try Again</a>
			<a href="/" class="button secondary">Go Home</a>
		</div>
	</div>
</main>

<style>
	.error-container {
		text-align: center;
		max-width: 400px;
		padding: 2rem;
	}

	.actions {
		margin-top: 2rem;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.button {
		padding: 0.5rem 1rem;
		text-decoration: none;
		border-radius: 4px;
		background: #007acc;
		color: white;
		border: none;
		cursor: pointer;
	}

	.button.secondary {
		background: #666;
	}

	.button:hover {
		opacity: 0.9;
	}
</style>
