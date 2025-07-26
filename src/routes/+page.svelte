<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { signInWithEmail } from '$lib/auth';
	import type { PageData } from './$types';
	export let data: PageData;

	let email: string = '';

	async function handleSubmit() {
		try {
			await signInWithEmail(email);
			alert('Check your email for the sign-in link!');
		} catch (error) {
			console.error('Error signing in:', error);
			alert('Failed to sign in. Please try again.');
		}
	}

	let formVideoUrl: string = 'https://www.tiktok.com/@marrizzlleee/video/7512370847206739246';
	let amount: number = 1;

	async function handleInvest() {
		console.log('Investing with video URL:', formVideoUrl, 'and amount:', amount);

		try {
			const { data: res, error } = await data.supabase.functions.invoke('invest', {
				body: {
					videoUrl: formVideoUrl,
					amount: amount
				}
			});

			console.log('Function response:', res);

			if (error) {
				console.error('Error during investment:', error);
				alert('Investment failed. Please try again.');
			} else {
				alert('Investment successful!');

				// Reset form fields
				formVideoUrl = '';
				amount = 1;
				await invalidateAll();
			}
		} catch (err) {
			console.error('Unexpected error during function call:', err);
			alert('Unexpected error occurred. Check console for details.');
		}
	}
</script>

<main class="flex-center">
	<div class="header-section">
		<h1>StonkTok</h1>
		<p class="subtitle">Grow a video</p>
	</div>

	{#if !data.session}
		<div class="auth-section">
			<form class="auth-form" on:submit|preventDefault={async () => await handleSubmit()}>
				<input
					type="email"
					placeholder="Enter your email"
					required
					bind:value={email}
					class="form-input"
				/>
				<button type="submit" class="btn btn-primary">Submit</button>
			</form>
		</div>
	{:else}
		<div class="user-section">
			<p class="welcome-text">Welcome back, {data.user?.email}!</p>
		</div>

		<div class="invest-section">
			<form class="invest-form" on:submit|preventDefault={async () => await handleInvest()}>
				<input
					type="text"
					placeholder="Enter video URL"
					required
					bind:value={formVideoUrl}
					class="form-input"
				/>
				<input
					type="number"
					placeholder="Enter amount"
					required
					bind:value={amount}
					class="form-input"
				/>
				<button type="submit" class="btn btn-primary">Invest</button>
			</form>
		</div>

		<div class="logout-section">
			<button
				class="btn btn-secondary"
				on:click={async () => {
					try {
						const { error } = await data.supabase.auth.signOut();
						if (error) {
							console.error('Error signing out:', error);
						} else {
							// Force invalidation of auth state immediately
							await invalidateAll();
						}
					} catch (error) {
						console.error('Unexpected error during sign out:', error);
					}
				}}>Sign out</button
			>
		</div>
	{/if}
</main>
