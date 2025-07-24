<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { signInWithEmail } from '$lib/auth';
	import { supabase } from '$lib/supabaseClient';
	import type { PageData } from './$types';

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
		try {
			const { data, error } = await supabase.functions.invoke('invest', {
				body: {
					videoUrl: formVideoUrl,
					amount: amount
				}
			});

			if (error) {
				console.error('Error during investment:', error);
				alert('Investment failed. Please try again.');
			} else {
				alert('Investment successful!');
				await invalidateAll();
			}
		} catch (err) {
			console.error('Unexpected error during function call:', err);
			alert('Unexpected error occurred. Check console for details.');
		}

		// Reset form fields
		formVideoUrl = '';
		amount = 1;
	}

	export let data: PageData;
</script>

<main class="flex-center">
	<h1>StonkTok</h1>
	<p>Grow a video</p>

	{#if !data.session}
		<form action="" on:submit|preventDefault={async () => await handleSubmit()}>
			<input type="email" placeholder="Enter your email" required bind:value={email} />
			<button type="submit">Submit</button>
		</form>
	{:else}
		<p>Welcome back, {data.user?.email}!</p>

		<form on:submit|preventDefault={async () => await handleInvest()}>
			<input type="text" placeholder="Enter video URL" required bind:value={formVideoUrl} />
			<input type="number" placeholder="Enter amount" required bind:value={amount} />
			<button type="submit">Invest</button>
		</form>

		<br />

		<button
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
	{/if}
</main>
