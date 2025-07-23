<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();
	let verificationStatus = $state('verifying');
	let errorMessage = $state('');

	onMount(async () => {
		console.log('Callback page mounted - This should NOT happen if server handler works correctly');
		console.log('Current URL:', window.location.href);
		console.log('URL searchParams:', window.location.search);

		const urlParams = new URLSearchParams(window.location.search);
		const tokenHash = urlParams.get('token_hash');
		const type = urlParams.get('type');
		const next = urlParams.get('next') || '/';

		console.log('Token hash:', tokenHash);
		console.log('Type:', type);
		console.log('Next:', next);

		if (!tokenHash || !type) {
			console.error('Missing token_hash or type in URL');
			verificationStatus = 'error';
			errorMessage = 'Invalid verification link. Missing required parameters.';
			return;
		}

		// Since we're here, the server handler didn't work - let's do client-side verification
		console.log('Server handler failed, attempting client-side verification...');

		try {
			const { supabase } = data;
			console.log('Attempting client-side OTP verification...');

			const { error } = await supabase.auth.verifyOtp({
				type: type as any,
				token_hash: tokenHash
			});

			if (!error) {
				console.log('✅ Client-side verification successful, redirecting...');
				verificationStatus = 'success';
				// Invalidate auth state to ensure immediate update
				await invalidateAll();
				// Redirect to the next page
				goto(next);
			} else {
				console.error('❌ Client-side verification failed:', error);
				verificationStatus = 'error';
				errorMessage = `Verification failed: ${error.message}`;
			}
		} catch (error) {
			console.error('❌ Exception during client-side verification:', error);
			verificationStatus = 'error';
			errorMessage = 'An error occurred during verification.';
		}
	});
</script>

<main class="flex-center">
	{#if verificationStatus === 'verifying'}
		<p>Verifying your login...</p>
		<p style="font-size: 0.8em; color: #666; margin-top: 10px;">
			Please wait while we verify your authentication...
		</p>
	{:else if verificationStatus === 'success'}
		<p>✅ Verification successful! Redirecting...</p>
	{:else if verificationStatus === 'error'}
		<div>
			<p>Verification failed</p>
			<p style="color: red;">{errorMessage}</p>
			<div style="margin-top: 1rem;">
				<a href="/auth" style="color: #007acc;">Try again</a>
			</div>
		</div>
	{/if}
</main>
