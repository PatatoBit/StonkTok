<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { signInWithEmail } from '$lib/auth';
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

	export let data: PageData;
</script>

<main class="flex-center">
	<h1>StonkTok</h1>
	<p>Grow a video</p>

	{#if !data.session}
		<form action="" on:submit|preventDefault={handleSubmit}>
			<input type="email" placeholder="Enter your email" required bind:value={email} />
			<button type="submit">Submit</button>
		</form>
	{:else}
		<p>Welcome back, {data.user?.email}!</p>
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
